import { prisma } from './prisma';
import { writeAuditLog, AuditActor } from './auditLog';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { BUSINESS_INFO } from './businessConfig';
import { getBusinessConfig } from './businessConfigServer';
import { SLATier, DEFAULT_SLA_TIERS } from './sla';

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
  customerGstin?: string;
  supplierGstin?: string;
}

export interface TallySettings {
  enabled: boolean;
  host: string;
  port: number;
  companyName: string;
  syncStatus?: string;
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

import crypto from 'crypto';

export function buildVoucherXml(
  extracted: TallyExtractionResult,
  voucherType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'journal',
  documentId: string = randomUUID()
) {
  const mappedVchType = VOUCHER_TYPE_MAPPING[voucherType] || voucherType;
  const invoiceDate = new Date(extracted.invoiceDate).toISOString().slice(0, 10);
  const narration = `${voucherType === 'sales' ? 'Sales invoice' : voucherType === 'purchase' ? 'Purchase invoice' : voucherType === 'receipt' ? 'Payment receipt reconciliation' : 'Accounting entry'} for ${extracted.customerName || extracted.supplierName}`;
  const totalAmount = extracted.totalAmount ?? extracted.items.reduce((sum, item) => sum + item.total, 0);

  // Generate deterministic GUID
  const hash = crypto.createHash('sha1').update(documentId).digest('hex');
  const part1 = hash.substring(0, 8);
  const part2 = hash.substring(8, 12);
  const part3 = '5' + hash.substring(13, 16);
  const variantDigit = (parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16);
  const part4 = variantDigit + hash.substring(17, 20);
  const part5 = hash.substring(20, 32);
  const guid = `${part1}-${part2}-${part3}-${part4}-${part5}`;

  const partyGstin = voucherType === 'sales' ? extracted.customerGstin : (voucherType === 'purchase' ? (extracted.supplierGstin || extracted.gstNumber) : undefined);
  const gstRegistrationType = partyGstin ? 'Regular' : 'Consumer';

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

  if (voucherType === 'receipt') {
    const isCash = extracted.paymentMode?.toLowerCase() === 'cash';
    const bankOrCashLedger = isCash ? 'Cash' : 'Bank';

    // Credit Customer: negative amount
    const partyAmount = (-totalAmount).toFixed(2);
    ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(partyName)}</LEDGERNAME>
              <AMOUNT>${partyAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;

    // Debit Bank/Cash: positive amount
    const bankOrCashAmount = totalAmount.toFixed(2);
    ledgerEntries += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(bankOrCashLedger)}</LEDGERNAME>
              <AMOUNT>${bankOrCashAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  } else {
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
            <GUID>${escapeXml(guid)}</GUID>
            <DATE>${invoiceDate.replace(/-/g, '')}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>${escapeXml(mappedVchType)}</VOUCHERTYPENAME>
            <PARTYNAME>${escapeXml(partyName)}</PARTYNAME>
            <GSTCLASS/>
            <GSTREGISTRATIONTYPE>${escapeXml(gstRegistrationType)}</GSTREGISTRATIONTYPE>
            ${partyGstin ? `<PARTYGSTIN>${escapeXml(partyGstin)}</PARTYGSTIN>` : ''}
            ${lineItems}${ledgerEntries}
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

export { validateGstinChecksum } from './gst';

export function findSupplierName(text: string): string | null {
  const patterns = [
    /(?:supplier|seller|billed\s*from|service\s*provider|vendor|from)\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i,
    /(?:supplier|seller|vendor)\s*details\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:supplier|seller|billed\s*from|service\s*provider|vendor|from)[:\-\s]*$/i.test(line)) {
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const nextLine = lines[j];
        if (nextLine && !/gstin|date|invoice|phone|tel|email/i.test(nextLine)) {
          return nextLine.trim();
        }
      }
    }
  }

  return null;
}

