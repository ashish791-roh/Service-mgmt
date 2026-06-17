import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addToTallyQueue } from '@/lib/tallyQueue';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';


export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin', 'reception']);
  if ('error' in auth) return auth.error;

  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ suppliers });
  } catch (err) {
    console.error('[api/suppliers GET]', err);
    return NextResponse.json({ error: 'Failed to fetch suppliers.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin', 'reception']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name, phone, email, address, gstin } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: withLocalBranchId({
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstin: gstin || null,
      }),
    });

    // ── Outbox Sync ──────────────────────────────────────────────
    captureChange({
      entityType: 'Supplier',
      entityId: supplier.id,
      action: 'create',
      payload: supplier,
    }).catch(err => console.error('[SyncOutbox] Supplier create error:', err));

    // Queue Tally sync
    await addToTallyQueue({
      entityType: 'supplier',
      entityId: supplier.id,
      actionType: 'sync_ledger',
    });

    return NextResponse.json({ supplier }, { status: 201 });

  } catch (err) {
    console.error('[api/suppliers POST]', err);
    return NextResponse.json({ error: 'Failed to create supplier.' }, { status: 500 });
  }
}
