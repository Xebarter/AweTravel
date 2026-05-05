import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

function asPositiveBigInt(value: unknown): bigint | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    return n > 0 ? BigInt(n) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = BigInt(trimmed);
    return n > BigInt(0) ? n : null;
  }
  return null;
}

async function computeAvailableUgx(supabase: any): Promise<number> {
  const [{ data: completedSales, error: salesErr }, { data: payoutsAll, error: payoutErr }, { data: payoutReqs, error: payoutReqErr }] =
    await Promise.all([
      supabase.from('platform_transactions').select('amount_ugx').eq('kind', 'passenger_payment').eq('status', 'completed'),
      supabase.from('platform_transactions').select('amount_ugx,status').eq('kind', 'transporter_payout'),
      supabase.from('transporter_payout_requests').select('amount_ugx,status'),
    ]);

  if (salesErr) throw new Error('Failed to compute available balance');
  if (payoutErr) throw new Error('Failed to compute available balance');
  if (payoutReqErr) throw new Error('Failed to compute available balance');

  const grossCompletedUgx = (completedSales ?? []).reduce((sum: number, r: any) => sum + Number(r.amount_ugx ?? 0), 0);

  let payoutsCompletedUgx = 0;
  let payoutsPendingUgx = 0;
  for (const row of payoutsAll ?? []) {
    const amt = Number(row.amount_ugx ?? 0);
    const st = String(row.status ?? '');
    if (st === 'completed') payoutsCompletedUgx += amt;
    if (st === 'pending' || st === 'processing') payoutsPendingUgx += amt;
  }

  let payoutRequestsPendingUgx = 0;
  for (const row of payoutReqs ?? []) {
    const amt = Number(row.amount_ugx ?? 0);
    const st = String(row.status ?? '');
    if (st === 'pending' || st === 'approved') payoutRequestsPendingUgx += amt;
  }

  return Math.max(0, grossCompletedUgx - payoutsCompletedUgx - payoutsPendingUgx - payoutRequestsPendingUgx);
}

/**
 * GET /api/transporter/payout-requests
 * POST /api/transporter/payout-requests
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_payout_requests')
    .select(
      'id, status, amount_ugx, currency, payout_method, transporter_note, admin_note, reviewed_at, created_at, updated_at, paid_transaction_id',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('transporter payout requests list:', error);
    return NextResponse.json({ error: 'Failed to load payout requests' }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      amountUgx: Number(r.amount_ugx ?? 0),
      currency: r.currency ?? 'UGX',
      payoutMethod: r.payout_method ?? null,
      transporterNote: r.transporter_note ?? null,
      adminNote: r.admin_note ?? null,
      reviewedAt: r.reviewed_at ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      paidTransactionId: r.paid_transaction_id ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: any = null;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const amount = asPositiveBigInt(body?.amountUgx);
  if (!amount) return NextResponse.json({ error: 'Amount must be a positive integer (UGX)' }, { status: 400 });

  const transporterNote = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : null;
  const payoutMethod = typeof body?.payoutMethod === 'string' ? body.payoutMethod : null;

  let available: number;
  try {
    available = await computeAvailableUgx(supabase);
  } catch (e) {
    console.error('transporter payout requests available:', e);
    return NextResponse.json({ error: 'Failed to validate available balance' }, { status: 500 });
  }

  if (Number(amount) > available) {
    return NextResponse.json({ error: 'Requested amount exceeds available balance' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('transporter_payout_requests')
    .insert({
      transporter_user_id: auth.userId,
      status: 'pending',
      amount_ugx: amount.toString(),
      currency: 'UGX',
      payout_method: payoutMethod,
      transporter_note: transporterNote,
    })
    .select('id')
    .single();

  if (error) {
    console.error('transporter payout requests create:', error);
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

