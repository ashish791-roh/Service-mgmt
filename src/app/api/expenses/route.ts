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
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ expenses });
  } catch (err) {
    console.error('[api/expenses GET]', err);
    return NextResponse.json({ error: 'Failed to fetch expenses.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin', 'reception']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { description, amount, category, paymentMethod, date } = body;

    if (!description || !amount || !category || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: withLocalBranchId({
        description,
        amount: parseFloat(amount),
        category,
        paymentMethod,
        date: date ? new Date(date) : new Date(),
      }),
    });

    // ── Outbox Sync ──────────────────────────────────────────────
    captureChange({
      entityType: 'Expense',
      entityId: expense.id,
      action: 'create',
      payload: expense,
    }).catch(err => console.error('[SyncOutbox] Expense create error:', err));

    // Queue Tally action
    await addToTallyQueue({
      entityType: 'expense',
      entityId: expense.id,
      actionType: 'sync_expense',
    });

    return NextResponse.json({ expense }, { status: 201 });

  } catch (err) {
    console.error('[api/expenses POST]', err);
    return NextResponse.json({ error: 'Failed to create expense.' }, { status: 500 });
  }
}
