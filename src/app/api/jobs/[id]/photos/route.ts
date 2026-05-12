import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    try {
        const { id: jobId } = await params;
        const formData = await request.formData();
        
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string | null;

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing file or type.' }, { status: 400 });
        }

        if (type !== 'before' && type !== 'after') {
            return NextResponse.json({ error: 'Invalid photo type.' }, { status: 400 });
        }

        // Check if job exists
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'jobs', jobId);
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate a unique filename
        const ext = path.extname(file.name) || '.jpg';
        const uniqueFilename = `${type}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Save file
        await fs.writeFile(filePath, buffer);

        // Public URL path
        const publicUrl = `/uploads/jobs/${jobId}/${uniqueFilename}`;

        // Create Prisma record
        const photo = await prisma.jobPhoto.create({
            data: {
                jobId,
                url: publicUrl,
                type,
            }
        });

        return NextResponse.json({
            id: photo.id,
            jobId: photo.jobId,
            url: photo.url,
            type: photo.type,
            createdAt: photo.createdAt.toISOString(),
        });

    } catch (error) {
        console.error('[POST /api/jobs/[id]/photos]', error);
        return NextResponse.json({ error: 'Failed to upload photo.' }, { status: 500 });
    }
}
