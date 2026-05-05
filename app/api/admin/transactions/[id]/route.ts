import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import type { PlatformTransactionRow, PlatformTransactionStatus } from '@/lib/admin/transactions/types';

const patchBodySchema = z.object({
  status: z.enum(['completed', 'failed', 'cancelled', 'processing']),
  external_reference: z.string().max(500).optional().nullable(),
  failure_reason: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function canTransition(
  from: PlatformTransactionStatus,
  to: PlatformTransactionStatus,
): boolean {
  if (from === 'completed' || from === 'failed' || from === 'cancelled') return false;
  if (to === 'processing') return from === 'pending';
  if (to === 'completed') return from === 'pending' || from === 'processing';
  if (to === 'failed') return from === 'pending' || from === 'processing';
  if (to === 'cancelled') return from === 'pending' || from === 'processing';
  return false;
}

/**
 * PATCH /api/admin/transactions/[id] — update outgoing workflow status (admin only).
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const { status: nextStatus, external_reference, failure_reason, notes } = parsed.data;

  if (nextStatus === 'completed' && (!external_reference || !String(external_reference).trim())) {
    return NextResponse.json(
      { error: 'external_reference is required when marking completed' },
      { status: 400 },
    );
  }
  if (nextStatus === 'failed' && (!failure_reason || !String(failure_reason).trim())) {
    return NextResponse.json(
      { error: 'failure_reason is required when marking failed' },
      { status: 400 },
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from('platform_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (row.flow !== 'outgoing') {
    return NextResponse.json(
      { error: 'Only outgoing transactions can be updated via this action' },
      { status: 400 },
    );
  }

  const current = row.status as PlatformTransactionStatus;
  if (!canTransition(current, nextStatus as PlatformTransactionStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${current} to ${nextStatus}` },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    status: nextStatus,
  };

  if (nextStatus === 'completed') {
    patch.external_reference = String(external_reference).trim();
    patch.completed_at = new Date().toISOString();
    patch.failure_reason = null;
  } else if (nextStatus === 'failed') {
    patch.failure_reason = String(failure_reason).trim();
  } else if (nextStatus === 'cancelled') {
    patch.failure_reason = null;
  }

  if (notes !== undefined) {
    patch.notes = notes === null || notes === '' ? null : String(notes).trim();
  }

  const { data: updated, error: updErr } = await supabase
    .from('platform_transactions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updErr) {
    console.error('admin transactions patch:', updErr);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }

  return NextResponse.json({ transaction: updated as PlatformTransactionRow });
}
