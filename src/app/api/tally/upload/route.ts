import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { extractTallyDocument, saveTallyDocument } from '@/lib/tally';
import { writeAuditLog } from '@/lib/auditLog';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:upload:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rawType = String(formData.get('documentType') || 'invoice');
    const documentType = ['invoice', 'gst-invoice', 'supplier-bill', 'receipt', 'bank-statement', 'image'].includes(rawType)
      ? (rawType as any)
      : 'invoice';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'A file upload is required.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10 MB limit.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and image files are allowed.' }, { status: 400 });
    }

    const fileName = file.name || 'uploaded-document';
    const ext = path.extname(fileName).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.tiff'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file extension. Only PDF and image files are allowed.' }, { status: 400 });
    }

    const tmpDir = path.join(os.tmpdir(), 'tally-temp');
    await fs.mkdir(tmpDir, { recursive: true });
    const safePath = path.join(tmpDir, `${randomUUID()}-${fileName}`);
    await fs.writeFile(safePath, Buffer.from(await file.arrayBuffer()));

    let extracted;
    try {
      extracted = await extractTallyDocument(safePath, documentType);
    } finally {
      await fs.rm(safePath, { force: true });
    }
    const record = await saveTallyDocument(auth.user.id, fileName, documentType, extracted);

    await writeAuditLog({
      actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
      action: 'upload',
      entity: 'tallyDocument',
      entityId: record.id,
      newValue: { fileName, documentType, confidence: extracted.confidence },
      meta: { stage: 'document-upload' },
    });

    return NextResponse.json({ document: record });
  } catch (error) {
    console.error('[api/tally/upload POST]', error);
    return NextResponse.json({ error: 'Failed to upload document.' }, { status: 500 });
  }
}
