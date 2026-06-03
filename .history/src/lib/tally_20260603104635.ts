import { prisma } from './prisma';
import { writeAuditLog, AuditActor } from './auditLog';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

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

export function buildVoucherXml(
  extracted: TallyExtractionResult,
  voucherType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'journal'
) {
  const invoiceDate = new Date(extracted.invoiceDate).toISOString().slice(0, 10);
  const narration = `${voucherType === 'sales' ? 'Sales invoice' : voucherType === 'purchase' ? 'Purchase invoice' : 'Accounting entry'} for ${extracted.customerName || extracted.supplierName}`;
  const totalAmount = extracted.totalAmount ?? extracted.items.reduce((sum, item) => sum + item.total, 0);

  const lineItems = extracted.items.map((item, index) => {
    return `
        <ALLINVENTORYENTRIES.LIST>
          <BILLEDQTY>${item.quantity}</BILLEDQTY>
          <RATE>${item.rate.toFixed(2)}</RATE>
          <AMOUNT>${item.total.toFixed(2)}</AMOUNT>
          <ACCOUNTNAME>${escapeXml(item.name)}</ACCOUNTNAME>
          <VATEXPAMOUNT>${item.taxAmount.toFixed(2)}</VATEXPAMOUNT>
        </ALLINVENTORYENTRIES.LIST>`;
  }).join('');

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
          <VOUCHER VCHTYPE="${escapeXml(voucherType)}" ACTION="Create" OBJVIEW="Accounting Voucher">
            <DATE>${invoiceDate.replace(/-/g, '')}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>${escapeXml(voucherType)}</VOUCHERTYPENAME>
            <PARTYNAME>${escapeXml(extracted.customerName || extracted.supplierName)}</PARTYNAME>
            <GSTCLASS/>${lineItems}
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(extracted.customerName || extracted.supplierName)}</LEDGERNAME>
              <AMOUNT>${(voucherType === 'purchase' ? -totalAmount : totalAmount).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
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
  const invoiceNumber = findInvoiceNumber(text) ?? `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceDate = findInvoiceDate(text) ?? new Date().toISOString().slice(0, 10);
  const gstNumber = findGstNumber(text) ?? 'UNKNOWN';
  const supplierName = findSupplierName(text) ?? (documentType === 'supplier-bill' ? 'Global Parts Supplier' : 'FixHub Service Center');
  const customerName = findCustomerName(text) ?? (documentType === 'invoice' || documentType === 'receipt' ? 'Retained Customer' : 'FixHub Service Center');
  const items = extractLineItems(text);
  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const confidence = Math.min(0.99, Math.max(0.5, averageConfidence(text)));

  return {
    invoiceNumber,
    invoiceDate,
    gstNumber,
    customerName,
    supplierName,
    items,
    paymentMode: inferPaymentMode(text),
    totalAmount,
    confidence,
  };
}

async function parseDocumentText(fileName: string): Promise<string> {
  const tmpDir = path.join(process.cwd(), '.next', 'tally-temp');
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

function findInvoiceNumber(text: string): string | null {
  const patterns = [/invoice\s*no[:\-\s]*([A-Z0-9\-\/]+)/i, /inv\.?\s*#?[:\-\s]*([A-Z0-9\-\/]+)/i];
  return matchFirst(text, patterns);
}

function findInvoiceDate(text: string): string | null {
  const patterns = [/date[:\-\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/, /date[:\-\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i];
  const raw = matchFirst(text, patterns);
  if (!raw) return null;
  const normalized = raw.replace(/\//g, '-');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function findGstNumber(text: string): string | null {
  const match = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
  return match?.[1] ?? null;
}

function findSupplierName(text: string): string | null {
  const match = text.match(/supplier\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i);
  return match?.[1]?.trim() ?? null;
}

function findCustomerName(text: string): string | null {
  const match = text.match(/bill\s*to|ship\s*to|customer\s*[:\-\s]*([A-Za-z0-9 &'(),.-]+)/i);
  return match?.[1]?.trim() ?? null;
}

function extractLineItems(text: string): TallyExtractedItem[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const items: TallyExtractedItem[] = [];
  const itemPattern = /^([A-Za-z0-9 &'()+\-\/]+)\s+(\d+)\s+([0-9,.]+)\s+([0-9,.]+)$/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (!match) continue;
    const name = match[1].trim();
    const quantity = parseInt(match[2], 10);
    const rate = parseFloat(match[3].replace(/,/g, ''));
    const total = parseFloat(match[4].replace(/,/g, ''));
    if (Number.isFinite(quantity) && Number.isFinite(rate) && Number.isFinite(total)) {
      items.push({
        name,
        quantity,
        rate,
        taxAmount: parseFloat((total - rate * quantity).toFixed(2)) || 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total,
      });
    }
  }
  if (items.length > 0) return items;
  return [{ name: 'Services & Parts', quantity: 1, rate: 0, taxAmount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }];
}

function inferPaymentMode(text: string): string {
  if (/cash/i.test(text)) return 'Cash';
  if (/credit\s*card|debit\s*card|visa|mastercard|rupay/i.test(text)) return 'Card';
  if (/bank\s*transfer|upi|internet\s*banking|neft|rtgs/i.test(text)) return 'Bank Transfer';
  return 'Unknown';
}

function averageConfidence(text: string): number {
  return Math.min(0.99, Math.max(0.5, 0.7 + Math.min(0.25, text.length / 5000)));
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
  const customers = await prisma.customer.findMany({ where: { name: { contains: normalized, mode: 'insensitive' } }, take: 5 });
  const oneMatch = customers[0];

  return {
    suggestedLedger: oneMatch?.name ?? `${name} Ledger`,
    ledgerConfidence: oneMatch ? 0.92 : 0.48,
  };
}

export async function suggestStockMapping(itemName: string) {
  const normalized = itemName.trim().toLowerCase();
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

export async function testTallyConnection(settings: TallySettings) {
  if (!settings.enabled) {
    return { success: false, message: 'Tally sync is disabled in settings.' };
  }

  if (process.env.TALLY_MOCK === 'true' || settings.mockMode) {
    return { success: true, message: 'Mock Tally server is enabled. Connection is simulated as successful.' };
  }

  const url = `http://${settings.host}:${settings.port}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return { success: true, message: 'Connection to TallyPrime succeeded.' };
    }
    return { success: false, message: `Connection test failed with status ${response.status}.` };
  } catch (error) {
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
      extractedData: extract,
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
  const pendingReviews = await prisma.tallyDocument.count({ where: { status: 'pending' } });
  const failedEntries = await prisma.tallyDocument.count({ where: { status: 'failed' } });
  const successRate = totalDocuments > 0 ? Math.round((autoApproved / totalDocuments) * 100) : 0;

  return {
    totalDocuments,
    autoApproved,
    pendingReviews,
    failedEntries,
    successRate,
  };
}