export function findCustomerName(text: string): string | null {
  const patterns = [
    /(?:bill\s*to|ship\s*to|customer|buyer|consignee|billed\s*to|client|to)\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i,
    /(?:buyer|consignee|client)\s*details\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:buyer|consignee|bill\s*to|ship\s*to|billed\s*to|client|to)[:\-\s]*$/i.test(line)) {
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const nextLine = lines[j];
        if (nextLine && !/gstin|date|invoice|phone|tel|email/i.test(nextLine)) {
          return nextLine.trim();
        }
      }
    }
  }

  return null;
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
): Promise<{ success: boolean; message: string; response: string | null }> {
  if (!settings.enabled) {
    return { success: false, message: 'Tally sync is disabled.', response: null };
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      signal: controller.signal,
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

    const hasErrors = /<ERRORS>\s*([1-9]\d*)\s*<\/ERRORS>/i.test(text) ||
                      /<LINEERROR[^>]*>([\s\S]*?)<\/LINEERROR>/i.test(text);

    let errorMessage = '';
    const lineErrorMatch = text.match(/<LINEERROR[^>]*>([\s\S]*?)<\/LINEERROR>/i);
    if (lineErrorMatch) {
      errorMessage = lineErrorMatch[1].trim();
    }

    const success = response.ok && !hasErrors;
    const message = success
      ? 'TallyPrime accepted the XML payload.'
      : (errorMessage ? `Tally error: ${errorMessage}` : `Push failed (Tally returned error nodes or status ${response.status}).`);

    return {
      success,
      message,
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
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getExtractedData(doc: { extractedData: any }): TallyExtractionResult {
  return doc.extractedData as unknown as TallyExtractionResult;
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

  // Compile extended dashboard stats from TallyQueueItem
  const completedQueue = prisma.tallyQueueItem
    ? await prisma.tallyQueueItem.findMany({
        where: { status: 'completed' },
        select: { createdAt: true, updatedAt: true },
      })
    : [];

  let averageSyncTime = 0; // in seconds
  if (completedQueue.length > 0) {
    const totalDuration = completedQueue.reduce((sum: number, item: any) => {
      const duration = (item.updatedAt.getTime() - item.createdAt.getTime()) / 1000;
      return sum + Math.max(0, duration);
    }, 0);
    averageSyncTime = Math.round(totalDuration / completedQueue.length);
  }

  // Each sync saves ~5 minutes (300 seconds) of manual entry
  const completedCount = prisma.tallyQueueItem
    ? await prisma.tallyQueueItem.count({ where: { status: 'completed' } })
    : 0;
  const timeSavedMinutes = (pushed + completedCount) * 5;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = prisma.tallyQueueItem
    ? await prisma.tallyQueueItem.count({
        where: {
          status: 'completed',
          updatedAt: { gte: todayStart },
        },
      })
    : 0;

  const recentQueue = prisma.tallyQueueItem
    ? await prisma.tallyQueueItem.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
      })
    : [];

  const recentDocs = await prisma.tallyDocument.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const recentActivity = [
    ...recentQueue.map((q: any) => ({
      id: q.id,
      type: 'queue',
      entityType: q.entityType,
      actionType: q.actionType,
      status: q.status,
      timestamp: q.updatedAt.toISOString(),
      message: q.errorMessage || `Synced ${q.entityType} (${q.actionType})`,
    })),
    ...recentDocs.map((d: any) => ({
      id: d.id,
      type: 'document',
      entityType: d.documentType,
      actionType: d.voucherType,
      status: d.status,
      timestamp: d.updatedAt.toISOString(),
      message: d.tallyResponse || `Processed ${d.fileName}`,
    })),
  ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  return {
    totalDocuments,
    autoApproved,
    pushed,
    pendingReviews,
    failedEntries,
    successRate,
    averageSyncTime,
    timeSavedMinutes,
    todayCount,
    recentActivity,
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
        xml = buildVoucherXml(getExtractedData(doc), doc.voucherType as any, doc.id);
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

export async function pushReceiptToTally(jobId: string) {
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

  const businessConfig = await getBusinessConfig();
  const revenue = job.actualCost ?? job.estimatedCost ?? 0;
  if (revenue <= 0) return;

  const extractionResult: TallyExtractionResult = {
    invoiceNumber: job.invoiceNumber ? `${job.invoiceNumber}-REC` : `REC-${job.id.slice(-6).toUpperCase()}`,
    invoiceDate: (job.completedAt || job.updatedAt || new Date()).toISOString().slice(0, 10),
    gstNumber: businessConfig.gstin,
    customerName: job.customer.name,
    customerGstin: job.customer.gstin || undefined,
    supplierName: businessConfig.shopName,
    items: [],
    paymentMode: job.paymentMethod ?? 'Cash',
    totalAmount: revenue,
    confidence: 1.0,
  };

  const settings = await getTallySettings();
  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'receipt', recordId);

  // Check if a receipt tally document already exists to prevent duplication
  const existingDoc = await prisma.tallyDocument.findFirst({
    where: { fileName: `job-${job.id}-receipt.pdf` }
  });
  if (existingDoc) return;

  const record = await prisma.tallyDocument.create({
    data: {
      id: recordId,
      fileName: `job-${job.id}-receipt.pdf`,
      documentType: 'receipt',
      extractedData: extractionResult as any,
      voucherType: 'receipt',
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
      console.error('[Tally Auto-Push Receipt] Failed:', pushErr);
      await scheduleRetryForFailedPush(record.id, 0);
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

  const businessConfig = await getBusinessConfig();
  const slaConfig = await prisma.sLAConfig.findUnique({ where: { id: 'sla-config' } });
  const tiers = (slaConfig?.tiers as unknown as SLATier[]) || DEFAULT_SLA_TIERS;
  const devType = job.device?.type || '';
  const matchedTier = tiers.find(t => t.deviceType && t.deviceType.toLowerCase() === devType.toLowerCase()) || 
                      tiers.find(t => t.deviceType && t.deviceType.toLowerCase() === 'other');
  const customGstRate = matchedTier?.taxRate !== undefined ? matchedTier.taxRate : businessConfig.taxRate;

  const inventory = await prisma.inventoryItem.findMany();
  const items: TallyExtractedItem[] = [];
  let totalPartsCost = 0;

  for (const pr of job.partRequests) {
    const inv = inventory.find((i: any) => i.name.toLowerCase() === pr.partName.toLowerCase());
    const unitPrice = pr.unitCost ?? inv?.unitPrice ?? 0;
    const itemTotal = unitPrice * pr.quantity;
    totalPartsCost += itemTotal;

    const gstPercent = customGstRate;
    const baseAmount = itemTotal / (1 + gstPercent / 100);
    const rate = baseAmount / pr.quantity;
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
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
  totalPartsCost = items.reduce((sum, item) => sum + item.total, 0); // compute based on calculated totals
  const serviceCharge = Math.max(revenue - totalPartsCost, 0);

  if (serviceCharge > 0) {
    const gstPercent = customGstRate;
    const baseAmount = serviceCharge / (1 + gstPercent / 100);
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
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
    gstNumber: businessConfig.gstin,
    customerName: job.customer.name,
    customerGstin: job.customer.gstin || undefined,
    supplierName: businessConfig.shopName,
    items,
    paymentMode: job.paymentMethod ?? 'Cash',
    totalAmount,
    confidence: 1.0,
  };

  const settings = await getTallySettings();
  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'sales', recordId);

  // Check if a sales tally document already exists to prevent duplication
  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `job-${job.id}-invoice.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
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
  }

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

        // Trigger Receipt voucher push
        if (job.status === 'Delivered') {
          await pushReceiptToTally(job.id);
        }
      } else {
        await scheduleRetryForFailedPush(record.id, 0);
      }
    } catch (pushErr) {
      console.error('[Tally Auto-Push] Failed to push job invoice:', pushErr);
      await scheduleRetryForFailedPush(record.id, 0);
    }
  } else {
    // If sync disabled but Delivered, still create the receipt document
    if (job.status === 'Delivered') {
      await pushReceiptToTally(job.id);
    }
  }
}

// Start recurring Tally retry queue process in the background
// Start recurring Tally retry queue process in the background
const globalForTallyQueue = globalThis as unknown as {
  retryIntervalStarted?: boolean;
};

if (!globalForTallyQueue.retryIntervalStarted) {
  globalForTallyQueue.retryIntervalStarted = true;
  setInterval(() => {
    processTallyRetryQueue().catch((err) => {
      console.error('Error in background Tally retry process:', err);
    });
  }, 60000);
}

// ── NEW ADDITIVE ENTERPRISE TALLY MASTER XML BUILDERS ─────────────────────────

export function buildCustomerLedgerXml(name: string, gstin?: string): string {
  const customerName = name.trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(customerName)}" ACTION="Create">
            <NAME>${escapeXml(customerName)}</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
            <GSTREGISTRATIONTYPE>${gstin ? 'Regular' : 'Consumer'}</GSTREGISTRATIONTYPE>
            ${gstin ? `<PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>` : ''}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function buildSupplierLedgerXml(name: string, gstin?: string): string {
  const supplierName = name.trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(supplierName)}" ACTION="Create">
            <NAME>${escapeXml(supplierName)}</NAME>
            <PARENT>Sundry Creditors</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
            <GSTREGISTRATIONTYPE>${gstin ? 'Regular' : 'Consumer'}</GSTREGISTRATIONTYPE>
            ${gstin ? `<PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>` : ''}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function buildStockItemXml(name: string, quantity: number, unitPrice: number): string {
  const itemName = name.trim();
  const value = quantity * unitPrice;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${escapeXml(itemName)}" ACTION="Create">
            <NAME>${escapeXml(itemName)}</NAME>
            <BASEUNITS>Nos</BASEUNITS>
            <OPENINGBALANCE>${quantity}</OPENINGBALANCE>
            <OPENINGVALUE>${value.toFixed(2)}</OPENINGVALUE>
            <OPENINGRATE>${unitPrice.toFixed(2)}</OPENINGRATE>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function buildExpenseVoucherXml(expense: { description: string; amount: number; category: string; paymentMethod: string; date: Date }): string {
  const expenseDate = new Date(expense.date).toISOString().slice(0, 10);
  const narration = `Expense payment: ${expense.description}`;
  const guid = randomUUID();
  const isCash = expense.paymentMethod.toLowerCase() === 'cash';
  const bankOrCashLedger = isCash ? 'Cash' : 'Bank';
  
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
          <VOUCHER VCHTYPE="Payment" ACTION="Create" OBJVIEW="Accounting Voucher">
            <GUID>${escapeXml(guid)}</GUID>
            <DATE>${expenseDate.replace(/-/g, '')}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
            <PARTYNAME>${escapeXml(bankOrCashLedger)}</PARTYNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(expense.category)}</LEDGERNAME>
              <AMOUNT>${expense.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(bankOrCashLedger)}</LEDGERNAME>
              <AMOUNT>${(-expense.amount).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ── DOCUMENT GENERATORS FOR INTEGRATION MODULES ──────────────────────────────────

export async function generateJobInvoiceDocument(jobId: string) {
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
  if (!job) throw new Error('Job not found');

  const businessConfig = await getBusinessConfig();
  const slaConfig = await prisma.sLAConfig.findUnique({ where: { id: 'sla-config' } });
  const tiers = (slaConfig?.tiers as unknown as SLATier[]) || DEFAULT_SLA_TIERS;
  const devType = job.device?.type || '';
  const matchedTier = tiers.find(t => t.deviceType && t.deviceType.toLowerCase() === devType.toLowerCase()) || 
                      tiers.find(t => t.deviceType && t.deviceType.toLowerCase() === 'other');
  const customGstRate = matchedTier?.taxRate !== undefined ? matchedTier.taxRate : businessConfig.taxRate;

  const inventory = await prisma.inventoryItem.findMany();
  const items: TallyExtractedItem[] = [];
  let totalPartsCost = 0;

  for (const pr of job.partRequests) {
    const inv = inventory.find((i: any) => i.name.toLowerCase() === pr.partName.toLowerCase());
    const unitPrice = pr.unitCost ?? inv?.unitPrice ?? 0;
    const itemTotal = unitPrice * pr.quantity;
    totalPartsCost += itemTotal;

    const gstPercent = customGstRate;
    const baseAmount = itemTotal / (1 + gstPercent / 100);
    const rate = baseAmount / pr.quantity;
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
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
  totalPartsCost = items.reduce((sum, item) => sum + item.total, 0);
  const serviceCharge = Math.max(revenue - totalPartsCost, 0);

  if (serviceCharge > 0) {
    const gstPercent = customGstRate;
    const baseAmount = serviceCharge / (1 + gstPercent / 100);
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
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
    gstNumber: businessConfig.gstin,
    customerName: job.customer.name,
    customerGstin: job.customer.gstin || undefined,
    supplierName: businessConfig.shopName,
    items,
    paymentMode: job.paymentMethod ?? 'Cash',
    totalAmount,
    confidence: 1.0,
  };

  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'sales', recordId);

  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `job-${job.id}-invoice.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
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
  } else {
    record = await prisma.tallyDocument.update({
      where: { id: record.id },
      data: { xmlPayload: xml },
    });
  }

  return record;
}

export async function generateSaleInvoiceDocument(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true }
  });
  if (!sale) throw new Error('Sale not found');

  const businessConfig = await getBusinessConfig();
  let customerGstin: string | undefined;
  let customerName = sale.companyName || sale.contactName || 'Counter Sale Customer';

  if (sale.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });
    if (customer) {
      customerName = customer.name;
      customerGstin = customer.gstin || undefined;
    }
  }

  const gstPercent = businessConfig.taxRate;
  const items: TallyExtractedItem[] = sale.items.map((item: any) => {
    const itemTotal = item.subtotal;
    const baseAmount = itemTotal / (1 + gstPercent / 100);
    const rate = baseAmount / item.quantity;
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const taxAmount = parseFloat((cgst + sgst).toFixed(2));

    return {
      name: item.itemName,
      quantity: item.quantity,
      rate: parseFloat(rate.toFixed(2)),
      taxRate: gstPercent,
      taxAmount,
      cgst,
      sgst,
      igst: 0,
      total: parseFloat((baseAmount + taxAmount).toFixed(2)),
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const extractionResult: TallyExtractionResult = {
    invoiceNumber: sale.saleNumber,
    invoiceDate: sale.createdAt.toISOString().slice(0, 10),
    gstNumber: businessConfig.gstin,
    customerName,
    customerGstin,
    supplierName: businessConfig.shopName,
    items,
    paymentMode: sale.paidAt ? 'Cash' : 'Credit',
    totalAmount,
    confidence: 1.0,
  };

  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'sales', recordId);

  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `sale-${sale.id}-invoice.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
        fileName: `sale-${sale.id}-invoice.pdf`,
        documentType: 'invoice',
        extractedData: extractionResult as any,
        voucherType: 'sales',
        confidence: 1.0,
        status: 'pending',
        xmlPayload: xml,
        ownerId: sale.createdById || (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || '',
      },
    });
  } else {
    record = await prisma.tallyDocument.update({
      where: { id: record.id },
      data: { xmlPayload: xml },
    });
  }

  return record;
}

export async function generatePaymentReceiptDocument(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { job: { include: { customer: true } } }
  });
  if (!payment) throw new Error('Payment not found');

  const businessConfig = await getBusinessConfig();
  const job = payment.job;
  
  const extractionResult: TallyExtractionResult = {
    invoiceNumber: job.invoiceNumber ? `${job.invoiceNumber}-REC` : `REC-${job.id.slice(-6).toUpperCase()}`,
    invoiceDate: payment.createdAt.toISOString().slice(0, 10),
    gstNumber: businessConfig.gstin,
    customerName: job.customer.name,
    customerGstin: job.customer.gstin || undefined,
    supplierName: businessConfig.shopName,
    items: [],
    paymentMode: job.paymentMethod || 'Cash',
    totalAmount: payment.totalBill,
    confidence: 1.0,
  };

  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'receipt', recordId);

  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `payment-${payment.id}-receipt.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
        fileName: `payment-${payment.id}-receipt.pdf`,
        documentType: 'receipt',
        extractedData: extractionResult as any,
        voucherType: 'receipt',
        confidence: 1.0,
        status: 'pending',
        xmlPayload: xml,
        ownerId: job.engineerId || (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || '',
      },
    });
  } else {
    record = await prisma.tallyDocument.update({
      where: { id: record.id },
      data: { xmlPayload: xml },
    });
  }

  return record;
}

