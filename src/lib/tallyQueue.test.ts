import { describe, expect, it, vi, beforeEach } from 'vitest';
import { addToTallyQueue, processTallyQueue } from './tallyQueue';
import { prisma } from './prisma';
import { broadcastTallyEvent } from './tallyEvents';
import * as tallyHelpers from './tally';

// Mock prisma client
vi.mock('./prisma', () => ({
  prisma: {
    tallyQueueItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    tallySyncSetting: {
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
    },
    expense: {
      findUnique: vi.fn(),
    },
    tallyDocument: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock event broadcasting
vi.mock('./tallyEvents', () => ({
  broadcastTallyEvent: vi.fn(),
}));

// Mock tally helper functions
vi.mock('./tally', () => ({
  getTallySettings: vi.fn().mockResolvedValue({ enabled: false, mockMode: true }),
  testTallyConnection: vi.fn(),
  pushToTally: vi.fn(),
  buildCustomerLedgerXml: vi.fn().mockReturnValue('<CUSTOMER_XML/>'),
  buildSupplierLedgerXml: vi.fn().mockReturnValue('<SUPPLIER_XML/>'),
  buildStockItemXml: vi.fn().mockReturnValue('<STOCK_XML/>'),
  generateJobInvoiceDocument: vi.fn(),
  generateSaleInvoiceDocument: vi.fn(),
  generatePaymentReceiptDocument: vi.fn(),
  buildExpenseVoucherXml: vi.fn().mockReturnValue('<EXPENSE_XML/>'),
  generatePurchaseDocument: vi.fn(),
  generateWarrantyClaimDocument: vi.fn(),
  getExtractedData: vi.fn(),
  buildVoucherXml: vi.fn().mockReturnValue('<VOUCHER_XML/>'),
}));

describe('Tally Background Queue Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToTallyQueue', () => {
    it('should create a new queue item when no active queue item exists', async () => {
      vi.mocked(prisma.tallyQueueItem.findFirst).mockResolvedValue(null);
      
      const mockCreatedItem = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'pending',
        priority: 0,
        createdAt: new Date(),
      };
      vi.mocked(prisma.tallyQueueItem.create).mockResolvedValue(mockCreatedItem as any);

      const res = await addToTallyQueue({
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
      });

      expect(prisma.tallyQueueItem.findFirst).toHaveBeenCalledWith({
        where: {
          entityType: 'customer',
          entityId: 'cust-1',
          actionType: 'sync_ledger',
          status: { in: ['pending', 'processing', 'completed', 'retrying'] },
        },
      });
      expect(prisma.tallyQueueItem.create).toHaveBeenCalled();
      expect(broadcastTallyEvent).toHaveBeenCalledWith('queue_updated', {
        itemId: 'item-123',
        status: 'pending',
        actionType: 'sync_ledger',
      });
      expect(res).toEqual(mockCreatedItem);
    });

    it('should return existing completed queue item without creating a duplicate', async () => {
      const mockExisting = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'completed',
      };
      vi.mocked(prisma.tallyQueueItem.findFirst).mockResolvedValue(mockExisting as any);

      const res = await addToTallyQueue({
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
      });

      expect(prisma.tallyQueueItem.create).not.toHaveBeenCalled();
      expect(res).toEqual(mockExisting);
    });

    it('should update metadata/priority of an existing pending queue item', async () => {
      const mockExisting = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'pending',
      };
      vi.mocked(prisma.tallyQueueItem.findFirst).mockResolvedValue(mockExisting as any);
      vi.mocked(prisma.tallyQueueItem.update).mockResolvedValue({ ...mockExisting, priority: 1 } as any);

      await addToTallyQueue({
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        priority: 1,
      });

      expect(prisma.tallyQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { priority: 1, metadata: undefined },
      });
      expect(prisma.tallyQueueItem.create).not.toHaveBeenCalled();
    });
  });

  describe('processTallyQueue', () => {
    it('should not process when Tally sync is disabled', async () => {
      vi.mocked(tallyHelpers.getTallySettings).mockResolvedValue({ enabled: false } as any);

      await processTallyQueue();

      expect(prisma.tallyQueueItem.findMany).not.toHaveBeenCalled();
    });

    it('should mark items as completed on successful Tally push', async () => {
      vi.mocked(tallyHelpers.getTallySettings).mockResolvedValue({ enabled: true, mockMode: true } as any);
      
      const mockQueueItem = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'pending',
        retryCount: 0,
        maxRetries: 5,
      };
      
      vi.mocked(prisma.tallyQueueItem.findMany).mockResolvedValue([mockQueueItem] as any);
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'cust-1', name: 'John Doe', gstin: '29ABC' } as any);
      vi.mocked(tallyHelpers.pushToTally).mockResolvedValue({ success: true, message: 'OK', response: '<RESPONSE/>' });

      await processTallyQueue();

      // Check transition to processing
      expect(prisma.tallyQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { status: 'processing' },
      });

      // Check transition to completed
      expect(prisma.tallyQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          status: 'completed',
          xmlPayload: '<CUSTOMER_XML/>',
          tallyResponse: '<RESPONSE/>',
          retryCount: 0,
          nextRetryAt: null,
          errorMessage: null,
        },
      });

      expect(broadcastTallyEvent).toHaveBeenCalledWith('queue_updated', { itemId: 'item-123', status: 'completed' });
    });

    it('should handle offline states and schedule retry with backoff', async () => {
      vi.mocked(tallyHelpers.getTallySettings).mockResolvedValue({ enabled: true, mockMode: false } as any);
      vi.mocked(tallyHelpers.testTallyConnection).mockResolvedValue({ success: false, message: 'Offline' });

      const mockQueueItem = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'pending',
        retryCount: 1,
        maxRetries: 5,
      };
      
      vi.mocked(prisma.tallyQueueItem.findMany).mockResolvedValue([mockQueueItem] as any);

      await processTallyQueue();

      // Should mark setting as offline
      expect(prisma.tallySyncSetting.update).toHaveBeenCalledWith({
        where: { id: 'tally-sync-settings' },
        data: { syncStatus: 'offline' },
      });

      // Should schedule backoff (2^1 = 2 minutes)
      expect(prisma.tallyQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          status: 'retrying',
          errorMessage: 'Tally ERP server is offline.',
          nextRetryAt: expect.any(Date),
        },
      });
    });

    it('should transition queue item to failed (DLQ) if maxRetries is reached', async () => {
      vi.mocked(tallyHelpers.getTallySettings).mockResolvedValue({ enabled: true, mockMode: true } as any);
      
      const mockQueueItem = {
        id: 'item-123',
        entityType: 'customer',
        entityId: 'cust-1',
        actionType: 'sync_ledger',
        status: 'pending',
        retryCount: 4, // 5th attempt (4 retryCount + 1 = 5 maxRetries)
        maxRetries: 5,
      };

      vi.mocked(prisma.tallyQueueItem.findMany).mockResolvedValue([mockQueueItem] as any);
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'cust-1', name: 'John Doe' } as any);
      vi.mocked(tallyHelpers.pushToTally).mockResolvedValue({ success: false, message: 'Internal Tally Error', response: null });

      await processTallyQueue();

      // Check transition to failed
      expect(prisma.tallyQueueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          status: 'failed',
          retryCount: 5,
          errorMessage: 'Internal Tally Error',
          xmlPayload: '<CUSTOMER_XML/>',
          tallyResponse: null,
          nextRetryAt: null,
        },
      });

      expect(broadcastTallyEvent).toHaveBeenCalledWith('queue_updated', {
        itemId: 'item-123',
        status: 'failed',
        error: 'Internal Tally Error',
      });
    });
  });
});
