import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;

  const { path: rawSegments } = await params;
  const segments = [...rawSegments];
  if (segments[0] === 'uploads') {
    segments.shift();
  }
  const relPath = segments.join('/');
  // Basic path traversal guard
  if (relPath.includes('..') || relPath.includes('\x00')) {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), 'uploads', relPath);
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    };
    const contentType = mimeMap[ext] ?? 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }
}
