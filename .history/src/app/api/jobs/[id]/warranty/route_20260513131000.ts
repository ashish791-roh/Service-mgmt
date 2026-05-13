/**
 * GET /api/jobs/:id/warranty
 *
 * Public endpoint — no authentication required.
 * Generates and returns a PDF warranty certificate for a completed job.
 *
 * Returns 404 if the job does not exist.
 * Returns 400 if the job is not yet completed or has no warranty (0 days).
 *
 * Warranty duration is driven by the per-device-type config stored in the
 * `fixhub_warranty_config` localStorage key on the client. Since this runs
 * server-side, the duration is read from the `WARRANTY_DURATIONS` env var
 * (JSON string, same shape as WarrantyEntry[]) with a hard-coded fallback
 * that mirrors the client defaults.
 *
 * Environment variables (optional):
 *   WARRANTY_DURATIONS  — JSON array of { deviceType, days } objects
 *   NEXT_PUBLIC_APP_URL — Base URL for the public tracking link
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Warranty duration config (server-side) ────────────────────────────────────

interface WarrantyEntry { deviceType: string; days: number; }

const DEFAULT_WARRANTY: WarrantyEntry[] = [
  { deviceType: 'Phone',   days: 30  },
  { deviceType: 'Laptop',  days: 60  },
  { deviceType: 'Tablet',  days: 45  },
  { deviceType: 'Desktop', days: 90  },
  { deviceType: 'Other',   days: 30  },
];

function getWarrantyEntries(): WarrantyEntry[] {
  const raw = process.env.WARRANTY_DURATIONS;
  if (!raw) return DEFAULT_WARRANTY;
  try {
    const parsed = JSON.parse(raw) as WarrantyEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* ignore */ }
  return DEFAULT_WARRANTY;
}

function getWarrantyDays(deviceType: string | undefined): number {
  if (!deviceType) return 0;
  const entries = getWarrantyEntries();
  const key = deviceType.trim().toLowerCase();
  const match =
    entries.find(e => e.deviceType.toLowerCase() === key) ??
    entries.find(e => e.deviceType.toLowerCase() === 'other');
  return match?.days ?? 0;
}

// ── PDF generation (pure string — no npm dependency) ─────────────────────────

function pad2(n: number) { return n.toString().padStart(2, '0'); }

function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function shortId(id: string) {
  return id.slice(-10).toUpperCase();
}

interface PdfData {
  jobId: string;
  customerName: string;
  phone: string;
  deviceBrand: string;
  deviceType: string;
  deviceModel: string;
  serialNumber?: string | null;
  problemDesc: string;
  repairNotes?: string | null;
  completedAt: Date;
  warrantyDays: number;
  shopName: string;
}

/**
 * Generates a minimal but professional PDF warranty certificate.
 * Uses only core PDF primitives — no external library required.
 */
function generateWarrantyPdf(d: PdfData): Buffer {
  const ref        = shortId(d.jobId);
  const issued     = formatDate(d.completedAt);
  const expiresAt  = new Date(d.completedAt.getTime() + d.warrantyDays * 86_400_000);
  const expires    = formatDate(expiresAt);
  const deviceDesc = `${d.deviceBrand} ${d.deviceType} — ${d.deviceModel}`;
  const serial     = d.serialNumber ? d.serialNumber : 'N/A';
  const shop       = d.shopName || 'FixHub Service Center';
  const repair     = (d.repairNotes || d.problemDesc).slice(0, 120);

  // ── PDF content stream (page content) ──────────────────────────────────────
  const lines: string[] = [
    // Background header band
    'q',
    '0.11 0.30 0.85 rg',          // #1d4ed8 blue
    '0 750 595 92 re f',
    'Q',

    // Shop name (white, large)
    'BT',
    '/F1 22 Tf',
    '1 1 1 rg',
    '56 800 Td',
    `(${escPdf(shop)}) Tj`,
    'ET',

    // "Warranty Certificate" subtitle (white, smaller)
    'BT',
    '/F1 12 Tf',
    '0.80 0.88 1 rg',
    '56 778 Td',
    '(Warranty Certificate) Tj',
    'ET',

    // Certificate No label
    'BT',
    '/F1 9 Tf',
    '1 1 1 rg',
    '380 800 Td',
    '(Certificate No.) Tj',
    'ET',

    // Certificate No value
    'BT',
    '/F1 11 Tf',
    '1 1 1 rg',
    '380 782 Td',
    `(#${ref}) Tj`,
    'ET',

    // ── Section: Device Info ──────────────────────────────────────────────
    ...sectionHeader(56, 715, 'Device Information'),

    ...labelValue(56, 695, 'Device',        deviceDesc),
    ...labelValue(56, 675, 'Serial Number', serial),

    // ── Section: Repair Info ─────────────────────────────────────────────
    ...sectionHeader(56, 640, 'Repair Summary'),
    ...labelValue(56, 620, 'Repair Performed', repair),
    ...labelValue(56, 600, 'Completed On',     issued),

    // ── Section: Warranty Details ─────────────────────────────────────────
    ...sectionHeader(56, 565, 'Warranty Coverage'),

    // Coloured box
    'q',
    '0.94 0.97 0.94 rg',
    '44 485 507 65 re f',
    '0.09 0.53 0.27 rg',
    '44 485 507 65 re S',
    'Q',

    'BT',
    '/F1 11 Tf',
    '0.09 0.53 0.27 rg',
    '56 537 Td',
    `(This device is covered by a ${d.warrantyDays}-day warranty.) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '0.2 0.2 0.2 rg',
    '56 518 Td',
    `(Valid from ${issued} to ${expires}) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '0.2 0.2 0.2 rg',
    '56 500 Td',
    `(Customer: ${escPdf(d.customerName)}   |   Phone: ${escPdf(d.phone)}) Tj`,
    'ET',

    // ── Terms ─────────────────────────────────────────────────────────────
    ...sectionHeader(56, 465, 'Terms & Conditions'),

    ...bodyText(56, 445, 'This warranty covers the specific repair performed and defects arising from that repair.'),
    ...bodyText(56, 428, 'Physical damage, liquid damage, or faults unrelated to the original repair are excluded.'),
    ...bodyText(56, 411, 'Warranty is void if the device is opened or repaired by a third party.'),
    ...bodyText(56, 394, 'Please retain this certificate and present it when claiming warranty service.'),

    // ── Footer ─────────────────────────────────────────────────────────────
    'q',
    '0.95 0.95 0.95 rg',
    '0 0 595 50 re f',
    'Q',

    'BT',
    '/F1 8 Tf',
    '0.5 0.5 0.5 rg',
    '56 28 Td',
    `(${escPdf(shop)} — Powered by FixHub Service Management) Tj`,
    'ET',

    'BT',
    '/F1 8 Tf',
    '0.5 0.5 0.5 rg',
    '420 28 Td',
    `(Issued: ${issued}) Tj`,
    'ET',
  ];

  const content = lines.join('\n');

  // ── Assemble PDF objects ──────────────────────────────────────────────────
  const offsets: number[] = [];

  // Helper to push an object and record its offset
  let pdfStr = '%PDF-1.4\n';

  function addObject(id: number, body: string) {
    offsets[id] = pdfStr.length;
    pdfStr += `${id} 0 obj\n${body}\nendobj\n`;
  }

  // 1 — Catalog
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  // 2 — Pages
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3 — Page
  addObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>');
  // 4 — Font (Helvetica, built-in)
  addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  // 5 — Content stream
  const streamBytes = Buffer.from(content, 'latin1');
  addObject(5, `<< /Length ${streamBytes.length} >>\nstream\n${content}\nendstream`);

  // xref table
  const xrefOffset = pdfStr.length;
  pdfStr += 'xref\n';
  pdfStr += `0 ${offsets.length}\n`;
  pdfStr += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdfStr += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdfStr += 'trailer\n';
  pdfStr += `<< /Size ${offsets.length} /Root 1 0 R >>\n`;
  pdfStr += 'startxref\n';
  pdfStr += `${xrefOffset}\n`;
  pdfStr += '%%EOF\n';

  return Buffer.from(pdfStr, 'latin1');
}

