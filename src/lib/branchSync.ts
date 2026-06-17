import { prisma } from './prisma';
import { getBranchId, getDeploymentRole } from './branchContext';

/**
 * Capture a local change in the SyncOutbox.
 * Wrap in try/catch to never block the main request.
 */
export async function captureChange(params: {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
}) {
  if (getDeploymentRole() !== 'branch') {
    return; // HQ doesn't have an outbox
  }
  try {
    if (!prisma.syncOutbox) {
      // Partially mocked in some unit tests, skip gracefully
      return;
    }
    // Avoid double logging or undefined payloads
    await prisma.syncOutbox.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        payload: params.payload || {},
        processed: false,
      },
    });
  } catch (error) {
    console.error(`[captureChange] Failed to write to outbox for ${params.entityType}/${params.entityId}:`, error);
  }
}

/**
 * Local Config Directives processor.
 * Upserts settings tables on branch deployments.
 */
export async function applyDirectivesLocally(directives: any[]) {
  for (const dir of directives) {
    const { directiveType, payload } = dir;
    try {
      if (directiveType === 'sla_tiers') {
        await prisma.sLAConfig.upsert({
          where: { id: 'sla-config' },
          create: { id: 'sla-config', tiers: payload.tiers },
          update: { tiers: payload.tiers }
        });
      } else if (directiveType === 'warranty_config') {
        await prisma.warrantyConfig.upsert({
          where: { id: 'warranty-config' },
          create: { id: 'warranty-config', entries: payload.entries },
          update: { entries: payload.entries }
        });
      } else if (directiveType === 'business_settings') {
        await prisma.businessSettings.upsert({
          where: { id: 'business-settings' },
          create: {
            id: 'business-settings',
            shopName: payload.shopName || 'FixHub',
            tagline: payload.tagline || '',
            address: payload.address || '',
            phone: payload.phone || '',
            email: payload.email || '',
            gstin: payload.gstin || '',
            taxRate: typeof payload.taxRate === 'number' ? payload.taxRate : 18,
            taxLabel: payload.taxLabel || 'GST'
          },
          update: {
            shopName: payload.shopName,
            tagline: payload.tagline,
            address: payload.address,
            phone: payload.phone,
            email: payload.email,
            gstin: payload.gstin,
            taxRate: payload.taxRate,
            taxLabel: payload.taxLabel
          }
        });
      }
    } catch (error) {
      console.error(`[applyDirectivesLocally] Failed to apply directive:`, error);
    }
  }
}

/**
 * Push outstanding outbox entries to HQ and pull latest config directives.
 */
export async function pushOutbox() {
  if (getDeploymentRole() !== 'branch') return;

  const hqBaseUrl = process.env.HQ_BASE_URL;
  const apiKey = process.env.BRANCH_API_KEY;
  const branchId = getBranchId();

  if (!hqBaseUrl || !apiKey) {
    console.warn('[pushOutbox] HQ_BASE_URL or BRANCH_API_KEY is not set. Sync skipped.');
    return;
  }

  try {
    // 1. Alert check: warning if oldest pending is > 1 hour
    const oldestPending = await prisma.syncOutbox.findFirst({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestPending) {
      const pendingAgeMs = Date.now() - new Date(oldestPending.createdAt).getTime();
      if (pendingAgeMs > 60 * 60 * 1000) {
        console.warn(`[pushOutbox ALERT] Sync has been failing! Oldest pending record is ${Math.round(pendingAgeMs / 3600000)} hours old.`);
      }
    }

    // 2. Fetch pending changes
    const pendingChanges = await prisma.syncOutbox.findMany({
      where: { processed: false },
      orderBy: { seq: 'asc' },
      take: 50,
    });

    // 3. Get last processed config directive sequence
    const syncState = await prisma.configSyncState.findUnique({
      where: { id: 'config-sync-state' },
    });
    const lastConfigSeq = syncState ? String(syncState.lastSeq) : '0';

    // 4. Exchange payload structure (serialize seq for JSON compatibility)
    const payload = {
      branchId,
      apiKey,
      changes: pendingChanges.map((c: any) => ({
        id: c.id,
        entityType: c.entityType,
        entityId: c.entityId,
        action: c.action,
        payload: c.payload,
        seq: String(c.seq),
        createdAt: c.createdAt,
      })),
      lastConfigSeq,
    };

    const res = await fetch(`${hqBaseUrl}/api/sync/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HQ returned status ${res.status}`);
    }

    const result = await res.json();

    if (result.success) {
      // 5. Mark local changes as processed
      if (pendingChanges.length > 0) {
        const ids = pendingChanges.map((c: any) => c.id);
        await prisma.syncOutbox.updateMany({
          where: { id: { in: ids } },
          data: { processed: true },
        });
      }

      // 6. Apply directives locally
      if (result.directives && result.directives.length > 0) {
        await applyDirectivesLocally(result.directives);

        // Find max seq received and save
        const maxSeq = result.directives.reduce((acc: bigint, d: any) => {
          const s = BigInt(d.seq);
          return s > acc ? s : acc;
        }, BigInt(lastConfigSeq));

        await prisma.configSyncState.upsert({
          where: { id: 'config-sync-state' },
          create: { id: 'config-sync-state', lastSeq: maxSeq },
          update: { lastSeq: maxSeq },
        });
      }
    } else {
      console.error('[pushOutbox] HQ rejected payload:', result.error);
    }
  } catch (error) {
    console.error('[pushOutbox] Sync exchange failed:', error);
  }
}

let syncTimer: NodeJS.Timeout | null = null;

/**
 * Start the polling push timer (runs every 30 seconds).
 */
export function startBranchSyncTimer() {
  if (getDeploymentRole() !== 'branch') return;
  if (syncTimer) return;

  console.log('[branchSync] Starting branch outbox push loop...');
  syncTimer = setInterval(() => {
    pushOutbox().catch((err) => console.error('[pushOutbox loop error]', err));
  }, 30000);

  // Run immediately on boot
  pushOutbox().catch((err) => console.error('[pushOutbox boot error]', err));
}
