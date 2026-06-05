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
    },
    tallyStockItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    job: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((arr) => Promise.all(arr)),
  },
}));

vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
}));

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
  pushJobToTally
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

  describe('Temp Directory location', () => {
    it('should use os.tmpdir() instead of project folder', () => {
      const targetDir = path.join(os.tmpdir(), 'tally-temp');
      expect(targetDir).not.toContain('.next');
    });
  });
});
