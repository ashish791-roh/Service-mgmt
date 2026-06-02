import type { Job, Customer, Device, User, PartRequest, InventoryItem, Sale } from '../../types';
import { BUSINESS_INFO } from '../../lib/businessConfig';

// ── Embedded Logo (base64) ───────────────────────────────────────────────────
const LOGO_DATA_URL = "data:image/png;base64,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";

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

// ── Shared Styles ────────────────────────────────────────────────────────────
function buildCommonStyle(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
      padding: 32px 40px;
      max-width: 800px;
      margin: 0 auto;
      font-size: 12px;
      line-height: 1.5;
    }
    table { border-collapse: collapse; width: 100%; }
    .no-print { display: block !important; }
    @media print {
      body { margin: 0; padding: 20px 28px; background: #fff; color: #000; }
      .no-print { display: none !important; }
      @page { margin: 1cm; size: A4; }
      tr { page-break-inside: avoid; }
      .avoid-break { page-break-inside: avoid; page-break-before: avoid; }
    }
  `;
}

function buildPrintButton(): string {
  return `
    <div class="no-print" style="margin-bottom:24px;">
      <button onclick="window.print()" style="background:#1a56db;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;letter-spacing:0.02em;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save as PDF
      </button>
    </div>
  `;
}

// ── Flipkart-style Header ────────────────────────────────────────────────────
function buildFlipkartHeader(
  invoiceLabel: string,
  invoiceNumber: string,
  issueDate: string,
  orderDate: string,
  orderId: string,
  logoUrl?: string
): string {
  const resolvedLogo = logoUrl || LOGO_DATA_URL;
  return `
    <!-- TOP BORDER BAR -->
    <div style="background:#1a56db;height:4px;margin-bottom:0;"></div>

    <!-- COMPANY HEADER ROW -->
    <table style="width:100%;border:1px solid #ddd;border-top:none;border-bottom:2px solid #ddd;background:#fff;">
      <tr>
        <td style="padding:14px 18px;vertical-align:middle;width:45%;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${resolvedLogo}" height="52" style="object-fit:contain;max-height:52px;display:block;background:transparent;" alt="${BUSINESS_INFO.shopName}" />
            <div>
              <div style="font-size:9.5px;color:#444;line-height:1.55;margin-top:2px;">
                Contact us: <strong>${BUSINESS_INFO.phone}</strong> || <strong>${BUSINESS_INFO.email}</strong>
              </div>
            </div>
          </div>
        </td>
        <td style="padding:14px 18px;vertical-align:middle;text-align:center;border-left:1px solid #ddd;border-right:1px solid #ddd;">
          <div style="font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.04em;border:2px dashed #1a56db;padding:6px 16px;display:inline-block;border-radius:2px;">
            ${invoiceLabel} # ${invoiceNumber}
          </div>
        </td>
        <td style="padding:14px 18px;vertical-align:middle;width:30%;">
          <div style="font-size:10px;color:#444;text-align:right;line-height:1.6;">
            <strong style="color:#111;">Sold by:</strong> ${BUSINESS_INFO.shopName}<br/>
            <span style="word-break:break-all;">${BUSINESS_INFO.address}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- ORDER META ROW -->
    <table style="width:100%;border:1px solid #ddd;border-top:none;background:#f8f9fa;">
      <tr>
        <td style="padding:8px 18px;font-size:11px;color:#333;border-right:1px solid #ddd;">
          <strong>Order ID:</strong> <span style="color:#1a56db;font-weight:700;text-decoration:underline;">${orderId}</span>
        </td>
        <td style="padding:8px 18px;font-size:11px;color:#333;border-right:1px solid #ddd;">
          <strong>Order Date:</strong> ${orderDate}
        </td>
        <td style="padding:8px 18px;font-size:11px;color:#333;">
          <strong>Invoice Date:</strong> ${issueDate}
        </td>
        <td style="padding:8px 18px;font-size:11px;color:#333;text-align:right;">
          <strong>GSTIN:</strong> ${BUSINESS_INFO.gstin}
        </td>
      </tr>
    </table>
  `;
}

// ── Billing & Shipping Block ─────────────────────────────────────────────────
function buildAddressBlock(
  billedName: string,
  billedAddress: string,
  billedPhone: string,
  billedEmail: string,
  shippedName: string,
  shippedAddress: string,
  shippedPhone: string
): string {
  return `
    <table style="width:100%;border:1px solid #ddd;border-top:none;background:#fff;">
      <tr>
        <td style="padding:12px 18px;vertical-align:top;width:50%;border-right:1px solid #ddd;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:0.06em;margin-bottom:6px;">Billing Address</div>
          <div style="font-size:12px;font-weight:700;color:#111;margin-bottom:3px;">${billedName}</div>
          <div style="font-size:11px;color:#444;line-height:1.55;">${billedAddress}</div>
          <div style="font-size:11px;color:#444;margin-top:3px;">Phone: ${billedPhone}</div>
          ${billedEmail ? `<div style="font-size:11px;color:#444;">Email: ${billedEmail}</div>` : ''}
        </td>
        <td style="padding:12px 18px;vertical-align:top;width:50%;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:0.06em;margin-bottom:6px;">Shipping Address</div>
          <div style="font-size:12px;font-weight:700;color:#111;margin-bottom:3px;font-style:italic;">${shippedName}</div>
          <div style="font-size:11px;color:#444;line-height:1.55;">${shippedAddress}</div>
          <div style="font-size:11px;color:#444;margin-top:3px;">Phone: ${shippedPhone}</div>
        </td>
      </tr>
    </table>
  `;
}

// ── Items Table ──────────────────────────────────────────────────────────────
function buildItemsTable(rows: string, hsn?: string): string {
  return `
    <table style="width:100%;border:1px solid #ddd;border-top:none;background:#fff;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:9px 14px;text-align:left;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">Product</th>
          <th style="padding:9px 14px;text-align:left;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">Description / Title</th>
          ${hsn ? `<th style="padding:9px 14px;text-align:center;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">HSN</th>` : ''}
          <th style="padding:9px 14px;text-align:center;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">Qty</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">Price (₹)</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;border-right:1px solid #e0e0e0;">Tax (₹)</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid #ddd;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ── Totals + Grand Total ─────────────────────────────────────────────────────
function buildTotalsBlock(
  subtotal: number,
  cgst: number,
  sgst: number,
  finalCost: number,
  paymentStatus: string,
  paymentMethod?: string | null,
  advanceAmount?: number,
  promotionalDiscount?: number,
  taxPercent?: string
): string {
  const words = toIndianWords(finalCost);
  const balanceDue = Math.max(finalCost - (advanceAmount ?? 0), 0);
  const taxLine = taxPercent ?? '18% GST';

  return `
    <!-- SUBTOTALS -->
    <table style="width:100%;border:1px solid #ddd;border-top:none;background:#fff;">
      <tr>
        <td style="padding:8px 18px;font-size:11px;color:#444;border-right:1px solid #e0e0e0;vertical-align:top;width:55%;">
          ${promotionalDiscount ? `<span style="font-size:10px;color:#888;font-style:italic;">Price is inclusive of Promotional Discount of ₹${promotionalDiscount.toLocaleString('en-IN', {minimumFractionDigits:2})}</span><br/>` : ''}
          <span style="font-size:10px;color:#888;font-style:italic;">${taxLine} included in price</span>
        </td>
        <td style="padding:8px 0;vertical-align:top;">
          <table style="width:100%;">
            <tr>
              <td style="padding:5px 18px;font-size:12px;color:#444;border-bottom:1px solid #f0f0f0;">Total</td>
              <td style="padding:5px 18px;font-size:12px;font-weight:700;color:#111;text-align:right;border-bottom:1px solid #f0f0f0;">${subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})} &nbsp; ${cgst.toLocaleString('en-IN',{minimumFractionDigits:2})} &nbsp;&nbsp; ${finalCost.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- GRAND TOTAL -->
    <table style="width:100%;border:1px solid #ddd;border-top:none;background:#f8f9fa;">
      <tr>
        <td style="padding:14px 18px;vertical-align:middle;border-right:1px solid #ddd;width:55%;">
          <div style="font-size:11px;color:#555;font-style:italic;line-height:1.5;">
            Amount in words:<br/>
            <strong style="color:#111;">${words}</strong>
          </div>
          ${(advanceAmount ?? 0) > 0 ? `
          <div style="margin-top:8px;font-size:11px;color:#16a34a;">
            Advance Paid: <strong>₹${(advanceAmount!).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong> &nbsp;|&nbsp;
            Balance Due: <strong>₹${balanceDue.toLocaleString('en-IN',{minimumFractionDigits:2})}</strong>
          </div>` : ''}
          <div style="margin-top:6px;font-size:10.5px;color:#666;">
            Payment Status: <strong style="color:${paymentStatus==='PAID'?'#16a34a':'#d97706'};text-transform:uppercase;">${paymentStatus}</strong>
            ${paymentMethod ? ` &nbsp;via&nbsp;<strong>${paymentMethod}</strong>` : ''}
          </div>
        </td>
        <td style="padding:14px 18px;vertical-align:middle;text-align:right;">
          <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">Grand Total</div>
          <div style="font-size:28px;font-weight:800;color:#111;letter-spacing:-0.5px;">₹ ${finalCost.toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
        </td>
      </tr>
    </table>
  `;
}

// ── Footer ───────────────────────────────────────────────────────────────────
function buildFooter(invoiceNumber: string, printDate: string, printTime: string, hasQr: boolean, trackingUrl?: string): string {
  const termsSection = `
    <div style="margin-top:20px;border:1px solid #ddd;border-radius:4px;padding:12px 16px;font-size:10px;color:#555;line-height:1.55;background:#fafafa;" class="avoid-break">
      <strong style="color:#111;font-size:10.5px;display:block;margin-bottom:4px;">Terms &amp; Conditions</strong>
      1. All warranty claims are subject to standard warranty configurations. No warranty on physical or liquid damage.<br/>
      2. Spare parts once installed cannot be returned or refunded.<br/>
      3. Devices not collected within 30 days of repair completion will be disposed of at owner&#39;s risk.<br/>
      4. <em>This is a computer-generated invoice. No signature required.</em>
    </div>
  `;

  return `
    ${termsSection}
    <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px dashed #ddd;" class="avoid-break">
      <div>
        <p style="font-size:10px;color:#aaa;margin:0;">Thank you for choosing ${BUSINESS_INFO.shopName}.</p>
        <p style="font-size:9px;color:#ccc;margin:2px 0 0;">Printed on ${printDate} at ${printTime} &nbsp;·&nbsp; Ref: #${invoiceNumber}</p>
      </div>
      ${hasQr && trackingUrl ? '<div id="invoice-qrcode" style="padding:4px;border:1px solid #ddd;border-radius:4px;background:#fff;width:60px;height:60px;"></div>' : ''}
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
            width: 52, height: 52,
            colorDark: "#111827", colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        }
      }
    </script>
  `;
}

// ── Print Repair Invoice ─────────────────────────────────────────────────────
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
  const { job, customer, device, engineer, approvedParts, inventory, finalCost, partsCost, serviceCharge, advanceAmount = 0 } = params;

  const jobYear = job.createdAt ? new Date(job.createdAt).getFullYear() : new Date().getFullYear();
  const invoiceNumber = job.invoiceNumber || `INV-${jobYear}-${job.id.slice(-4).toUpperCase()}`;
  const orderId = `OD${job.id.replace(/-/g, '').slice(0, 16).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const intakeDate  = fmtDate(job.createdAt);
  const issueDate   = fmtDate(job.completedAt) !== '—' ? fmtDate(job.completedAt) : printDate;

  const paymentStatus = job.status === 'Delivered' ? 'PAID' : 'PENDING';

  // Tax breakdown (GST 18% inclusive)
  const subtotalExTax = finalCost / 1.18;
  const cgst = subtotalExTax * 0.09;
  const sgst = subtotalExTax * 0.09;

  // Build address strings
  const billedAddress = [customer?.address, BUSINESS_INFO.address.split(',').slice(-2).join(',').trim()]
    .filter(Boolean).join(', ') || BUSINESS_INFO.address;
  const customerName = customer?.name ?? 'Customer';

  // Items: service row + parts rows
  let itemRows = '';

  // Service charge row
  if (serviceCharge > 0) {
    const svcTax = (serviceCharge / 1.18) * 0.18;
    const svcBase = serviceCharge - svcTax;
    itemRows += `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:11.5px;color:#444;vertical-align:top;border-right:1px solid #e0e0e0;">Repair Service</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;color:#111;border-right:1px solid #e0e0e0;">
          ${device?.brand ?? ''} ${device?.model ?? ''} — ${job.problemDescription ?? job.problemDesc ?? 'Repair Service'}
          ${job.repairNotes ? `<div style="font-size:10.5px;color:#666;margin-top:3px;font-weight:400;">${job.repairNotes}</div>` : ''}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:center;border-right:1px solid #e0e0e0;">1</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${svcBase.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${svcTax.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;text-align:right;">${serviceCharge.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      </tr>`;
  }

  // Parts rows
  approvedParts.forEach((pr: PartRequest) => {
    const unitCost = pr.unitCost !== null && pr.unitCost !== undefined
      ? pr.unitCost
      : (inventory.find((i: InventoryItem) => i.name.toLowerCase() === pr.partName.toLowerCase())?.unitCost ?? 0);
    const lineCost = unitCost * pr.quantity;
    const taxAmt = (lineCost / 1.18) * 0.18;
    const baseAmt = lineCost - taxAmt;
    itemRows += `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:11.5px;color:#444;vertical-align:top;border-right:1px solid #e0e0e0;">Spare Part</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;color:#111;border-right:1px solid #e0e0e0;">${pr.partName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:center;border-right:1px solid #e0e0e0;">${pr.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${baseAmt > 0 ? baseAmt.toLocaleString('en-IN',{minimumFractionDigits:2}) : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${taxAmt > 0 ? taxAmt.toLocaleString('en-IN',{minimumFractionDigits:2}) : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;text-align:right;">${lineCost > 0 ? lineCost.toLocaleString('en-IN',{minimumFractionDigits:2}) : '—'}</td>
      </tr>`;
  });

  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track?job=${job.id}` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Tax Invoice #${invoiceNumber} — ${customerName}</title>
  <style>${buildCommonStyle()}</style>
</head>
<body>
  ${buildPrintButton()}

  ${buildFlipkartHeader('TAX INVOICE', invoiceNumber, issueDate, intakeDate, orderId)}

  ${buildAddressBlock(
    customerName,
    customer?.address ?? BUSINESS_INFO.address,
    customer?.phone ?? '—',
    customer?.email ?? '',
    customerName,
    customer?.address ?? BUSINESS_INFO.address,
    customer?.phone ?? '—'
  )}

  <!-- DEVICE INFO ROW -->
  <table style="width:100%;border:1px solid #ddd;border-top:none;background:#fafeff;">
    <tr>
      <td style="padding:8px 18px;font-size:11px;color:#333;border-right:1px solid #ddd;">
        <strong>Device:</strong> ${device?.brand ?? ''} ${device?.model ?? ''} ${device?.type ? `(${device.type})` : ''}
      </td>
      <td style="padding:8px 18px;font-size:11px;color:#333;border-right:1px solid #ddd;">
        ${device?.serialNumber ? `<strong>S/N:</strong> <span style="font-family:monospace;">${device.serialNumber}</span>` : '&nbsp;'}
      </td>
      <td style="padding:8px 18px;font-size:11px;color:#333;">
        <strong>Technician:</strong> ${engineer?.name ?? 'N/A'}
      </td>
    </tr>
  </table>

  ${buildItemsTable(itemRows)}

  ${buildTotalsBlock(
    subtotalExTax,
    cgst + sgst,
    sgst,
    finalCost,
    paymentStatus,
    job.paymentMethod,
    advanceAmount,
    undefined,
    '5.50% CST'
  )}

  ${buildFooter(invoiceNumber, printDate, printTime, true, trackingUrl)}
  ${trackingUrl ? initQrScript(trackingUrl) : ''}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=980');
  if (!win) {
    return { ok: false, error: 'Popup blocked. Please enable popups for this site to print invoices.' };
  }
  win.document.write(html);
  win.document.close();
  return { ok: true };
}

// ── Print Sale Invoice ───────────────────────────────────────────────────────
export function printSaleInvoice(sale: Sale, logoUrl?: string): { ok: boolean; error?: string } {
  const invoiceNumber = sale.saleNumber;
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const saleDate  = new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const orderId   = `OD${sale.id?.replace(/-/g,'').slice(0,16).toUpperCase() ?? invoiceNumber}`;

  const isPaid = !!sale.paidAt;
  const paymentStatus = isPaid ? 'PAID' : 'PENDING';

  const finalCost = sale.totalAmount;
  const subtotalExTax = finalCost / 1.18;
  const cgst = subtotalExTax * 0.09;
  const sgst = subtotalExTax * 0.09;

  const itemRows = sale.items.map(item => {
    const taxAmt = (item.subtotal / 1.18) * 0.18;
    const baseAmt = item.subtotal - taxAmt;
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:11.5px;color:#444;vertical-align:top;border-right:1px solid #e0e0e0;">Product</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;color:#111;border-right:1px solid #e0e0e0;">${item.itemName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:center;border-right:1px solid #e0e0e0;">${item.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${baseAmt.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;text-align:right;border-right:1px solid #e0e0e0;">${taxAmt.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:600;text-align:right;">${item.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      </tr>`;
  }).join('');

  const customerName = sale.companyName || sale.contactName || 'Walk-in Customer';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Tax Invoice ${invoiceNumber}</title>
  <style>${buildCommonStyle()}</style>
</head>
<body>
  ${buildPrintButton()}

  ${buildFlipkartHeader('TAX INVOICE', invoiceNumber, saleDate, saleDate, orderId, logoUrl)}

  ${buildAddressBlock(
    customerName,
    BUSINESS_INFO.address,
    sale.phone ?? '—',
    '',
    customerName,
    BUSINESS_INFO.address,
    sale.phone ?? '—'
  )}

  ${buildItemsTable(itemRows)}

  ${buildTotalsBlock(
    subtotalExTax,
    cgst + sgst,
    sgst,
    finalCost,
    paymentStatus,
    'UPI',
    0,
    undefined,
    '18% GST Inclusive'
  )}

  ${sale.notes ? `
    <div style="margin-top:16px;padding:12px 16px;background:#fafafa;border:1px solid #ddd;border-radius:4px;font-size:11px;color:#444;" class="avoid-break">
      <strong>Notes / Special Remarks</strong><br/>${sale.notes}
    </div>` : ''}

  ${buildFooter(invoiceNumber, printDate, printTime, false)}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=980');
  if (!win) {
    return { ok: false, error: 'Popup blocked. Please enable popups for this site to print invoices.' };
  }
  win.document.write(html);
  win.document.close();
  return { ok: true };
}