import { prisma } from './prisma';
import { getTallySettings, testTallyConnection } from './tally';
import { broadcastTallyEvent } from './tallyEvents';

export interface AddQueueItemArgs {
  entityType: string;
  entityId: string;
  actionType: string;
  priority?: number;
  metadata?: any;
}

// Global flag to prevent concurrent queue execution
const globalForTallyQueue = globalThis as unknown as {
  tallyQueueRunning?: boolean;
  tallyQueueStarted?: boolean;
};

export async function addToTallyQueue({
  entityType,
  entityId,
  actionType,
  priority = 0,
  metadata = null,
}: AddQueueItemArgs) {
  if (!prisma.tallyQueueItem) {
    console.warn('[addToTallyQueue] prisma.tallyQueueItem is not defined. Skipping queue insertion.');
    return null;
  }
  // Check if item already exists with pending/processing/completed status to prevent duplicate queue entries
  const existing = await prisma.tallyQueueItem.findFirst({
    where: {
      entityType,
      entityId,
      actionType,
      status: { in: ['pending', 'processing', 'completed', 'retrying'] },
    },
  });

  if (existing) {
    if (existing.status === 'completed') {
      return existing; // already done
    }
    // Update metadata/priority if it is still pending
    if (existing.status === 'pending') {
      return prisma.tallyQueueItem.update({
        where: { id: existing.id },
        data: { priority, metadata: metadata ? (metadata as any) : undefined },
      });
    }
    return existing;
  }

  const item = await prisma.tallyQueueItem.create({
    data: {
      entityType,
      entityId,
      actionType,
      priority,
      status: 'pending',
      metadata: metadata ? (metadata as any) : undefined,
    },
  });

  // Broadcast event
  broadcastTallyEvent('queue_updated', { itemId: item.id, status: 'pending', actionType });

  // Process queue asynchronously
  processTallyQueue().catch((err) => {
    console.error('[Tally Queue] Error running processor:', err);
  });

  return item;
}

export async function processTallyQueue() {
  if (!prisma.tallyQueueItem) {
    return;
  }
  if (globalForTallyQueue.tallyQueueRunning) {
    return;
  }

  globalForTallyQueue.tallyQueueRunning = true;

  try {
    const settings = await getTallySettings();
    if (!settings.enabled) {
      return;
    }

    // Ping Tally first to check connection (if not mockMode)
    let isTallyOnline = true;
    if (process.env.TALLY_MOCK !== 'true' && !settings.mockMode) {
      const conn = await testTallyConnection(settings);
      isTallyOnline = conn.success;
      if (!isTallyOnline) {
        // Broadcast offline status
        broadcastTallyEvent('connection_status', { success: false, message: 'Tally ERP is offline.' });
        // Set setting status
        await prisma.tallySyncSetting.update({
          where: { id: 'tally-sync-settings' },
          data: { syncStatus: 'offline' },
        });
      } else {
        // Broadcast online status
        broadcastTallyEvent('connection_status', { success: true, message: 'Tally ERP is online.' });
        await prisma.tallySyncSetting.update({
          where: { id: 'tally-sync-settings' },
          data: { syncStatus: 'ready' },
        });
      }
    }

    const now = new Date();
    // Fetch pending and retrying items whose nextRetryAt <= now
    const queueItems = await prisma.tallyQueueItem.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (queueItems.length === 0) {
      return;
    }

    for (const item of queueItems) {
      // If offline, we pause processing and mark remaining items with nextRetryAt
      if (!isTallyOnline && process.env.TALLY_MOCK !== 'true' && !settings.mockMode) {
        const nextRetryMinutes = Math.pow(2, item.retryCount);
        await prisma.tallyQueueItem.update({
          where: { id: item.id },
          data: {
            status: 'retrying',
            errorMessage: 'Tally ERP server is offline.',
            nextRetryAt: new Date(Date.now() + nextRetryMinutes * 60000),
          },
        });
        broadcastTallyEvent('queue_updated', { itemId: item.id, status: 'retrying', error: 'Tally offline' });
        continue;
      }

      // Mark as processing
      await prisma.tallyQueueItem.update({
        where: { id: item.id },
        data: { status: 'processing' },
      });
      broadcastTallyEvent('queue_updated', { itemId: item.id, status: 'processing' });

      try {
        const pushResult = await executeTallyPush(item, settings);
        
        if (pushResult.success) {
          await prisma.tallyQueueItem.update({
            where: { id: item.id },
            data: {
              status: 'completed',
              xmlPayload: pushResult.xml,
              tallyResponse: pushResult.response || 'SUCCESS',
              retryCount: 0,
              nextRetryAt: null,
              errorMessage: null,
            },
          });
          broadcastTallyEvent('queue_updated', { itemId: item.id, status: 'completed' });
          broadcastTallyEvent('notification', {
            type: 'success',
            title: 'Sync Succeeded',
            message: `Successfully synced ${item.entityType} (${item.actionType}) to Tally.`,
          });
        } else {
          // Failure handling with backoff
          const nextRetryMinutes = Math.pow(2, item.retryCount);
          const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60000);
          const isDLQ = item.retryCount + 1 >= item.maxRetries;
          const newStatus = isDLQ ? 'failed' : 'retrying';

          await prisma.tallyQueueItem.update({
            where: { id: item.id },
            data: {
              status: newStatus,
              retryCount: item.retryCount + 1,
              errorMessage: pushResult.message,
              xmlPayload: pushResult.xml,
              tallyResponse: pushResult.response,
              nextRetryAt: isDLQ ? null : nextRetryAt,
            },
          });

          broadcastTallyEvent('queue_updated', { itemId: item.id, status: newStatus, error: pushResult.message });
          broadcastTallyEvent('notification', {
            type: isDLQ ? 'error' : 'warning',
            title: isDLQ ? 'Sync Failed (DLQ)' : 'Sync Retrying',
            message: `Sync failed for ${item.entityType}: ${pushResult.message}`,
          });
        }
      } catch (err) {
        // Exception during execution
        const nextRetryMinutes = Math.pow(2, item.retryCount);
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60000);
        const isDLQ = item.retryCount + 1 >= item.maxRetries;
        const newStatus = isDLQ ? 'failed' : 'retrying';
        const errMsg = err instanceof Error ? err.message : String(err);

        await prisma.tallyQueueItem.update({
          where: { id: item.id },
          data: {
            status: newStatus,
            retryCount: item.retryCount + 1,
            errorMessage: errMsg,
            nextRetryAt: isDLQ ? null : nextRetryAt,
          },
        });

        broadcastTallyEvent('queue_updated', { itemId: item.id, status: newStatus, error: errMsg });
      }
    }

    // Refresh stats at the end of queue processing
    broadcastTallyEvent('stats_updated', {});
  } finally {
    globalForTallyQueue.tallyQueueRunning = false;
  }
}

