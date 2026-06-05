import { prisma } from './prisma';
import { writeAuditLog, AuditActor } from './auditLog';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { BUSINESS_INFO } from './businessConfig';

export type TallyDocumentType =
  | 'invoice'
  | 'gst-invoice'
  | 'supplier-bill'
  | 'receipt'
  | 'bank-statement'
  | 'image';

export interface TallyExtractedItem {
  name: string;
  quantity: number;
  rate: number;
  taxRate: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface TallyExtractionResult {
  invoiceNumber: string;
  invoiceDate: string;
  gstNumber: string;
  customerName: string;
  supplierName: string;
  items: TallyExtractedItem[];
  paymentMode: string;
  totalAmount: number;
  confidence: number;
}

export interface TallySettings {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
  syncStatus: string;
  lastTestedAt?: string;
  mockMode?: boolean;
  autoPushOnApproval?: boolean;
}

export interface TallyMappingSuggestion {
  suggestedLedger: string;
  suggestedStockItem: string;
  ledgerConfidence: number;
  stockConfidence: number;
}

const DEFAULT_SETTINGS: TallySettings = {
  enabled: false,
  host: 'localhost',
  port: 9000,
  companyName: 'FixHub Service Center',
  syncStatus: 'idle',
  mockMode: false,
  autoPushOnApproval: true,
};

export function getDefaultTallySettings(): TallySettings {
  return { ...DEFAULT_SETTINGS };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const VOUCHER_TYPE_MAPPING: Record<string, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  receipt: 'Receipt',
  payment: 'Payment',
  journal: 'Journal',
};

export function buildVoucherXml(
  extracted: TallyExtractionResult,
  voucherType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'journal'
) {
  const mappedVchType = VOUCHER_TYPE_MAPPING[voucherType] || voucherType;
  const invoiceDate = new Date(extracted.invoiceDate).toISOString().slice(0, 10);
  const narration = `${voucherType === 'sales' ? 'Sales invoice' : voucherType === 'purchase' ? 'Purchase invoice' : 'Accounting entry'} for ${extracted.customerName || extracted.supplierName}`;
  const totalAmount = extracted.totalAmount ?? extracted.items.reduce((sum, item) => sum + item.total, 0);

  const lineItems = extracted.items.map((item) => {
    return `
        <ALLINVENTORYENTRIES.LIST>
          <BILLEDQTY>${item.quantity}</BILLEDQTY>
          <RATE>${item.rate.toFixed(2)}</RATE>
          <AMOUNT>${item.total.toFixed(2)}</AMOUNT>
          <ACCOUNTNAME>${escapeXml(item.name)}</ACCOUNTNAME>
          <VATEXPAMOUNT>${item.taxAmount.toFixed(2)}</VATEXPAMOUNT>
        </ALLINVENTORYENTRIES.LIST>`;
  }).join('');

  let ledgerEntries = '';

  // Party entry (Customer/Supplier)
  const partyName = extracted.customerName || extracted.supplierName;
  const partyAmount = (voucherType === 'purchase' ? -totalAmount : totalAmount).toFixed(2);
  ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(partyName)}</LEDGERNAME>
              <AMOUNT>${partyAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;

  // Emit detailed GST and base ledger entries for sales/purchase
  if (voucherType === 'sales' || voucherType === 'purchase') {
    const isSales = voucherType === 'sales';
    const mainLedgerName = isSales ? 'Sales' : 'Purchase';

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    for (const item of extracted.items) {
      totalCgst += item.cgst || 0;
      totalSgst += item.sgst || 0;
      totalIgst += item.igst || 0;
    }

    const baseAmount = totalAmount - (totalCgst + totalSgst + totalIgst);
    const mainAmount = (isSales ? -baseAmount : baseAmount).toFixed(2);

    ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(mainLedgerName)}</LEDGERNAME>
              <AMOUNT>${mainAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;

    if (totalCgst > 0) {
      const cgstLedger = isSales ? 'Output CGST' : 'Input CGST';
      const cgstAmount = (isSales ? -totalCgst : totalCgst).toFixed(2);
      ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cgstLedger)}</LEDGERNAME>
              <AMOUNT>${cgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }

    if (totalSgst > 0) {
      const sgstLedger = isSales ? 'Output SGST' : 'Input SGST';
      const sgstAmount = (isSales ? -totalSgst : totalSgst).toFixed(2);
      ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(sgstLedger)}</LEDGERNAME>
              <AMOUNT>${sgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }

    if (totalIgst > 0) {
      const igstLedger = isSales ? 'Output IGST' : 'Input IGST';
      const igstAmount = (isSales ? -totalIgst : totalIgst).toFixed(2);
      ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(igstLedger)}</LEDGERNAME>
              <AMOUNT>${igstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${escapeXml(mappedVchType)}" ACTION="Create" OBJVIEW="Accounting Voucher">
            <DATE>${invoiceDate.replace(/-/g, '')}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>${escapeXml(mappedVchType)}</VOUCHERTYPENAME>
            <PARTYNAME>${escapeXml(partyName)}</PARTYNAME>
            <GSTCLASS/>${lineItems}${ledgerEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export async function extractTallyDocument(
  fileName: string,
  documentType: TallyDocumentType
): Promise<TallyExtractionResult> {
  const text = await parseDocumentText(fileName);
  const invoiceNumber = findInvoiceNumber(text);
  const invoiceDate = findInvoiceDate(text);
  const gstNumber = findGstNumber(text);
  const supplierName = findSupplierName(text);
  const customerName = findCustomerName(text);

  const businessStateCode = BUSINESS_INFO.gstin.slice(0, 2);
  const otherStateCode = gstNumber ? gstNumber.slice(0, 2) : businessStateCode;
  const isIntrastate = businessStateCode === otherStateCode;

  const items = extractLineItems(text, isIntrastate);
  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const hasLineItems = text.split(/\r?\n/).some((line) =>
    /^([A-Za-z0-9 &'()+\-\/]+)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)$/.test(line.trim())
  );

  const hits = {
    invoiceNumber: invoiceNumber !== null,
    invoiceDate: invoiceDate !== null,
    gstNumber: gstNumber !== null,
    supplierName: supplierName !== null,
    customerName: customerName !== null,
    hasLineItems,
  };

  const confidence = averageConfidence(text, hits);

  return {
    invoiceNumber: invoiceNumber ?? `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: invoiceDate ?? new Date().toISOString().slice(0, 10),
    gstNumber: gstNumber ?? 'UNKNOWN',
    customerName: customerName ?? (documentType === 'invoice' || documentType === 'receipt' ? 'Retained Customer' : 'FixHub Service Center'),
    supplierName: supplierName ?? (documentType === 'supplier-bill' ? 'Global Parts Supplier' : 'FixHub Service Center'),
    items,
    paymentMode: inferPaymentMode(text),
    totalAmount,
    confidence,
  };
}

async function parseDocumentText(fileName: string): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), 'tally-temp');
  await fs.mkdir(tmpDir, { recursive: true });

  const sourcePath = path.isAbsolute(fileName) ? fileName : path.join(process.cwd(), fileName);
  const buffer = await fs.readFile(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  const imagePath = path.join(tmpDir, `${randomUUID()}${ext || '.png'}`);
  await fs.writeFile(imagePath, buffer);
  try {
    const result = await Tesseract.recognize(imagePath, 'eng', { logger: () => {} });
    return result.data.text || '';
  } finally {
    await fs.rm(imagePath, { force: true });
  }
}

export function findInvoiceNumber(text: string): string | null {
  const patterns = [/invoice\s*no[:\-\s]*([A-Z0-9\-\/]+)/i, /inv\.?\s*#?[:\-\s]*([A-Z0-9\-\/]+)/i];
  return matchFirst(text, patterns);
}

export function findInvoiceDate(text: string): string | null {
  // Pattern 1: YYYY-MM-DD
  const p1 = /date[:\-\s]*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i;
  const m1 = text.match(p1);
  if (m1) {
    const yyyy = m1[1];
    const mm = m1[2].padStart(2, '0');
    const dd = m1[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Pattern 2: DD-MM-YYYY (or DD-MM-YY)
  const p2 = /date[:\-\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i;
  const m2 = text.match(p2);
  if (m2) {
    const dd = m2[1].padStart(2, '0');
    const mm = m2[2].padStart(2, '0');
    let yyyy = m2[3];
    if (yyyy.length === 2) {
      yyyy = `20${yyyy}`;
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

export function findGstNumber(text: string): string | null {
  const match = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
  return match?.[1] ?? null;
}

export function validateGstinChecksum(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  const cleanGstin = gstin.toUpperCase();
  
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let totalSum = 0;
  for (let i = 0; i < 14; i++) {
    const char = cleanGstin[i];
    const val = chars.indexOf(char);
    if (val === -1) return false;
    
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = val * factor;
    
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    totalSum += quotient + remainder;
  }
  
  const z = totalSum % 36;
  const cVal = (36 - z) % 36;
  const expectedChar = chars[cVal];
  
  return cleanGstin[14] === expectedChar;
}

export function findSupplierName(text: string): string | null {
  const match = text.match(/supplier\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i);
  return match?.[1]?.trim() ?? null;
}

export function findCustomerName(text: string): string | null {
  const match = text.match(/(?:bill\s*to|ship\s*to|customer)\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i);
  return match?.[1]?.trim() ?? null;
}

export function extractGstRateFromName(name: string): number {
  const match = name.match(/\b(5|12|18|28)\s*%/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const match2 = name.match(/\b(GST|IGST|CGST|SGST)\s*(5|12|18|28)\b/i);
  if (match2) {
    return parseInt(match2[2], 10);
  }
  return 18; // default to 18%
}

export function extractLineItems(text: string, isIntrastate: boolean = true): TallyExtractedItem[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const items: TallyExtractedItem[] = [];
  const itemPattern = /^([A-Za-z0-9 &'()+\-\/]+)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)$/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (!match) continue;
    const name = match[1].trim();
    const quantity = parseInt(match[2], 10);
    const rate = parseFloat(match[3].replace(/,/g, ''));
    const totalRaw = parseFloat(match[4].replace(/,/g, ''));
    if (Number.isFinite(quantity) && Number.isFinite(rate) && Number.isFinite(totalRaw)) {
      const baseAmount = rate * quantity;

      // Determine tax rate (support 5%, 12%, 18%, 28%)
      let taxRate = 18;
      const diff = totalRaw - baseAmount;
      if (diff > 0 && baseAmount > 0) {
        const calculatedRate = (diff / baseAmount) * 100;
        const standardRates = [5, 12, 18, 28];
        const closest = standardRates.reduce((prev, curr) => 
          Math.abs(curr - calculatedRate) < Math.abs(prev - calculatedRate) ? curr : prev
        );
        if (Math.abs(closest - calculatedRate) < 2) {
          taxRate = closest;
        } else {
          taxRate = extractGstRateFromName(name);
        }
      } else {
        taxRate = extractGstRateFromName(name);
      }

      const halfRate = taxRate / 2 / 100;
      const fullRate = taxRate / 100;

      const cgst = isIntrastate ? parseFloat((baseAmount * halfRate).toFixed(2)) : 0;
      const sgst = isIntrastate ? parseFloat((baseAmount * halfRate).toFixed(2)) : 0;
      const igst = !isIntrastate ? parseFloat((baseAmount * fullRate).toFixed(2)) : 0;
      const taxAmount = parseFloat((cgst + sgst + igst).toFixed(2));
      const total = parseFloat((baseAmount + taxAmount).toFixed(2));

      items.push({
        name,
        quantity,
        rate,
        taxRate,
        taxAmount,
        cgst,
        sgst,
        igst,
        total,
      });
    }
  }
  if (items.length > 0) return items;
  return [{ name: 'Services & Parts', quantity: 1, rate: 0, taxRate: 18, taxAmount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }];
}

function inferPaymentMode(text: string): string {
  if (/cash/i.test(text)) return 'Cash';
  if (/credit\s*card|debit\s*card|visa|mastercard|rupay/i.test(text)) return 'Card';
  if (/bank\s*transfer|upi|internet\s*banking|neft|rtgs/i.test(text)) return 'Bank Transfer';
  return 'Unknown';
}

export function averageConfidence(
  text: string,
  hits: {
    invoiceNumber: boolean;
    invoiceDate: boolean;
    gstNumber: boolean;
    supplierName: boolean;
    customerName: boolean;
    hasLineItems: boolean;
  }
): number {
  let score = 0.3;
  if (hits.invoiceNumber) score += 0.15;
  if (hits.invoiceDate) score += 0.15;
  if (hits.supplierName) score += 0.15;
  if (hits.customerName) score += 0.15;
  if (hits.hasLineItems) score += 0.15;
  if (hits.gstNumber) score += 0.10;

  const textLengthBonus = Math.min(0.05, text.length / 20000);
  score += textLengthBonus;

  return Math.min(0.99, Math.max(0.5, score));
}

function matchFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export async function suggestLedgerMapping(name: string) {
  const normalized = name.trim().toLowerCase();

  // Search Tally synced ledgers first
  const tallyLedger = await prisma.tallyLedger.findFirst({
    where: { name: { contains: normalized, mode: 'insensitive' } }
  });

  if (tallyLedger) {
    return {
      suggestedLedger: tallyLedger.name,
      ledgerConfidence: 0.95,
    };
  }

  const customers = await prisma.customer.findMany({ where: { name: { contains: normalized, mode: 'insensitive' } }, take: 5 });
  const oneMatch = customers[0];

  return {
    suggestedLedger: oneMatch?.name ?? `${name} Ledger`,
    ledgerConfidence: oneMatch ? 0.92 : 0.48,
  };
}

export async function suggestStockMapping(itemName: string) {
  const normalized = itemName.trim().toLowerCase();

  // Search Tally synced stock items first
  const tallyStock = await prisma.tallyStockItem.findFirst({
    where: { itemName: { contains: normalized, mode: 'insensitive' } }
  });

  if (tallyStock) {
    return {
      suggestedStockItem: tallyStock.itemName,
      stockConfidence: 0.95,
    };
  }

  const inventory = await prisma.inventoryItem.findMany({ where: { name: { contains: normalized, mode: 'insensitive' } }, take: 5 });
  const match = inventory[0];

  return {
    suggestedStockItem: match?.name ?? `${itemName} (new stock item)`,
    stockConfidence: match ? 0.9 : 0.35,
  };
}

export async function getTallySettings(): Promise<TallySettings> {
  const row = await prisma.tallySyncSetting.findUnique({ where: { id: 'tally-sync-settings' } });
  if (!row) {
    await prisma.tallySyncSetting.create({ data: { id: 'tally-sync-settings', ...DEFAULT_SETTINGS } });
    return { ...DEFAULT_SETTINGS };
  }
  return {
    enabled: row.enabled,
    host: row.host,
    port: row.port,
    companyName: row.companyName,
    syncStatus: row.syncStatus,
    lastTestedAt: row.lastTestedAt?.toISOString() ?? undefined,
    mockMode: row.mockMode ?? false,
    autoPushOnApproval: row.autoPushOnApproval ?? true,
  };
}

export async function saveTallySettings(settings: Partial<TallySettings>) {
  const data = {
    enabled: settings.enabled ?? DEFAULT_SETTINGS.enabled,
    host: settings.host ?? DEFAULT_SETTINGS.host,
    port: settings.port ?? DEFAULT_SETTINGS.port,
    companyName: settings.companyName ?? DEFAULT_SETTINGS.companyName,
    syncStatus: settings.syncStatus ?? DEFAULT_SETTINGS.syncStatus,
    mockMode: settings.mockMode ?? DEFAULT_SETTINGS.mockMode,
    autoPushOnApproval: settings.autoPushOnApproval ?? DEFAULT_SETTINGS.autoPushOnApproval,
    lastTestedAt: settings.lastTestedAt ? new Date(settings.lastTestedAt) : undefined,
  };

  return prisma.tallySyncSetting.upsert({
    where: { id: 'tally-sync-settings' },
    create: { id: 'tally-sync-settings', ...data },
    update: data,
  });
}

export async function syncTallyMasters(settings: TallySettings) {
  if (!settings.enabled) return;

  let ledgers: string[] = [];
  let stockItems: string[] = [];

  if (process.env.TALLY_MOCK === 'true' || settings.mockMode) {
    ledgers = [
      'Acme Corp Ledger',
      'Bob Builder Ledger',
      'John Doe Ledger',
      'Global Parts Supplier',
      'FixHub Service Center',
      'Sales',
      'Purchase',
      'Output CGST',
      'Output SGST',
      'Output IGST',
      'Input CGST',
      'Input SGST',
      'Input IGST',
    ];
    stockItems = [
      'Keyboard',
      'Mouse',
      'Replacement Screen',
      'RAM 8GB',
      'SSD 256GB',
    ];
  } else {
    const url = `http://${settings.host}:${settings.port}`;
    try {
      const ledgerXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>LedgerCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLDECL>
          <COLLECTION NAME="LedgerCollection">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLDECL>
      </DESC>
    </BODY>
</ENVELOPE>`;

      const resLedger = await fetch(url, { method: 'POST', body: ledgerXml, headers: { 'Content-Type': 'application/xml' } });
      if (resLedger.ok) {
        const text = await resLedger.text();
        const matches = text.match(/<NAME[^>]*>([^<]+)<\/NAME>/gi);
        if (matches) {
          ledgers = matches.map(m => m.replace(/<\/?NAME[^>]*>/gi, '').trim());
        }
      }

      const stockXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>StockItemCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLDECL>
          <COLLECTION NAME="StockItemCollection">
            <TYPE>StockItem</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLDECL>
      </DESC>
    </BODY>
</ENVELOPE>`;

      const resStock = await fetch(url, { method: 'POST', body: stockXml, headers: { 'Content-Type': 'application/xml' } });
      if (resStock.ok) {
        const text = await resStock.text();
        const matches = text.match(/<NAME[^>]*>([^<]+)<\/NAME>/gi);
        if (matches) {
          stockItems = matches.map(m => m.replace(/<\/?NAME[^>]*>/gi, '').trim());
        }
      }
    } catch (err) {
      console.error('Failed to sync Tally masters:', err);
      return;
    }
  }

  if (ledgers.length > 0) {
    await prisma.$transaction([
      prisma.tallyLedger.deleteMany({ where: { source: 'tally' } }),
      prisma.tallyLedger.createMany({
        data: ledgers.map(name => ({
          name,
          mappedName: name,
          source: 'tally',
          type: 'ledger',
        })),
      }),
    ]);
  }

  if (stockItems.length > 0) {
    await prisma.$transaction([
      prisma.tallyStockItem.deleteMany({}),
      prisma.tallyStockItem.createMany({
        data: stockItems.map(itemName => ({
          itemName,
          mappedName: itemName,
        })),
      }),
    ]);
  }
}

export async function testTallyConnection(settings: TallySettings) {
  if (!settings.enabled) {
    return { success: false, message: 'Tally sync is disabled in settings.' };
  }

  if (process.env.TALLY_MOCK === 'true' || settings.mockMode) {
    return { success: true, message: 'Mock Tally server is enabled. Connection is simulated as successful.' };
  }

  const url = `http://${settings.host}:${settings.port}`;
  const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CompanyCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLDECL>
          <COLLECTION NAME="CompanyCollection">
            <TYPE>Company</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLDECL>
      </DESC>
    </BODY>
</ENVELOPE>`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: testXml,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      return { success: true, message: 'Connection to TallyPrime succeeded.' };
    }
    return { success: false, message: `Connection test failed with status ${response.status}.` };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'unknown error'}` };
  }
}

export async function pushToTally(
  xml: string,
  settings: TallySettings,
  actor: AuditActor,
  documentId: string
) {
  if (!settings.enabled) {
    return { success: false, message: 'Tally sync is disabled.' };
  }

  if (process.env.TALLY_MOCK === 'true' || settings.mockMode) {
    await writeAuditLog({
      actor,
      action: 'push',
      entity: 'tallyDocument',
      entityId: documentId,
      oldValue: null,
      newValue: 'Mock push to Tally completed',
      meta: { mode: 'mock', endpoint: `${settings.host}:${settings.port}` },
    });

    return {
      success: true,
      message: 'Mock push to Tally completed successfully. No TallyPrime server was required.',
      response: 'MOCK_TALLY_OK',
    };
  }

  const url = `http://${settings.host}:${settings.port}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
    const text = await response.text();
    await writeAuditLog({
      actor,
      action: 'push',
      entity: 'tallyDocument',
      entityId: documentId,
      oldValue: null,
      newValue: text,
      meta: { endpoint: url, status: response.status },
    });

    return {
      success: response.ok,
      message: response.ok ? 'TallyPrime accepted the XML payload.' : `TallyPrime returned ${response.status}.`,
      response: text,
    };
  } catch (error) {
    await writeAuditLog({
      actor,
      action: 'push',
      entity: 'tallyDocument',
      entityId: documentId,
      oldValue: null,
      newValue: error instanceof Error ? error.message : String(error),
      meta: { endpoint: url },
    });
    return { success: false, message: `Push failed: ${error instanceof Error ? error.message : 'unknown error'}`, response: null };
  }
}

export async function saveTallyDocument(
  ownerId: string,
  fileName: string,
  documentType: TallyDocumentType,
  extract: TallyExtractionResult
) {
  return prisma.tallyDocument.create({
    data: {
      fileName,
      documentType,
      extractedData: extract as any,
      voucherType: documentType === 'supplier-bill' ? 'purchase' : 'sales',
      confidence: extract.confidence,
      status: extract.confidence > 0.95 ? 'approved' : 'pending',
      ownerId,
    },
  });
}

export async function getTallyDashboardStats() {
  const totalDocuments = await prisma.tallyDocument.count();
  const autoApproved = await prisma.tallyDocument.count({ where: { status: 'approved' } });
  const pushed = await prisma.tallyDocument.count({ where: { status: 'pushed' } });
  const pendingReviews = await prisma.tallyDocument.count({ where: { status: 'pending' } });
  const failedEntries = await prisma.tallyDocument.count({ where: { status: 'failed' } });
  const successRate = totalDocuments > 0 ? Math.round(((autoApproved + pushed) / totalDocuments) * 100) : 0;

  return {
    totalDocuments,
    autoApproved,
    pushed,
    pendingReviews,
    failedEntries,
    successRate,
  };
}

export async function scheduleRetryForFailedPush(documentId: string, currentRetryCount: number = 0) {
  const nextRetryMinutes = Math.pow(2, currentRetryCount); // 1, 2, 4, 8, 16... minutes
  const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60000);

  await prisma.tallyDocument.update({
    where: { id: documentId },
    data: {
      status: 'failed',
      retryCount: currentRetryCount + 1,
      nextRetryAt,
    },
  });
}

export async function processTallyRetryQueue() {
  const settings = await getTallySettings();
  if (!settings.enabled) return;

  const now = new Date();
  const failedDocs = await prisma.tallyDocument.findMany({
    where: {
      status: 'failed',
      nextRetryAt: { lte: now },
      retryCount: { lt: 5 },
    },
  });

  for (const doc of failedDocs) {
    console.log(`[Tally Retry Queue] Retrying document ${doc.id} (attempt ${doc.retryCount + 1})...`);
    const actor = { id: doc.ownerId, name: 'System Retry Queue', role: 'admin' };

    let xml = doc.xmlPayload;
    if (!xml) {
      try {
        xml = buildVoucherXml(doc.extractedData as any, doc.voucherType as any);
        await prisma.tallyDocument.update({
          where: { id: doc.id },
          data: { xmlPayload: xml },
        });
      } catch (err) {
        console.error(`[Tally Retry Queue] Failed to generate XML for document ${doc.id}:`, err);
        continue;
      }
    }

    try {
      const result = await pushToTally(xml, settings, actor, doc.id);
      if (result.success) {
        await prisma.tallyDocument.update({
          where: { id: doc.id },
          data: {
            status: 'pushed',
            tallyResponse: result.response ?? 'SUCCESS',
            retryCount: 0,
            nextRetryAt: null,
          },
        });
        console.log(`[Tally Retry Queue] Document ${doc.id} successfully pushed to Tally.`);
      } else {
        await scheduleRetryForFailedPush(doc.id, doc.retryCount);
        console.warn(`[Tally Retry Queue] Retry failed for document ${doc.id}: ${result.message}`);
      }
    } catch (err) {
      await scheduleRetryForFailedPush(doc.id, doc.retryCount);
      console.error(`[Tally Retry Queue] Error pushing document ${doc.id}:`, err);
    }
  }
}

export async function pushJobToTally(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      customer: true,
      device: true,
      partRequests: {
        where: { status: 'Approved' },
      },
    },
  });
  if (!job) return;

  const inventory = await prisma.inventoryItem.findMany();
  const items: TallyExtractedItem[] = [];
  let totalPartsCost = 0;

  for (const pr of job.partRequests) {
    const inv = inventory.find(i => i.name.toLowerCase() === pr.partName.toLowerCase());
    const unitPrice = pr.unitCost ?? inv?.unitPrice ?? 0;
    const itemTotal = unitPrice * pr.quantity;
    totalPartsCost += itemTotal;

    const gstPercent = 18;
    const baseAmount = itemTotal / (1 + gstPercent / 100);
    const rate = baseAmount / pr.quantity;
    const cgst = parseFloat((baseAmount * 0.09).toFixed(2));
    const sgst = parseFloat((baseAmount * 0.09).toFixed(2));
    const taxAmount = parseFloat((cgst + sgst).toFixed(2));

    items.push({
      name: pr.partName,
      quantity: pr.quantity,
      rate: parseFloat(rate.toFixed(2)),
      taxRate: gstPercent,
      taxAmount,
      cgst,
      sgst,
      igst: 0,
      total: parseFloat((baseAmount + taxAmount).toFixed(2)),
    });
  }

  const revenue = job.actualCost ?? job.estimatedCost ?? 0;
  const serviceCharge = Math.max(revenue - totalPartsCost, 0);

  if (serviceCharge > 0) {
    const gstPercent = 18;
    const baseAmount = serviceCharge / (1 + gstPercent / 100);
    const cgst = parseFloat((baseAmount * 0.09).toFixed(2));
    const sgst = parseFloat((baseAmount * 0.09).toFixed(2));
    const taxAmount = parseFloat((cgst + sgst).toFixed(2));

    items.push({
      name: 'Service Charges',
      quantity: 1,
      rate: parseFloat(baseAmount.toFixed(2)),
      taxRate: gstPercent,
      taxAmount,
      cgst,
      sgst,
      igst: 0,
      total: parseFloat((baseAmount + taxAmount).toFixed(2)),
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const extractionResult: TallyExtractionResult = {
    invoiceNumber: job.invoiceNumber ?? `INV-${job.id.slice(-6).toUpperCase()}`,
    invoiceDate: (job.completedAt || job.updatedAt || new Date()).toISOString().slice(0, 10),
    gstNumber: 'UNKNOWN',
    customerName: job.customer.name,
    supplierName: 'FixHub Service Center',
    items,
    paymentMode: job.paymentMethod ?? 'Cash',
    totalAmount,
    confidence: 1.0,
  };

  const settings = await getTallySettings();
  const xml = buildVoucherXml(extractionResult, 'sales');

  const record = await prisma.tallyDocument.create({
    data: {
      fileName: `job-${job.id}-invoice.pdf`,
      documentType: 'invoice',
      extractedData: extractionResult as any,
      voucherType: 'sales',
      confidence: 1.0,
      status: 'pending',
      xmlPayload: xml,
      ownerId: job.engineerId || (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || '',
    },
  });

  if (settings.enabled) {
    const actor = { id: 'system', name: 'System Auto-Push', role: 'admin' };
    try {
      const pushResult = await pushToTally(xml, settings, actor, record.id);
      if (pushResult.success) {
        await prisma.tallyDocument.update({
          where: { id: record.id },
          data: {
            status: 'pushed',
            tallyResponse: pushResult.response ?? 'SUCCESS',
            retryCount: 0,
            nextRetryAt: null,
          },
        });
      } else {
        await scheduleRetryForFailedPush(record.id, 0);
      }
    } catch (pushErr) {
      console.error('[Tally Auto-Push] Failed to push job invoice:', pushErr);
      await scheduleRetryForFailedPush(record.id, 0);
    }
  }
}

// Start recurring Tally retry queue process in the background
const globalForTallyQueue = globalThis as unknown as {
  retryIntervalStarted?: boolean;
};

if (process.env.NODE_ENV === 'development' && !globalForTallyQueue.retryIntervalStarted) {
  globalForTallyQueue.retryIntervalStarted = true;
  setInterval(() => {
    processTallyRetryQueue().catch((err) => {
      console.error('Error in background Tally retry process:', err);
    });
  }, 60000);
}