export async function generatePurchaseDocument(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true }
  });
  if (!purchase) throw new Error('Purchase not found');

  const businessConfig = await getBusinessConfig();
  let supplierGstin: string | undefined;
  if (purchase.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: purchase.supplierId } });
    if (supplier) supplierGstin = supplier.gstin || undefined;
  }

  const gstPercent = businessConfig.taxRate;
  const items: TallyExtractedItem[] = purchase.items.map((item: any) => {
    const itemTotal = item.subtotal;
    const baseAmount = itemTotal / (1 + gstPercent / 100);
    const rate = baseAmount / item.quantity;
    const halfRate = gstPercent / 2 / 100;
    const cgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const sgst = parseFloat((baseAmount * halfRate).toFixed(2));
    const taxAmount = parseFloat((cgst + sgst).toFixed(2));

    return {
      name: item.itemName,
      quantity: item.quantity,
      rate: parseFloat(rate.toFixed(2)),
      taxRate: gstPercent,
      taxAmount,
      cgst,
      sgst,
      igst: 0,
      total: parseFloat((baseAmount + taxAmount).toFixed(2)),
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const extractionResult: TallyExtractionResult = {
    invoiceNumber: purchase.purchaseNumber,
    invoiceDate: purchase.createdAt.toISOString().slice(0, 10),
    gstNumber: businessConfig.gstin,
    customerName: businessConfig.shopName,
    supplierName: purchase.supplierName,
    supplierGstin,
    items,
    paymentMode: 'Credit',
    totalAmount,
    confidence: 1.0,
  };

  const recordId = randomUUID();
  const xml = buildVoucherXml(extractionResult, 'purchase', recordId);

  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `purchase-${purchase.id}-invoice.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
        fileName: `purchase-${purchase.id}-invoice.pdf`,
        documentType: 'supplier-bill',
        extractedData: extractionResult as any,
        voucherType: 'purchase',
        confidence: 1.0,
        status: 'pending',
        xmlPayload: xml,
        ownerId: (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || '',
      },
    });
  } else {
    record = await prisma.tallyDocument.update({
      where: { id: record.id },
      data: { xmlPayload: xml },
    });
  }

  return record;
}

export async function generateWarrantyClaimDocument(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      customer: true,
      device: true,
      partRequests: { where: { status: 'Approved' } }
    }
  });
  if (!job) throw new Error('Job not found');

  const businessConfig = await getBusinessConfig();
  const inventory = await prisma.inventoryItem.findMany();
  
  let totalCost = 0;
  for (const pr of job.partRequests) {
    const inv = inventory.find((i: any) => i.name.toLowerCase() === pr.partName.toLowerCase());
    const unitPrice = pr.unitCost ?? inv?.unitPrice ?? 0;
    totalCost += unitPrice * pr.quantity;
  }

  const recordId = randomUUID();
  const expenseDate = (job.completedAt || new Date()).toISOString().slice(0, 10);
  const narration = `Warranty claim settlement for Job #${job.invoiceNumber || job.id}`;
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
          <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher">
            <GUID>${escapeXml(recordId)}</GUID>
            <DATE>${expenseDate.replace(/-/g, '')}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Warranty Expense</LEDGERNAME>
              <AMOUNT>${totalCost.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales</LEDGERNAME>
              <AMOUNT>${(-totalCost).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  let record = await prisma.tallyDocument.findFirst({
    where: { fileName: `job-${job.id}-warranty-claim.pdf` }
  });

  if (!record) {
    record = await prisma.tallyDocument.create({
      data: {
        id: recordId,
        fileName: `job-${job.id}-warranty-claim.pdf`,
        documentType: 'receipt',
        extractedData: {
          invoiceNumber: job.invoiceNumber || `WRN-${job.id.slice(-6).toUpperCase()}`,
          invoiceDate: expenseDate,
          gstNumber: businessConfig.gstin,
          customerName: job.customer.name,
          supplierName: businessConfig.shopName,
          items: [],
          paymentMode: 'Journal',
          totalAmount: totalCost,
          confidence: 1.0,
        } as any,
        voucherType: 'journal',
        confidence: 1.0,
        status: 'pending',
        xmlPayload: xml,
        ownerId: job.engineerId || (await prisma.user.findFirst({ where: { role: 'admin' } }))?.id || '',
      },
    });
  } else {
    record = await prisma.tallyDocument.update({
      where: { id: record.id },
      data: { xmlPayload: xml },
    });
  }

  return record;
}

// ── COMPLIANCE, DUPLICATES, AND COMPANION METRICS ─────────────────────────────────

export async function suggestSupplierMapping(name: string) {
  const normalized = name.trim().toLowerCase();
  const tallyLedger = await prisma.tallyLedger.findFirst({
    where: { name: { contains: normalized, mode: 'insensitive' }, type: 'ledger' }
  });
  if (tallyLedger) {
    return {
      suggestedLedger: tallyLedger.name,
      ledgerConfidence: 0.95,
    };
  }
  const suppliers = await prisma.supplier.findMany({
    where: { name: { contains: normalized, mode: 'insensitive' } },
    take: 5
  });
  const oneMatch = suppliers[0];
  return {
    suggestedLedger: oneMatch?.name ?? `${name} Supplier Ledger`,
    ledgerConfidence: oneMatch ? 0.92 : 0.48,
  };
}

export async function detectDuplicateInvoice(invoiceNumber: string, invoiceDate: string, docId?: string) {
  const duplicate = await prisma.tallyDocument.findFirst({
    where: {
      status: 'pushed',
      id: docId ? { not: docId } : undefined,
      AND: [
        { extractedData: { path: ['invoiceNumber'], equals: invoiceNumber } },
        { extractedData: { path: ['invoiceDate'], equals: invoiceDate } },
      ],
    },
  });
  return !!duplicate;
}

export function checkGstMismatch(customerGstin: string | undefined, items: TallyExtractedItem[]): { hasMismatch: boolean; message?: string } {
  if (!customerGstin || customerGstin === 'UNKNOWN') return { hasMismatch: false };
  const businessState = BUSINESS_INFO.gstin.slice(0, 2);
  const customerState = customerGstin.slice(0, 2);
  const isIntrastate = businessState === customerState;

  let hasCgstSgst = false;
  let hasIgst = false;
  for (const item of items) {
    if ((item.cgst && item.cgst > 0) || (item.sgst && item.sgst > 0)) hasCgstSgst = true;
    if (item.igst && item.igst > 0) hasIgst = true;
  }

  if (isIntrastate && hasIgst) {
    return {
      hasMismatch: true,
      message: 'Intrastate transaction: Customer GSTIN state matches business, but IGST was charged instead of CGST/SGST.',
    };
  }
  if (!isIntrastate && hasCgstSgst) {
    return {
      hasMismatch: true,
      message: 'Interstate transaction: Customer GSTIN state does not match business, but CGST/SGST was charged instead of IGST.',
    };
  }
  return { hasMismatch: false };
}


