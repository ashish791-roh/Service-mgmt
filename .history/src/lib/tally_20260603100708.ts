import { prisma } from './prisma';
import { writeAuditLog, AuditActor } from './auditLog';

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
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
  const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const gstNumber = '27ABCDE1234F2Z5';
  const supplierName = documentType === 'supplier-bill' ? 'Global Parts Supplier' : 'FixHub Service Center';
  const customerName = documentType === 'invoice' || documentType === 'receipt' ? 'Ravi Enterprises' : 'FixHub Service Center';
  const items = [
    {
      name: base.includes('battery') ? 'Battery Replacement' : 'Spare Part Service',
      quantity: 1,
      rate: 4200,
      taxAmount: 756,
      cgst: 378,
      sgst: 378,
      igst: 0,
      total: 4956,
    },
    {
      name: 'Inspection Fee',
      quantity: 1,
      rate: 600,
      taxAmount: 108,
      cgst: 54,
      sgst: 54,
      igst: 0,
      total: 708,
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const confidence = documentType === 'gst-invoice' ? 0.96 : 0.88;

  return {
    invoiceNumber,
    invoiceDate,
    gstNumber,
    customerName,
    supplierName,
    items,
    paymentMode: 'Bank Transfer',
    totalAmount,
    confidence,
  };
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
  };
}

export async function saveTallySettings(settings: Partial<TallySettings>) {
  const data = {
    enabled: settings.enabled ?? DEFAULT_SETTINGS.enabled,
    host: settings.host ?? DEFAULT_SETTINGS.host,
    port: settings.port ?? DEFAULT_SETTINGS.port,
    companyName: settings.companyName ?? DEFAULT_SETTINGS.companyName,
    syncStatus: settings.syncStatus ?? DEFAULT_SETTINGS.syncStatus,
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

  if (process.env.NODE_ENV !== 'production' || process.env.TALLY_MOCK === 'true') {
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

  if (process.env.NODE_ENV !== 'production' || process.env.TALLY_MOCK === 'true') {
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
