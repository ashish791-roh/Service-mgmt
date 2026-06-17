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
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return NextResponse.json({ purchases });
  } catch (err) {
    console.error('[api/purchases GET]', err);
    return NextResponse.json({ error: 'Failed to fetch purchases.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin', 'reception']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { supplierId, supplierName, notes, items } = body;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or items.' }, { status: 400 });
    }

    // 1. Generate purchase number
    const count = await prisma.purchase.count();
    const purchaseNumber = `PUR-${String(count + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const lineData = items.map((li: any) => {
      const qty = parseInt(li.quantity, 10) || 0;
      const price = parseFloat(li.unitPrice) || 0;
      const subtotal = qty * price;
      totalAmount += subtotal;
      return {
        inventoryItemId: String(li.inventoryItemId),
        itemName: String(li.itemName),
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    // 2. Create purchase and update inventory stock in a transaction
    const { purchase, updatedInventoryItems } = await prisma.$transaction(async (tx: any) => {
      const createdPurchase = await tx.purchase.create({
        data: withLocalBranchId({
          purchaseNumber,
          supplierId: supplierId || null,
          supplierName,
          notes: notes || null,
          totalAmount,
          items: {
            create: lineData.map((item: any) => withLocalBranchId({
              inventoryItemId: item.inventoryItemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        }),
        include: { items: true },
      });

      // Increment inventory item quantities
      const inventoryUpdates = [];
      for (const item of lineData) {
        const updated = await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { increment: item.quantity } },
        });
        inventoryUpdates.push(updated);
      }

      return { purchase: createdPurchase, updatedInventoryItems: inventoryUpdates };
    });

    // ── Outbox Sync ──────────────────────────────────────────────
    captureChange({
      entityType: 'Purchase',
      entityId: purchase.id,
      action: 'create',
      payload: purchase,
    }).catch(err => console.error('[SyncOutbox] Purchase create error:', err));

    if (purchase.items) {
      for (const item of purchase.items) {
        captureChange({
          entityType: 'PurchaseItem',
          entityId: item.id,
          action: 'create',
          payload: item,
        }).catch(err => console.error('[SyncOutbox] PurchaseItem create error:', err));
      }
    }

    for (const invItem of updatedInventoryItems) {
      captureChange({
        entityType: 'InventoryItem',
        entityId: invItem.id,
        action: 'update',
        payload: invItem,
      }).catch(err => console.error('[SyncOutbox] InventoryItem update error:', err));
    }

    // 3. Queue Tally sync
    await addToTallyQueue({
      entityType: 'purchase',
      entityId: purchase.id,
      actionType: 'sync_purchase',
    }).catch(err => console.error('[Tally Auto-Queue Purchase] Failed:', err));

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (err) {
    console.error('[api/purchases POST]', err);
    return NextResponse.json({ error: 'Failed to create purchase.' }, { status: 500 });
  }

}
