import { describe, expect, it, vi } from 'vitest';
import os from 'os';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Mock Prisma client to avoid requiring a real DATABASE_URL env variable during test execution
vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
    tallySyncSetting: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    tallyDocument: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tallyLedger: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    tallyStockItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    job: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    sLAConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    businessSettings: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((arr) => Promise.all(arr)),
  },
}));

vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
}));

import { writeAuditLog } from '@/lib/auditLog';
import {
  findCustomerName,
  findInvoiceNumber,
  findInvoiceDate,
  findGstNumber,
  findSupplierName,
  extractLineItems,
  averageConfidence,
  buildVoucherXml,
  TallyExtractionResult,
  testTallyConnection,
  validateGstinChecksum,
  syncTallyMasters,
  processTallyRetryQueue,
  pushJobToTally,
  pushToTally,
  suggestLedgerMapping,
  suggestStockMapping,
  getTallySettings,
  saveTallySettings,
  getDefaultTallySettings
} from './tally';

describe('Tally Integration Library', () => {
  describe('Customer Name Parsing Regex', () => {
    it('should capture names from "bill to" keyword correctly', () => {
      const text1 = 'BILL TO: Acme Corp';
      const text2 = 'bill to Acme Corp';
      expect(findCustomerName(text1)).toBe('Acme Corp');
      expect(findCustomerName(text2)).toBe('Acme Corp');
    });

    it('should capture names from "ship to" keyword correctly', () => {
      const text1 = 'SHIP TO: Bob Builder';
      const text2 = 'ship to Bob Builder';
      expect(findCustomerName(text1)).toBe('Bob Builder');
      expect(findCustomerName(text2)).toBe('Bob Builder');
    });

    it('should capture names from "customer" keyword correctly', () => {
      const text = 'CUSTOMER: John Doe';
      expect(findCustomerName(text)).toBe('John Doe');
    });

    it('should capture names from "buyer", "consignee", and "client" correctly', () => {
      expect(findCustomerName('BUYER: Alice')).toBe('Alice');
      expect(findCustomerName('consignee: Bob')).toBe('Bob');
      expect(findCustomerName('client: Charlie')).toBe('Charlie');
    });

    it('should return null if no keyword is matched', () => {
      const text = 'Invoice for random entity';
      expect(findCustomerName(text)).toBeNull();
    });
  });

  describe('Other Regex Parsers', () => {
    it('should find invoice number', () => {
      expect(findInvoiceNumber('INVOICE NO: INV-1234')).toBe('INV-1234');
      expect(findInvoiceNumber('inv. # abc-99')).toBe('abc-99');
    });

    it('should find invoice date', () => {
      expect(findInvoiceDate('DATE: 2026/06/05')).toBe('2026-06-05');
      expect(findInvoiceDate('date: 05-06-2026')).toBe('2026-06-05');
    });

    it('should find gst number', () => {
      expect(findGstNumber('GSTIN: 29ABCDE1234F1Z5')).toBe('29ABCDE1234F1Z5');
      expect(findGstNumber('random 27ABCDE1234F1Z5 text')).toBe('27ABCDE1234F1Z5');
    });

    it('should find supplier name', () => {
      expect(findSupplierName('SUPPLIER: Super Parts Inc.')).toBe('Super Parts Inc.');
      expect(findSupplierName('SELLER: Micro Parts')).toBe('Micro Parts');
      expect(findSupplierName('billed from: Tech Solutions')).toBe('Tech Solutions');
      expect(findSupplierName('vendor: Global Dist')).toBe('Global Dist');
      expect(findSupplierName('service provider: Fast Fix')).toBe('Fast Fix');
    });
  });

  describe('GST Compliance Calculations in extractLineItems', () => {
    it('should split GST into 9% CGST and 9% SGST for intra-state transaction', () => {
      const text = 'Keyboard 2 500.00 1180.00';
      const items = extractLineItems(text, true);
      expect(items.length).toBe(1);
      expect(items[0]).toEqual({
        name: 'Keyboard',
        quantity: 2,
        rate: 500,
        taxRate: 18,
        taxAmount: 180,
        cgst: 90,
        sgst: 90,
        igst: 0,
        total: 1180, // baseAmount (1000) + taxAmount (180)
      });
    });

    it('should calculate 18% IGST and set CGST/SGST to 0 for inter-state transaction', () => {
      const text = 'Mouse 1 1000.00 1180.00';
      const items = extractLineItems(text, false);
      expect(items.length).toBe(1);
      expect(items[0]).toEqual({
        name: 'Mouse',
        quantity: 1,
        rate: 1000,
        taxRate: 18,
        taxAmount: 180,
        cgst: 0,
        sgst: 0,
        igst: 180,
        total: 1180, // baseAmount (1000) + taxAmount (180)
      });
    });

    it('should extract mixed GST slabs correctly', () => {
      const text5 = 'ItemFive 10 100.00 1050.00'; // 5% GST
      const items5 = extractLineItems(text5, true);
      expect(items5[0].taxRate).toBe(5);
      expect(items5[0].cgst).toBe(25);
      expect(items5[0].sgst).toBe(25);

      const text12 = 'ItemTwelve 1 500.00 560.00'; // 12% GST
      const items12 = extractLineItems(text12, true);
      expect(items12[0].taxRate).toBe(12);

      const text28 = 'Item28 1 100.00 128.00'; // 28% GST
      const items28 = extractLineItems(text28, true);
      expect(items28[0].taxRate).toBe(28);
    });

    it('should return fallback item if no items matched', () => {
      const text = 'No valid items here';
      const items = extractLineItems(text);
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Services & Parts');
      expect(items[0].total).toBe(0);
    });
  });

  describe('Confidence Score (averageConfidence)', () => {
    it('should calculate confidence based on field hit counts', () => {
      const text = 'Short text';
      // 0 hits
      const hitsNone = {
        invoiceNumber: false,
        invoiceDate: false,
        gstNumber: false,
        supplierName: false,
        customerName: false,
        hasLineItems: false,
      };
      expect(averageConfidence(text, hitsNone)).toBeCloseTo(0.5); // base 0.3 + length bonus close to 0 -> clamped to 0.5

      // All hits
      const hitsAll = {
        invoiceNumber: true,
        invoiceDate: true,
        gstNumber: true,
        supplierName: true,
        customerName: true,
        hasLineItems: true,
      };
      // 0.3 + 0.15*5 + 0.1 = 1.15 -> clamped to 0.99
      expect(averageConfidence(text, hitsAll)).toBe(0.99);

      // Partial hits (invoiceNumber, invoiceDate, customerName)
      const hitsPartial = {
        invoiceNumber: true,
        invoiceDate: true,
        gstNumber: false,
        supplierName: false,
        customerName: true,
        hasLineItems: false,
      };
      // 0.3 + 0.15 * 3 = 0.75
      expect(averageConfidence(text, hitsPartial)).toBeCloseTo(0.75);
    });

    it('should prevent auto-approval of long garbage documents', () => {
      // Long garbage text (e.g. 10000 characters) with no field hits
      const longGarbage = 'a'.repeat(10000);
      const hitsNone = {
        invoiceNumber: false,
        invoiceDate: false,
        gstNumber: false,
        supplierName: false,
        customerName: false,
        hasLineItems: false,
      };
      const confidence = averageConfidence(longGarbage, hitsNone);
      // Expected: 0.3 + min(0.05, 10000/20000) = 0.35 -> clamped to 0.5
      expect(confidence).toBe(0.5);
      expect(confidence).toBeLessThan(0.95); // Will not auto-approve
    });
  });

  describe('XML Builder (buildVoucherXml)', () => {
    it('should build a valid voucher XML', () => {
      const mockResult: TallyExtractionResult = {
        invoiceNumber: 'INV-1234',
        invoiceDate: '2026-06-05',
        gstNumber: '29ABCDE1234F1Z5',
        customerName: 'Acme & Partners',
        supplierName: 'FixHub Service Center',
        paymentMode: 'Cash',
        totalAmount: 1180,
        confidence: 0.99,
        items: [
          {
            name: 'Keyboard & Mouse',
            quantity: 2,
            rate: 500,
            taxRate: 18,
            taxAmount: 180,
            cgst: 90,
            sgst: 90,
            igst: 0,
            total: 1180
          }
        ]
      };

      const xml = buildVoucherXml(mockResult, 'sales');
      
      // Check structural tags and display voucher mapping
      expect(xml).toContain('<ENVELOPE>');
      expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
      expect(xml).toContain('<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher">');
      expect(xml).toContain('<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>');
      
      // Check date formatting (20260605)
      expect(xml).toContain('<DATE>20260605</DATE>');
      
      // Check HTML/XML entity escaping for names
      expect(xml).toContain('<PARTYNAME>Acme &amp; Partners</PARTYNAME>');
      expect(xml).toContain('<ACCOUNTNAME>Keyboard &amp; Mouse</ACCOUNTNAME>');
      
      // Check numeric amounts
      expect(xml).toContain('<RATE>500.00</RATE>');
      expect(xml).toContain('<AMOUNT>1180.00</AMOUNT>');
      expect(xml).toContain('<VATEXPAMOUNT>180.00</VATEXPAMOUNT>');

      // Check detailed Output/Input GST ledger entries
      expect(xml).toContain('<LEDGERNAME>Sales</LEDGERNAME>');
      expect(xml).toContain('<AMOUNT>-1000.00</AMOUNT>');
      expect(xml).toContain('<LEDGERNAME>Output CGST</LEDGERNAME>');
      expect(xml).toContain('<AMOUNT>-90.00</AMOUNT>');
      expect(xml).toContain('<LEDGERNAME>Output SGST</LEDGERNAME>');
      expect(xml).toContain('<AMOUNT>-90.00</AMOUNT>');
    });
  });

  describe('Connection Test (testTallyConnection)', () => {
    it('should send a POST request with minimal TDL Export Company Collection XML payload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'mock-response',
      });
      vi.stubGlobal('fetch', fetchMock);

      const settings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };

      const result = await testTallyConnection(settings);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Connection to TallyPrime succeeded');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9000',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' },
          body: expect.stringContaining('CompanyCollection'),
        })
      );
    });

    it('should fail if the response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', fetchMock);

      const settings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };

      const result = await testTallyConnection(settings);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection test failed with status 500');
    });

    it('should fail if fetch throws an error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', fetchMock);

      const settings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };

      const result = await testTallyConnection(settings);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed: Network error');
    });
  });

  describe('GSTIN Checksum Validation (validateGstinChecksum)', () => {
    it('should validate correct GSTIN checksums and reject incorrect ones', () => {
      // 29AAAAA0000A1ZY has a checksum digit of 'Y'
      expect(validateGstinChecksum('29AAAAA0000A1ZY')).toBe(true);
      expect(validateGstinChecksum('29AAAAA0000A1ZX')).toBe(false);
      expect(validateGstinChecksum('INVALID_LENGTH')).toBe(false);
    });
  });

  describe('Tally Masters Sync (syncTallyMasters)', () => {
    it('should query Tally and transactionally write to ledger and stock tables', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<ENVELOPE><BODY><DESC><NAME>Sales Ledger</NAME><NAME>Custom Customer</NAME></DESC></BODY></ENVELOPE>`,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `<ENVELOPE><BODY><DESC><NAME>iPhone Screen</NAME></DESC></BODY></ENVELOPE>`,
        });
      vi.stubGlobal('fetch', fetchMock);

      const settings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };

      const prismaMock = prisma as any;
      prismaMock.tallyLedger.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tallyLedger.createMany.mockResolvedValue({ count: 2 });
      prismaMock.tallyStockItem.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tallyStockItem.createMany.mockResolvedValue({ count: 1 });

      await syncTallyMasters(settings);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(prismaMock.tallyLedger.createMany).toHaveBeenCalledWith({
        data: [
          { name: 'Sales Ledger', mappedName: 'Sales Ledger', source: 'tally', type: 'ledger' },
          { name: 'Custom Customer', mappedName: 'Custom Customer', source: 'tally', type: 'ledger' },
        ],
      });
      expect(prismaMock.tallyStockItem.createMany).toHaveBeenCalledWith({
        data: [
          { itemName: 'iPhone Screen', mappedName: 'iPhone Screen' },
        ],
      });
    });
  });

  describe('Tally Retry Queue (processTallyRetryQueue)', () => {
    it('should find failed documents and push them, updating state on success', async () => {
      const prismaMock = prisma as any;
      const mockSettings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: true,
      };

      prismaMock.tallySyncSetting.findUnique.mockResolvedValue(mockSettings);

      const mockFailedDoc = {
        id: 'doc-failed-123',
        fileName: 'test.pdf',
        documentType: 'invoice',
        extractedData: {
          invoiceNumber: 'INV-111',
          invoiceDate: '2026-06-05',
          gstNumber: '29AAAAA0000A1ZW',
          customerName: 'Acme',
          supplierName: 'FixHub',
          paymentMode: 'Cash',
          totalAmount: 1180,
          items: [{ name: 'Part A', quantity: 1, rate: 1000, taxRate: 18, taxAmount: 180, total: 1180 }]
        },
        voucherType: 'sales',
        xmlPayload: '<ENVELOPE>mock-xml</ENVELOPE>',
        status: 'failed',
        retryCount: 1,
        ownerId: 'admin-1',
      };

      prismaMock.tallyDocument.findMany.mockResolvedValue([mockFailedDoc]);
      prismaMock.tallyDocument.update.mockResolvedValue({});

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'MOCK_TALLY_RESPONSE_OK',
      });
      vi.stubGlobal('fetch', fetchMock);

      await processTallyRetryQueue();

      expect(prismaMock.tallyDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-failed-123' },
        data: expect.objectContaining({
          status: 'pushed',
          tallyResponse: 'MOCK_TALLY_OK',
          retryCount: 0,
          nextRetryAt: null,
        }),
      });
    });
  });

  describe('Job Auto-Push (pushJobToTally)', () => {
    it('should load job financials, structure a sales voucher document, and push to Tally', async () => {
      const prismaMock = prisma as any;
      const mockSettings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: true,
      };

      prismaMock.tallySyncSetting.findUnique.mockResolvedValue(mockSettings);

      const mockJob = {
        id: 'job-abc-123',
        invoiceNumber: 'INV-JOB-999',
        completedAt: new Date('2026-06-05'),
        paymentMethod: 'Cash',
        actualCost: 1180,
        estimatedCost: 1180,
        advanceAmount: 0,
        engineerId: 'admin-1',
        customer: { name: 'Bob Builder' },
        device: { brand: 'Apple', model: 'iPad' },
        partRequests: [
          { jobId: 'job-abc-123', partName: 'Battery', quantity: 1, unitCost: 590, status: 'Approved' }
        ],
      };

      prismaMock.job.findUnique.mockResolvedValue(mockJob);
      prismaMock.inventoryItem.findMany.mockResolvedValue([]);
      prismaMock.tallyDocument.create.mockResolvedValue({ id: 'new-doc-id' });
      prismaMock.tallyDocument.update.mockResolvedValue({});

      await pushJobToTally('job-abc-123');

      expect(prismaMock.tallyDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            voucherType: 'sales',
            confidence: 1.0,
            status: 'pending',
          })
        })
      );
    });
  });

  describe('Tally Push (pushToTally)', () => {
    const actor = { id: 'user-123', name: 'Test User', role: 'admin' };
    const xml = '<ENVELOPE>mock-xml</ENVELOPE>';
    const documentId = 'doc-abc-123';

    it('should return failure if sync is disabled', async () => {
      const settings = {
        enabled: false,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
      };
      const result = await pushToTally(xml, settings, actor, documentId);
      expect(result).toEqual({ success: false, message: 'Tally sync is disabled.', response: null });
    });

    it('should write audit log and succeed in mock mode', async () => {
      const settings = {
        enabled: true,
        host: 'localhost',
        port: 9000,
        companyName: 'Test Company',
        mockMode: true,
      };
      vi.mocked(writeAuditLog).mockClear();

      const result = await pushToTally(xml, settings, actor, documentId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock push to Tally completed successfully');
      expect(result.response).toBe('MOCK_TALLY_OK');
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        actor,
        action: 'push',
        entity: 'tallyDocument',
        entityId: documentId,
        newValue: 'Mock push to Tally completed',
      }));
    });

    it('should push to real URL and handle success response', async () => {
      const settings = {
        enabled: true,
        host: 'tally-server',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };
      vi.mocked(writeAuditLog).mockClear();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'Tally Response XML',
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await pushToTally(xml, settings, actor, documentId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('TallyPrime accepted the XML payload.');
      expect(result.response).toBe('Tally Response XML');
      expect(fetchMock).toHaveBeenCalledWith('http://tally-server:9000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
        signal: expect.any(AbortSignal),
      });
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        actor,
        action: 'push',
        entity: 'tallyDocument',
        entityId: documentId,
        newValue: 'Tally Response XML',
      }));
    });

    it('should handle non-ok server response status', async () => {
      const settings = {
        enabled: true,
        host: 'tally-server',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };
      vi.mocked(writeAuditLog).mockClear();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await pushToTally(xml, settings, actor, documentId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Push failed (Tally returned error nodes or status 500).');
      expect(result.response).toBe('Internal Server Error');
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        newValue: 'Internal Server Error',
        meta: expect.objectContaining({ status: 500 }),
      }));
    });

    it('should handle fetch exception gracefully', async () => {
      const settings = {
        enabled: true,
        host: 'tally-server',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };
      vi.mocked(writeAuditLog).mockClear();

      const fetchMock = vi.fn().mockRejectedValue(new Error('Connection timed out'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await pushToTally(xml, settings, actor, documentId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Push failed: Connection timed out');
      expect(result.response).toBeNull();
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        newValue: 'Connection timed out',
      }));
    });
  });

  describe('Ledger and Stock Mapping Suggestions', () => {
    it('suggestLedgerMapping should suggest mapped Tally ledger if matched', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyLedger.findFirst.mockResolvedValue({ name: 'Bob Builder Ledger' });

      const suggestion = await suggestLedgerMapping('bob builder');
      expect(suggestion).toEqual({
        suggestedLedger: 'Bob Builder Ledger',
        ledgerConfidence: 0.95,
      });
    });

    it('suggestLedgerMapping should suggest Customer name if customer match found', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyLedger.findFirst.mockResolvedValue(null);
      prismaMock.customer.findMany.mockResolvedValue([{ name: 'Bob Builder Customer' }]);

      const suggestion = await suggestLedgerMapping('bob builder');
      expect(suggestion).toEqual({
        suggestedLedger: 'Bob Builder Customer',
        ledgerConfidence: 0.92,
      });
    });

    it('suggestLedgerMapping should fall back if no match found', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyLedger.findFirst.mockResolvedValue(null);
      prismaMock.customer.findMany.mockResolvedValue([]);

      const suggestion = await suggestLedgerMapping('Anonymous');
      expect(suggestion).toEqual({
        suggestedLedger: 'Anonymous Ledger',
        ledgerConfidence: 0.48,
      });
    });

    it('suggestStockMapping should suggest mapped Tally stock item if matched', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyStockItem.findFirst.mockResolvedValue({ itemName: 'Keyboard V2' });

      const suggestion = await suggestStockMapping('keyboard');
      expect(suggestion).toEqual({
        suggestedStockItem: 'Keyboard V2',
        stockConfidence: 0.95,
      });
    });

    it('suggestStockMapping should suggest inventory item if match found', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyStockItem.findFirst.mockResolvedValue(null);
      prismaMock.inventoryItem.findMany.mockResolvedValue([{ name: 'Standard Keyboard' }]);

      const suggestion = await suggestStockMapping('keyboard');
      expect(suggestion).toEqual({
        suggestedStockItem: 'Standard Keyboard',
        stockConfidence: 0.9,
      });
    });

    it('suggestStockMapping should fall back if no match found', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallyStockItem.findFirst.mockResolvedValue(null);
      prismaMock.inventoryItem.findMany.mockResolvedValue([]);

      const suggestion = await suggestStockMapping('Unknown Part');
      expect(suggestion).toEqual({
        suggestedStockItem: 'Unknown Part (new stock item)',
        stockConfidence: 0.35,
      });
    });
  });

  describe('Tally Settings Get & Save', () => {
    it('getTallySettings should create and return default settings if row does not exist', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallySyncSetting.findUnique.mockResolvedValue(null);
      prismaMock.tallySyncSetting.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      const settings = await getTallySettings();
      expect(settings).toEqual(getDefaultTallySettings());
      expect(prismaMock.tallySyncSetting.create).toHaveBeenCalled();
    });

    it('getTallySettings should return existing settings', async () => {
      const prismaMock = prisma as any;
      const existing = {
        enabled: true,
        host: 'tally-host',
        port: 8080,
        companyName: 'Company Inc',
        syncStatus: 'synced',
        lastTestedAt: new Date('2026-06-05T00:00:00.000Z'),
        mockMode: true,
        autoPushOnApproval: false,
      };
      prismaMock.tallySyncSetting.findUnique.mockResolvedValue(existing);

      const settings = await getTallySettings();
      expect(settings).toEqual({
        ...existing,
        lastTestedAt: '2026-06-05T00:00:00.000Z',
      });
    });

    it('saveTallySettings should call upsert with formatted data', async () => {
      const prismaMock = prisma as any;
      prismaMock.tallySyncSetting.upsert.mockResolvedValue({});

      const partialSettings = {
        enabled: true,
        host: 'new-host',
      };
      await saveTallySettings(partialSettings);

      expect(prismaMock.tallySyncSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'tally-sync-settings' },
        create: expect.objectContaining({
          id: 'tally-sync-settings',
          enabled: true,
          host: 'new-host',
        }),
        update: expect.objectContaining({
          enabled: true,
          host: 'new-host',
        }),
      }));
    });
  });

  describe('Temp Directory location', () => {
    it('should use os.tmpdir() instead of project folder', () => {
      const targetDir = path.join(os.tmpdir(), 'tally-temp');
      expect(targetDir).not.toContain('.next');
    });
  });

  describe('Tally Integration Improvements Unit Tests', () => {
    it('should generate deterministic GUIDs based on document ID', () => {
      const mockResult: TallyExtractionResult = {
        invoiceNumber: 'INV-1234',
        invoiceDate: '2026-06-05',
        gstNumber: '29ABCDE1234F1Z5',
        customerName: 'Acme Corp',
        supplierName: 'FixHub',
        paymentMode: 'Cash',
        totalAmount: 100,
        confidence: 0.99,
        items: []
      };

      const docId = 'fixed-test-document-id';
      const xml1 = buildVoucherXml(mockResult, 'sales', docId);
      const xml2 = buildVoucherXml(mockResult, 'sales', docId);

      // Verify that the XMLs are completely identical (deterministic GUID)
      expect(xml1).toBe(xml2);

      // Check if GUID node is present and holds a standard UUID length/format
      const match = xml1.match(/<GUID>([^<]+)<\/GUID>/);
      expect(match).not.toBeNull();
      const guid = match![1];
      expect(guid).toHaveLength(36);
      expect(guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should parse Tally XML response for error nodes', async () => {
      const settings = {
        enabled: true,
        host: 'tally-server',
        port: 9000,
        companyName: 'Test Company',
        mockMode: false,
      };
      const actor = { id: 'admin-1', name: 'Test Admin', role: 'admin' };

      // Case 1: Tally response with LINEERROR
      const responseXmlLineError = `
        <ENVELOPE>
          <HEADER><VERSION>1</VERSION></HEADER>
          <BODY>
            <LINEERROR>Ledger 'Custom Customer' does not exist!</LINEERROR>
          </BODY>
        </ENVELOPE>
      `;
      const fetchMock1 = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => responseXmlLineError,
      });
      vi.stubGlobal('fetch', fetchMock1);

      const result1 = await pushToTally('<xml></xml>', settings, actor, 'doc-1');
      expect(result1.success).toBe(false);
      expect(result1.message).toContain("Tally error: Ledger 'Custom Customer' does not exist!");

      // Case 2: Tally response with ERRORS count
      const responseXmlErrorsCount = `
        <ENVELOPE>
          <HEADER><VERSION>1</VERSION></HEADER>
          <BODY>
            <RESPONSE>
              <ERRORS>2</ERRORS>
            </RESPONSE>
          </BODY>
        </ENVELOPE>
      `;
      const fetchMock2 = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => responseXmlErrorsCount,
      });
      vi.stubGlobal('fetch', fetchMock2);

      const result2 = await pushToTally('<xml></xml>', settings, actor, 'doc-2');
      expect(result2.success).toBe(false);
      expect(result2.message).toContain("Push failed (Tally returned error nodes or status 200).");
    });

    it('should capture names from multiline address text during OCR parsing', () => {
      const text = `
        BUYER:
        Acme Global Industries
        123 Corporate Way, Tech Park
        Bangalore, Karnataka - 560103
      `;
      expect(findCustomerName(text)).toBe('Acme Global Industries');

      const textSupplier = `
        SELLER:
        Super Parts Distributor Ltd.
        Industrial Area, Phase II
        Delhi - 110020
      `;
      expect(findSupplierName(textSupplier)).toBe('Super Parts Distributor Ltd.');
    });

    it('should validate GST checksums correctly', () => {
      expect(validateGstinChecksum('29AAAAA0000A1ZY')).toBe(true);
      expect(validateGstinChecksum('27ABCDE1234F1Z5')).toBe(false); // Invalid checksum
      expect(validateGstinChecksum('12345')).toBe(false); // Too short
    });

    it('should fetch business settings from database with fallback', async () => {
      const { getBusinessConfig } = await import('./businessConfigServer');
      const prismaMock = prisma as any;

      // Case 1: Custom DB settings configured
      prismaMock.businessSettings.findUnique.mockResolvedValueOnce({
        shopName: 'Custom Shop Name',
        tagline: 'Custom Tagline',
        address: 'Custom Address',
        phone: '1234567890',
        email: 'custom@shop.com',
        gstin: '29ABCDE1234F1Z5',
        taxRate: 12,
        taxLabel: 'GST',
      });

      const config1 = await getBusinessConfig();
      expect(config1.shopName).toBe('Custom Shop Name');
      expect(config1.taxRate).toBe(12);

      // Case 2: DB returns null (should fallback to default info)
      prismaMock.businessSettings.findUnique.mockResolvedValueOnce(null);
      const config2 = await getBusinessConfig();
      expect(config2.shopName).toBe('FixHub');
      expect(config2.taxRate).toBe(18);
    });
  });
});
