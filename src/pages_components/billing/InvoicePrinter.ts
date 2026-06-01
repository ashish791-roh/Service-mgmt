import type { Job, Customer, Device, User, PartRequest, InventoryItem, Sale } from '../../types';
import { BUSINESS_INFO } from '../../lib/businessConfig';

// ── Number to Words Converter for Indian Rupees ─────────────────────────────
export function toIndianWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Rupees Zero Only';

  const g = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  };

  const h = (n: number): string => {
    if (n < 100) return g(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return a[hundred] + ' Hundred' + (rest ? ' ' + g(rest) : '');
  };

  let str = '';
  let n = Math.floor(num);

  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  if (crores) str += h(crores) + ' Crore ';

  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  if (lakhs) str += h(lakhs) + ' Lakh ';

  const thousands = Math.floor(n / 1000);
  n %= 1000;
  if (thousands) str += h(thousands) + ' Thousand ';

  if (n) str += h(n);

  return 'Rupees ' + str.trim() + ' Only';
}

// ── SVG Icons ───────────────────────────────────────────────────────────────
const ICONS = {
  phone: `<svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 9.09v7.83z"/></svg>`,
  email: `<svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  location: `<svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  gst: `<svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`
};

// ── Shared Layout Builders ──────────────────────────────────────────────────
function buildCommonStyle(): string {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      color: #111827;
      background: #fff;
      padding: 40px;
      max-width: 740px;
      margin: 0 auto;
      font-size: 13px;
      line-height: 1.5;
    }
    * { box-sizing: border-box; }
    table { border-collapse: collapse; }
    .no-print { display: none !important; }
    @media print {
      body { margin: 0; padding: 24px; background: #fff; color: #000; }
      .no-print { display: none !important; }
      @page { margin: 1.2cm; }
      tr { page-break-inside: avoid; }
      .avoid-break { page-break-inside: avoid; page-break-before: avoid; }
    }
    .svg-icon {
      display: inline-block;
      vertical-align: middle;
      margin-right: 4px;
      color: #4b5563;
    }
  `;
}

function buildPrintButton(): string {
  return `
    <button class="no-print" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#111827;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);z-index:99;display:flex;align-items:center;gap:6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print / Save PDF
    </button>
  `;
}

function buildHeader(
  invoiceLabel: string,
  invoiceNumber: string,
  paymentStatus: string,
  paymentColors: { bg: string; text: string; border: string },
  issueDate: string,
  dueDate: string,
  logoUrl?: string
): string {
  const logoContent = logoUrl
    ? `<img src="${logoUrl}" height="48" style="object-fit:contain; max-height:48px; display:block;" alt="${BUSINESS_INFO.shopName}">`
    : `<h1 style="font-size:30px;font-weight:800;margin:0;letter-spacing:-1px;color:#111827;line-height:1;">${BUSINESS_INFO.shopName}</h1>`;

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #111827;">
      <div>
        ${logoContent}
        <p style="margin:6px 0 0;font-size:11px;color:#4b5563;line-height:1.5;">
          ${ICONS.location} ${BUSINESS_INFO.address}<br/>
          ${ICONS.phone} ${BUSINESS_INFO.phone} &nbsp;&middot;&nbsp; ${ICONS.email} ${BUSINESS_INFO.email}<br/>
          ${ICONS.gst} <strong>GSTIN:</strong> ${BUSINESS_INFO.gstin}
        </p>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:20px;">
        <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-bottom:6px;">
          <p style="font-size:24px;font-weight:800;margin:0;color:#1d4ed8;letter-spacing:-0.5px;text-transform:uppercase;line-height:1;">${invoiceLabel}</p>
          <span style="background:${paymentColors.bg};color:${paymentColors.text};border:1px solid ${paymentColors.border};font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.05em;line-height:1;">${paymentStatus}</span>
        </div>
        <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:#111827;">Invoice #: ${invoiceNumber}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#4b5563;line-height:1.4;">
          <strong>Invoice Date:</strong> ${issueDate}<br/>
          <strong>Due Date:</strong> ${dueDate}
        </p>
      </div>
    </div>
  `;
}

