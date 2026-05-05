import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

/**
 * GET /api/transporter/dashboard — transporter console KPI metrics.
 *
 * Note: This intentionally uses simple counts/sums on existing transporter tables.
 * Booking/payment KPIs can be added once those tables are wired in.
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { userId } = auth;

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: routesActive, error: routesErr },
    { count: vehiclesOnline, error: vehiclesErr },
    { count: departuresActive, error: depCountErr },
  ] = await Promise.all([
    supabase
      .from('transporter_routes')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('transporter_vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('status', 'active'),
    supabase
      .from('transporter_route_departures')
      .select('id, route:transporter_routes!inner(owner_user_id,status)', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('route.owner_user_id', userId)
      .eq('route.status', 'active'),
  ]);

  if (routesErr) {
    console.error('transporter dashboard routes:', routesErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
  if (vehiclesErr) {
    console.error('transporter dashboard vehicles:', vehiclesErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
  if (depCountErr) {
    console.error('transporter dashboard departures count:', depCountErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }

  // Weekly revenue (real): completed bookings in last 7 days for routes owned by this transporter.
  // Note: this uses bookings table; payment linkage to platform_transactions is optional and can be added later.
  const { data: weeklyBookings, error: wkErr } = await supabase
    .from('bookings')
    .select('amount_minor,currency,route:transporter_routes!inner(owner_user_id)')
    .eq('payment_status', 'completed')
    .gte('created_at', sevenDaysAgoIso)
    .eq('route.owner_user_id', userId);

  if (wkErr) {
    console.error('transporter dashboard weekly bookings:', wkErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }

  let currency: string | null = null;
  let weeklyRevenueMinor = 0;
  for (const row of weeklyBookings ?? []) {
    currency = currency ?? (row as any).currency ?? null;
    weeklyRevenueMinor += Number((row as any).amount_minor ?? 0);
  }

  // Pending payouts from platform ledger (requires transporter-select policies).
  const { data: pendingPayoutRows, error: payoutErr } = await supabase
    .from('platform_transactions')
    .select('id', { count: 'exact' })
    .eq('kind', 'transporter_payout')
    .in('status', ['pending', 'processing']);

  if (payoutErr) {
    console.error('transporter dashboard payouts:', payoutErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
  const pendingPayouts = pendingPayoutRows?.length ?? 0;

  return NextResponse.json({
    routesActive: routesActive ?? 0,
    vehiclesOnline: vehiclesOnline ?? 0,
    departuresActive: departuresActive ?? 0,
    weeklyRevenueMinor,
    currency: currency ?? 'UGX',
    pendingPayouts,
  });
}

