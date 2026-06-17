import { prisma } from './prisma';

/**
 * Maps capitalize/camelCase model names to lowercase/camelCase properties on the prisma client.
 */
function getModelKey(entityType: string): string {
  const mapping: Record<string, string> = {
    User: 'user',
    Customer: 'customer',
    Device: 'device',
    Job: 'job',
    JobActivity: 'jobActivity',
    JobPhoto: 'jobPhoto',
    PartRequest: 'partRequest',
    Payment: 'payment',
    InventoryItem: 'inventoryItem',
    Notification: 'notification',
    Sale: 'sale',
    SaleItem: 'saleItem',
    Supplier: 'supplier',
    Expense: 'expense',
    Purchase: 'purchase',
    PurchaseItem: 'purchaseItem',
    TallyQueueItem: 'tallyQueueItem',
  };
  return mapping[entityType] || entityType.toLowerCase();
}

/**
 * Processes incoming branch outbox changes at HQ.
 * Implements LWW (Last-Write-Wins) and Idempotency tracking.
 */
export async function processBranchSyncPayload(
  branchId: string,
  changes: any[],
  lastConfigSeqStr: string
): Promise<{ success: boolean; error?: string; directives?: any[] }> {
  try {
    // 1. Authenticate ledger tracking
    let ledger = await prisma.syncOutboxLedger.findUnique({
      where: { branchId },
    });

    if (!ledger) {
      ledger = await prisma.syncOutboxLedger.create({
        data: {
          branchId,
          lastSeq: 0n,
        },
      });
    }

    const currentLastSeq = ledger.lastSeq;
    let maxProcessedSeq = currentLastSeq;

    // 2. Sort changes by sequence number
    const sortedChanges = [...changes].sort((a, b) => {
      const aSeq = BigInt(a.seq);
      const bSeq = BigInt(b.seq);
      return aSeq < bSeq ? -1 : aSeq > bSeq ? 1 : 0;
    });

    // 3. Process each change sequentially
    for (const change of sortedChanges) {
      const changeSeq = BigInt(change.seq);

      // Idempotency: Skip if already processed
      if (changeSeq <= currentLastSeq) {
        continue;
      }

      const modelKey = getModelKey(change.entityType);
      const model = (prisma as any)[modelKey];

      if (!model) {
        console.warn(`[hqSyncEngine] Unknown entityType: ${change.entityType}`);
        continue;
      }

      const { id, ...data } = change.payload;
      const entityId = change.entityId;

      // Stamp with branch ID to enforce isolation at HQ
      const dataWithBranch = {
        ...data,
        branchId,
      };

      if (change.action === 'create') {
        const existing = await model.findUnique({
          where: { id: entityId },
        });

        if (!existing) {
          await model.create({
            data: {
              id: entityId,
              ...dataWithBranch,
            },
          });
        }
      } else if (change.action === 'update') {
        const existing = await model.findUnique({
          where: { id: entityId },
        });

        if (existing) {
          const newUpdatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
          const oldUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt) : new Date(0);

          // LWW check
          if (newUpdatedAt.getTime() >= oldUpdatedAt.getTime()) {
            await model.update({
              where: { id: entityId },
              data: dataWithBranch,
            });
          }
        } else {
          // If update arrives for non-existent row, fallback to create
          await model.create({
            data: {
              id: entityId,
              ...dataWithBranch,
            },
          });
        }
      } else if (change.action === 'delete') {
        // Soft delete or hard delete based on preference. Let's do deleteMany to be safe
        await model.deleteMany({
          where: { id: entityId },
        });
      }

      if (changeSeq > maxProcessedSeq) {
        maxProcessedSeq = changeSeq;
      }
    }

    // Update the ledger with the highest processed seq
    if (maxProcessedSeq > currentLastSeq) {
      await prisma.syncOutboxLedger.update({
        where: { branchId },
        data: { lastSeq: maxProcessedSeq },
      });
    }

    // 4. Update branch status check in HQ
    await prisma.branch.update({
      where: { id: branchId },
      data: { lastSeen: new Date() },
    }).catch(() => {});

    // 5. Gather Config Directives to send back
    const lastConfigSeq = BigInt(lastConfigSeqStr);
    const directives = await prisma.configDirective.findMany({
      where: {
        seq: { gt: lastConfigSeq },
      },
      orderBy: { seq: 'asc' },
    });

    // Serialize sequences for JSON compatibility
    const serializedDirectives = directives.map((d: any) => ({
      id: d.id,
      directiveType: d.directiveType,
      payload: d.payload,
      seq: String(d.seq),
      createdAt: d.createdAt,
    }));

    return {
      success: true,
      directives: serializedDirectives,
    };
  } catch (error: any) {
    console.error('[hqSyncEngine] Error processing branch sync:', error);
    return {
      success: false,
      error: error.message || 'Unknown server error',
    };
  }
}

/**
 * Broadcasts a configuration change from HQ to all branches.
 */
export async function createDirective(directiveType: string, payload: any) {
  try {
    await prisma.configDirective.create({
      data: {
        directiveType,
        payload,
      },
    });
    console.log(`[hqSyncEngine] Created config directive: ${directiveType}`);
  } catch (error) {
    console.error(`[hqSyncEngine] Failed to create config directive:`, error);
  }
}
