import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

/**
 * GET /api/transporter/earnings — transporter-facing ledger summary.
 *
 * Uses `platform_transactions`:
 * - passenger_payment rows are attributed by metadata.transporter_user_id
 * - transporter_payout rows are attributed by counterparty_user_id
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  // Recent sales + payouts.
  const { data: recent, error: recentErr } = await supabase
    .from('platform_transactions')
    .select('id, kind, status, amount_ugx, currency, created_at, completed_at, gateway_reference, external_reference')
    .in('kind', ['passenger_payment', 'transporter_payout'])
    .order('created_at', { ascending: false })
    .limit(25);

  if (recentErr) {
    console.error('transporter earnings recent:', recentErr);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }

  // Totals: completed incoming sales.
  const { data: completedSales, error: salesErr } = await supabase
    .from('platform_transactions')
    .select('amount_ugx')
    .eq('kind', 'passenger_payment')
    .eq('status', 'completed');
  if (salesErr) {
    console.error('transporter earnings sales:', salesErr);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }

  // Totals: payouts pending + completed.
  const { data: payoutsAll, error: payoutErr } = await supabase
    .from('platform_transactions')
    .select('amount_ugx,status')
    .eq('kind', 'transporter_payout');

  if (payoutErr) {
    console.error('transporter earnings payouts:', payoutErr);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }

  const grossCompletedUgx = (completedSales ?? []).reduce((sum, r) => sum + Number(r.amount_ugx ?? 0), 0);
  let payoutsCompletedUgx = 0;
  let payoutsPendingUgx = 0;
  for (const row of payoutsAll ?? []) {
    const amt = Number((row as any).amount_ugx ?? 0);
    const st = String((row as any).status ?? '');
    if (st === 'completed') payoutsCompletedUgx += amt;
    if (st === 'pending' || st === 'processing') payoutsPendingUgx += amt;
  }

  const summary = {
    grossCompletedUgx,
    payoutsCompletedUgx,
    payoutsPendingUgx,
    netUgx: grossCompletedUgx - payoutsCompletedUgx,
  };

  return NextResponse.json({
    summary,
    recent: (recent ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      amountUgx: Number(r.amount_ugx ?? 0),
      currency: r.currency ?? 'UGX',
      createdAt: r.created_at,
      completedAt: r.completed_at ?? null,
      reference: r.gateway_reference ?? r.external_reference ?? null,
    })),
  });
}