// Map queue items to their respective push functions
async function executeTallyPush(item: any, settings: any) {
  const actor = { id: 'system', name: 'Background Queue Engine', role: 'admin' };
  
  // Custom XML builder logic based on type
  let xml = '';
  let pushFunc: () => Promise<{ success: boolean; message: string; response: string | null }> = async () => ({
    success: false,
    message: `Unsupported action type: ${item.actionType}`,
    response: null,
  });

  // import tally push helpers dynamically
  const tallyHelpers = await import('./tally');

  switch (item.entityType) {
    case 'customer':
      if (item.actionType === 'sync_ledger') {
        const customer = await prisma.customer.findUnique({ where: { id: item.entityId } });
        if (!customer) throw new Error('Customer not found');
        xml = tallyHelpers.buildCustomerLedgerXml(customer.name, customer.gstin || undefined);
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, item.id);
      }
      break;
    case 'supplier':
      if (item.actionType === 'sync_ledger') {
        const supplier = await prisma.supplier.findUnique({ where: { id: item.entityId } });
        if (!supplier) throw new Error('Supplier not found');
        xml = tallyHelpers.buildSupplierLedgerXml(supplier.name, supplier.gstin || undefined);
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, item.id);
      }
      break;
    case 'inventory':
      if (item.actionType === 'sync_stock') {
        const inv = await prisma.inventoryItem.findUnique({ where: { id: item.entityId } });
        if (!inv) throw new Error('Inventory item not found');
        xml = tallyHelpers.buildStockItemXml(inv.name, inv.quantity, inv.unitPrice);
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, item.id);
      }
      break;
    case 'job':
      if (item.actionType === 'sync_invoice') {
        const doc = await tallyHelpers.generateJobInvoiceDocument(item.entityId);
        xml = doc.xmlPayload || '';
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
    case 'sale':
      if (item.actionType === 'sync_invoice') {
        const doc = await tallyHelpers.generateSaleInvoiceDocument(item.entityId);
        xml = doc.xmlPayload || '';
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
    case 'payment':
      if (item.actionType === 'sync_receipt') {
        const doc = await tallyHelpers.generatePaymentReceiptDocument(item.entityId);
        xml = doc.xmlPayload || '';
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
    case 'expense':
      if (item.actionType === 'sync_expense') {
        const expense = await prisma.expense.findUnique({ where: { id: item.entityId } });
        if (!expense) throw new Error('Expense not found');
        xml = tallyHelpers.buildExpenseVoucherXml(expense);
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, item.id);
      }
      break;
    case 'purchase':
      if (item.actionType === 'sync_purchase') {
        const doc = await tallyHelpers.generatePurchaseDocument(item.entityId);
        xml = doc.xmlPayload || '';
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
    case 'warranty_claim':
      if (item.actionType === 'sync_warranty') {
        const doc = await tallyHelpers.generateWarrantyClaimDocument(item.entityId);
        xml = doc.xmlPayload || '';
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
    case 'ocr_document':
      if (item.actionType === 'sync_ocr') {
        const doc = await prisma.tallyDocument.findUnique({ where: { id: item.entityId } });
        if (!doc) throw new Error('OCR Document not found');
        xml = doc.xmlPayload || tallyHelpers.buildVoucherXml(tallyHelpers.getExtractedData(doc), doc.voucherType as any, doc.id);
        pushFunc = () => tallyHelpers.pushToTally(xml, settings, actor, doc.id);
      }
      break;
  }

  const res = await pushFunc();
  return {
    success: res.success,
    message: res.message,
    response: res.response,
    xml,
  };
}

// Start recurring Tally queue processor in the background
if (!globalForTallyQueue.tallyQueueStarted) {
  globalForTallyQueue.tallyQueueStarted = true;
  setInterval(() => {
    processTallyQueue().catch((err) => {
      console.error('Error in background Tally queue process:', err);
    });
  }, 30000);
}