interface CostBreakdown {
  serviceCharge: number;
  partsCost: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  finalCost: number;
  advanceAmount?: number;
}

function buildCostSummary(
  breakdown: CostBreakdown,
  paymentStatus: string,
  paymentColor: string,
  paymentMethod?: string | null
): string {
  const { serviceCharge, partsCost, cgst, sgst, finalCost, advanceAmount = 0 } = breakdown;
  const balanceDue = Math.max(finalCost - advanceAmount, 0);
  const words = toIndianWords(finalCost);

  const advanceSection = advanceAmount > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#16a34a;">
      <span>Advance Paid</span>
      <span style="font-weight:600;">− ₹${advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-top:4px;">
      <span style="font-size:13px;font-weight:600;color:#15803d;">Balance Due</span>
      <span style="font-size:16px;font-weight:800;color:#15803d;">₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
  ` : '';

  const paymentMethodLabel = paymentMethod 
    ? `<span style="color:#4b5563; font-weight:normal;"> via ${paymentMethod}</span>` 
    : '';

  return `
    <div style="margin-top:24px; display:flex; justify-content:flex-end;" class="avoid-break">
      <div style="width:300px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#4b5563;">
          <span>Labour / Service Charge</span>
          <span style="font-weight:500;color:#111827;">₹${serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#4b5563;">
          <span>Parts &amp; Components</span>
          <span style="font-weight:500;color:#111827;">₹${partsCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#4b5563;">
          <span>CGST (9%)</span>
          <span style="font-weight:500;color:#111827;">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#4b5563;">
          <span>SGST (9%)</span>
          <span style="font-weight:500;color:#111827;">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div style="border-top:1px solid #e5e7eb;margin:6px 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#111827;border-radius:6px;">
          <span style="font-size:13px;font-weight:600;color:#fff;">Total Amount (Tax Incl.)</span>
          <span style="font-size:18px;font-weight:800;color:#fff;">₹${finalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <p style="font-size:10px;color:#6b7280;text-align:right;margin:4px 0 8px;font-style:italic;line-height:1.2;">
          ${words}
        </p>
        ${advanceSection}
        <p style="font-size:11px;color:#6b7280;text-align:right;margin:6px 0 0;">
          Payment Status: <strong style="color:${paymentColor}; text-transform:uppercase;">${paymentStatus}${paymentMethodLabel}</strong>
        </p>
      </div>
    </div>
  `;
}

function buildFooter(invoiceNumber: string, printDate: string, printTime: string, hasQr: boolean): string {
  const termsSection = `
    <div style="margin-top:24px; padding:12px 14px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; font-size:10.5px; color:#4b5563; line-height:1.45;" class="avoid-break">
      <strong style="color:#111827; font-size:11px; display:block; margin-bottom:4px;">Terms &amp; Conditions</strong>
      1. All warranty claims are subject to standard warranty configurations. No warranty on physical or liquid damage.<br/>
      2. Spare parts once installed cannot be returned or refunded.<br/>
      3. Devices not collected within 30 days of repair completion will be disposed of at owner's risk.<br/>
      4. This is a computer-generated invoice and requires no physical signature.
    </div>
  `;

  return `
    ${termsSection}
    
    <div style="margin-top:24px; padding-top:14px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;" class="avoid-break">
      <div>
        <p style="font-size:11px; color:#9ca3af; margin:0;">Thank you for your business.</p>
        <p style="font-size:9px; color:#d1d5db; margin:2px 0 0;">Printed on ${printDate} at ${printTime}</p>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        ${hasQr ? '<div id="invoice-qrcode" style="padding:4px; border:1px solid #e5e7eb; border-radius:4px; background:#fff; width:64px; height:64px;"></div>' : ''}
        <p style="font-size:10px; color:#9ca3af; text-align:right; margin:0;">
          Ref: #${invoiceNumber}<br/>
          <span style="font-size:9px; color:#d1d5db;">FixHub Tech Support</span>
        </p>
      </div>
    </div>
  `;
}

function initQrScript(trackingUrl: string): string {
  return `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha512-CNgIRecGo7nOMdBmYBStWJtIE0Cz161vC31zWnYUNn3eDQWzJCnD87XsWHMUcYBP6WLTUMGBjSD7DN784HEwCA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script>
      window.onload = function() {
        const qrEl = document.getElementById('invoice-qrcode');
        if (qrEl) {
          new QRCode(qrEl, {
            text: "${trackingUrl}",
            width: 56,
            height: 56,
            colorDark : "#111827",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
          });
        }
      }
    </script>
  `;
}

// ── Print Functions ─────────────────────────────────────────────────────────

export function printInvoice(params: {
  job: Job & { problemDesc?: string; invoiceNumber?: string | null; paymentMethod?: string | null };
  customer?: Customer;
  device?: Device;
  engineer?: User;
  approvedParts: PartRequest[];
  inventory: InventoryItem[];
  finalCost: number;
  partsCost: number;
  serviceCharge: number;
  advanceAmount?: number;
  logoUrl?: string;
}): { ok: boolean; error?: string } {
  const { job, customer, device, engineer, approvedParts, inventory, finalCost, partsCost, serviceCharge, advanceAmount = 0, logoUrl } = params;

  // Invoice & Print details
  const jobYear = job.createdAt ? new Date(job.createdAt).getFullYear() : new Date().getFullYear();
  const invoiceNumber = job.invoiceNumber || `INV-${jobYear}-${job.id.slice(-4).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (d?: string) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const intakeDate = fmtDate(job.createdAt);
  const completedDate = fmtDate(job.completedAt);
  const deliveredDate = job.status === 'Delivered' ? fmtDate(job.updatedAt) : '—';
  
  const paymentStatus = job.status === 'Delivered' ? 'PAID' : 'PENDING';
  const paymentColor  = job.status === 'Delivered' ? '#16a34a' : '#d97706';
  const paymentBg     = job.status === 'Delivered' ? '#f0fdf4' : '#fffbeb';
  const paymentBorder = job.status === 'Delivered' ? '#bbf7d0' : '#fde68a';

  // Tax breakdown (GST 18% inclusive)
  const subtotalWithoutTax = finalCost / 1.18;
  const cgst = subtotalWithoutTax * 0.09;
  const sgst = subtotalWithoutTax * 0.09;
  const totalTax = cgst + sgst;

  // Parts List
  const partsRows = approvedParts.map((pr: PartRequest) => {
    // Check if PartRequest stores unitCost directly first, fallback to inventory lookup
    const unitCost = pr.unitCost !== null && pr.unitCost !== undefined 
      ? pr.unitCost 
      : (inventory.find((i: InventoryItem) => i.name.toLowerCase() === pr.partName.toLowerCase())?.unitCost ?? 0);
    const lineCost = unitCost * pr.quantity;

    return `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:left;">${pr.partName}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${pr.quantity}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${unitCost > 0 ? '₹' + unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:500;">${lineCost > 0 ? '₹' + lineCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</td>
      </tr>`;
  }).join('');

  const partsSection = approvedParts.length > 0 ? `
    <h3 style="font-size:11px;font-weight:700;color:#374151;margin:24px 0 10px;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;gap:8px;" class="avoid-break">
      <span style="display:inline-block;width:3px;height:14px;background:#f97316;border-radius:2px;"></span>
      Parts &amp; Components Used
    </h3>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;" class="avoid-break">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:9px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Part Name</th>
          <th style="padding:9px 12px;text-align:center;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Qty</th>
          <th style="padding:9px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Unit Cost</th>
          <th style="padding:9px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Amount</th>
        </tr>
      </thead>
      <tbody>${partsRows}</tbody>
    </table>` : '';

  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track?job=${job.id}` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice #${invoiceNumber} — ${customer?.name ?? 'Customer'}</title>
  <style>${buildCommonStyle()}</style>
</head>
<body>
  ${buildPrintButton()}

  <!-- HEADER -->
  ${buildHeader('INVOICE', invoiceNumber, paymentStatus, { bg: paymentBg, text: paymentColor, border: paymentBorder }, completedDate !== '—' ? completedDate : intakeDate, deliveredDate !== '—' ? deliveredDate : 'Upon Delivery', logoUrl)}

  <!-- CLIENT & DEVICE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
      <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Billed To</p>
      <p style="font-size:14px;font-weight:700;margin:0 0 4px;color:#111827;">${customer?.name ?? '—'}</p>
      <p style="font-size:12px;color:#374151;margin:0 0 2px;">${ICONS.phone} ${customer?.phone ?? '—'}</p>
      ${customer?.email ? `<p style="font-size:12px;color:#4b5563;margin:0 0 2px;">${ICONS.email} ${customer.email}</p>` : ''}
      ${customer?.address ? `<p style="font-size:12px;color:#4b5563;margin:0;line-height:1.4;">${ICONS.location} ${customer.address}</p>` : ''}
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
      <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Device Details</p>
      <p style="font-size:14px;font-weight:700;margin:0 0 4px;color:#111827;">${device?.brand ?? ''} ${device?.model ?? ''}</p>
      ${device?.type ? `<p style="font-size:12px;color:#4b5563;margin:0 0 2px;">Type: ${device.type}</p>` : ''}
      ${device?.serialNumber ? `<p style="font-size:12px;color:#4b5563;margin:0 0 2px;">S/N: <span style="font-family:monospace;">${device.serialNumber}</span></p>` : ''}
      <p style="font-size:12px;color:#4b5563;margin:0;">Technician: <strong style="color:#374151;">${engineer?.name ?? 'N/A'}</strong></p>
    </div>
  </div>

  <!-- JOB TIMELINE -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;">
    <div>
      <p style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 3px;">UUID Ref</p>
      <p style="font-size:11px;font-weight:600;color:#111827;margin:0;font-family:monospace;overflow:hidden;text-overflow:ellipsis;">${job.id.slice(0, 8)}...</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 3px;">Date Received</p>
      <p style="font-size:11px;font-weight:600;color:#111827;margin:0;">${intakeDate}</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 3px;">Completed On</p>
      <p style="font-size:11px;font-weight:600;color:#111827;margin:0;">${completedDate}</p>
    </div>
    <div>
      <p style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 3px;">Delivered On</p>
      <p style="font-size:11px;font-weight:600;color:#111827;margin:0;">${deliveredDate}</p>
    </div>
  </div>

  <!-- PROBLEM & NOTES -->
  <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:14px 16px;margin-bottom:20px;" class="avoid-break">
    <p style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 5px;">Problem Description</p>
    <p style="font-size:12.5px;color:#1e3a8a;margin:0 0 0;">${job.problemDescription ?? job.problemDesc ?? '—'}</p>
    ${job.repairNotes ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #bfdbfe;">
      <p style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 5px;">Work Performed / Repair Notes</p>
      <p style="font-size:12.5px;color:#1e3a8a;margin:0;">${job.repairNotes}</p>
    </div>` : ''}
  </div>

  <!-- PARTS TABLE -->
  ${partsSection}

  <!-- COST SUMMARY -->
  ${buildCostSummary({
    serviceCharge,
    partsCost,
    taxAmount: totalTax,
    cgst,
    sgst,
    finalCost,
    advanceAmount
  }, paymentStatus, paymentColor, job.paymentMethod)}

  <!-- SIGNATURE ROW -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px;padding-top:16px;border-top:1px solid #e5e7eb;" class="avoid-break">
    <div>
      <div style="border-bottom:1px solid #374151;height:36px;margin-bottom:6px;"></div>
      <p style="font-size:11px;color:#4b5563;margin:0;">Customer Signature</p>
      <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">I confirm receipt of the repaired device in good condition.</p>
    </div>
    <div>
      <div style="border-bottom:1px solid #374151;height:36px;margin-bottom:6px;"></div>
      <p style="font-size:11px;color:#4b5563;margin:0;">Authorised by — ${BUSINESS_INFO.shopName}</p>
      <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">${engineer?.name ?? 'Technician'} &middot; ${printDate}</p>
    </div>
  </div>

  <!-- FOOTER -->
  ${buildFooter(invoiceNumber, printDate, printTime, true)}

  <!-- QR CODE INIT SCRIPT -->
  ${initQrScript(trackingUrl)}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=820,height=960');
  if (!win) {
    return { ok: false, error: 'Popup blocked. Please enable popups for this site to print invoices.' };
  }
  win.document.write(html);
  win.document.close();
  return { ok: true };
}

export function printSaleInvoice(sale: Sale, logoUrl?: string): { ok: boolean; error?: string } {
  const invoiceNumber = sale.saleNumber;
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const isPaid = !!sale.paidAt;
  const paymentStatus = isPaid ? 'PAID' : 'PENDING';
  const paymentColor  = isPaid ? '#16a34a' : '#d97706';
  const paymentBg     = isPaid ? '#f0fdf4' : '#fffbeb';
  const paymentBorder = isPaid ? '#bbf7d0' : '#fde68a';

  // Tax calculations (GST 18% inclusive)
  const finalCost = sale.totalAmount;
  const subtotalWithoutTax = finalCost / 1.18;
  const cgst = subtotalWithoutTax * 0.09;
  const sgst = subtotalWithoutTax * 0.09;
  const totalTax = cgst + sgst;
  const partsCost = finalCost - subtotalWithoutTax; // items cost
  const serviceCharge = 0; // sales has no service charge by default

  const itemRows = sale.items.map(item => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:left;">${item.itemName}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:500;">₹${item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Sale Invoice ${invoiceNumber}</title>
  <style>${buildCommonStyle()}</style>
</head>
<body>
  ${buildPrintButton()}

  <!-- HEADER -->
  ${buildHeader('SALES RECEIPT', invoiceNumber, paymentStatus, { bg: paymentBg, text: paymentColor, border: paymentBorder }, new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 'Due Upon Receipt', logoUrl)}

  <!-- CLIENT -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
    <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Billed To</p>
    <p style="font-size:14px;font-weight:700;margin:0 0 4px;color:#111827;">${sale.companyName || sale.contactName || 'Walk-in Customer'}</p>
    ${sale.contactName && sale.companyName ? `<p style="font-size:12px;color:#4b5563;margin:0 0 2px;">Contact: ${sale.contactName}</p>` : ''}
    ${sale.phone ? `<p style="font-size:12px;color:#4b5563;margin:0;">${ICONS.phone} ${sale.phone}</p>` : ''}
  </div>

  <h3 style="font-size:11px;font-weight:700;color:#374151;margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.08em;" class="avoid-break">Items Sold</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;" class="avoid-break">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:9px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Item</th>
        <th style="padding:9px 12px;text-align:center;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Qty</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Unit Price</th>
        <th style="padding:9px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:10.5px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- COST SUMMARY -->
  ${buildCostSummary({
    serviceCharge: serviceCharge,
    partsCost: partsCost,
    taxAmount: totalTax,
    cgst,
    sgst,
    finalCost,
    advanceAmount: 0
  }, paymentStatus, paymentColor, 'UPI')}

  ${sale.notes ? `
    <div style="margin-top:20px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;color:#374151;" class="avoid-break">
      <strong>Notes / Special Remarks</strong><br/>
      ${sale.notes}
    </div>` : ''}

  <!-- SIGNATURE ROW -->
  <div style="display:grid;grid-template-columns:1fr;gap:40px;margin-top:36px;padding-top:16px;border-top:1px solid #e5e7eb;" class="avoid-break">
    <div style="text-align:right; max-width: 250px; margin-left: auto;">
      <div style="border-bottom:1px solid #374151;height:36px;margin-bottom:6px;"></div>
      <p style="font-size:11px;color:#4b5563;margin:0;">Authorized Signatory — ${BUSINESS_INFO.shopName}</p>
      <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">${printDate}</p>
    </div>
  </div>

  <!-- FOOTER -->
  ${buildFooter(invoiceNumber, printDate, printTime, false)}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=820,height=960');
  if (!win) {
    return { ok: false, error: 'Popup blocked. Please enable popups for this site to print invoices.' };
  }
  win.document.write(html);
  win.document.close();
  return { ok: true };
}
