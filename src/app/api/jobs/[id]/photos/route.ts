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

        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate magic bytes
        const isJpg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length > 3 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isGif = buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // starts with 'GIF'
        const isWebp = buffer.length > 11 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

        if (!isJpg && !isPng && !isGif && !isWebp) {
            return NextResponse.json(
                { error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' },
                { status: 415 }
            );
        }

        const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5 MB.' },
                { status: 413 }
            );
        }

        // Sanitise filename — never trust file.name from client
        let ext = '.jpg';
        if (isPng) ext = '.png';
        else if (isGif) ext = '.gif';
        else if (isWebp) ext = '.webp';

        // Check if job exists
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }


        
        // Ensure upload directory exists (outside public/)
        const uploadDir = path.join(process.cwd(), 'uploads', 'jobs', jobId);
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate a unique filename using ext
        const uniqueFilename = `${type}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Save file
        await fs.writeFile(filePath, buffer);

        // Storage path reference
        const storagePath = `jobs/${jobId}/${uniqueFilename}`;

        // Create Prisma record
        const photo = await prisma.jobPhoto.create({
            data: {
                jobId,
                url: storagePath,
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