// ── PDF helper primitives ─────────────────────────────────────────────────────

function escPdf(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');  // strip non-latin1 safe chars
}

function sectionHeader(x: number, y: number, text: string): string[] {
  return [
    'q',
    '0.11 0.30 0.85 rg',
    `${x - 12} ${y - 4} 507 20 re f`,
    'Q',
    'BT',
    '/F1 10 Tf',
    '1 1 1 rg',
    `${x} ${y} Td`,
    `(${escPdf(text)}) Tj`,
    'ET',
  ];
}

function labelValue(x: number, y: number, label: string, value: string): string[] {
  return [
    'BT',
    '/F1 9 Tf',
    '0.4 0.4 0.4 rg',
    `${x} ${y} Td`,
    `(${escPdf(label)}:) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.1 0.1 0.1 rg',
    `${x + 120} ${y} Td`,
    `(${escPdf(value)}) Tj`,
    'ET',
  ];
}

function bodyText(x: number, y: number, text: string): string[] {
  return [
    'BT',
    '/F1 9 Tf',
    '0.3 0.3 0.3 rg',
    `${x} ${y} Td`,
    `(• ${escPdf(text)}) Tj`,
    'ET',
  ];
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    if (!['Completed', 'Delivered'].includes(job.status ?? '')) {
      return NextResponse.json(
        { error: 'Warranty certificate is only available for completed jobs.' },
        { status: 400 }
      );
    }

    const [customer, device] = await Promise.all([
      prisma.customer.findUnique({ where: { id: job.customerId } }),
      job.deviceId ? prisma.device.findUnique({ where: { id: job.deviceId } }) : null,
    ]);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const warrantyDays = getWarrantyDays(device?.type);
    if (warrantyDays === 0) {
      return NextResponse.json(
        { error: 'No warranty coverage configured for this device type.' },
        { status: 400 }
      );
    }

    const shopName = process.env.SHOP_NAME ?? 'FixHub Service Center';

    const pdfBuffer = generateWarrantyPdf({
      jobId,
      customerName:  customer.name,
      phone:         (customer as any).phone ?? '',
      deviceBrand:   device?.brand ?? 'Unknown',
      deviceType:    device?.type  ?? 'Device',
      deviceModel:   device?.model ?? 'Unknown',
      serialNumber:  (device as any)?.serialNumber,
      problemDesc:   job.problemDesc ?? '',
      repairNotes:   (job as any).repairNotes,
      completedAt:   job.completedAt ?? job.updatedAt,
      warrantyDays,
      shopName,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="warranty-${shortId(jobId)}.pdf"`,
        'Content-Length':      pdfBuffer.length.toString(),
        'Cache-Control':       'no-store',
      },
    });
  } catch (error) {
    console.error('[api/jobs/[id]/warranty GET]', error);
    return NextResponse.json({ error: 'Failed to generate warranty certificate.' }, { status: 500 });
  }
}
