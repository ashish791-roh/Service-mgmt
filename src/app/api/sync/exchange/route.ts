import { NextResponse } from 'next/server';
import { getDeploymentRole } from '@/lib/branchContext';
import { validateBranchApiKey } from '@/lib/branchAuth';
import { processBranchSyncPayload } from '@/lib/hqSyncEngine';

// POST /api/sync/exchange
export async function POST(request: Request) {
  // 404 when called against a non-HQ deployment
  if (getDeploymentRole() !== 'hq') {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const body = await request.json();
    const { branchId, apiKey, changes, lastConfigSeq } = body;

    if (!branchId || !apiKey) {
      return NextResponse.json({ error: 'Missing branchId or apiKey' }, { status: 400 });
    }

    // Validate branch key
    const branch = await validateBranchApiKey(apiKey);
    if (!branch || branch.id !== branchId) {
      return NextResponse.json({ error: 'Invalid or suspended branch credentials' }, { status: 403 });
    }

    const result = await processBranchSyncPayload(branchId, changes || [], lastConfigSeq || '0');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[api/sync/exchange]', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
