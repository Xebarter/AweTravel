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

  const [{ count: routesActive, error: routesErr }, { count: vehiclesOnline, error: vehiclesErr }] =
    await Promise.all([
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
    ]);

  if (routesErr) {
    console.error('transporter dashboard routes:', routesErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
  if (vehiclesErr) {
    console.error('transporter dashboard vehicles:', vehiclesErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }

  // Departures + simple “weekly revenue estimate” = sum(price_per_departure * #days_in_week)
  // for active routes + active departures. This is an estimate only.
  const { data: departureRows, error: depErr } = await supabase
    .from('transporter_route_departures')
    .select(
      `
        days_of_week,
        status,
        price_override_minor,
        route:transporter_routes!inner(owner_user_id, status, base_price_minor, currency)
      `,
    )
    .eq('status', 'active')
    .eq('route.owner_user_id', userId)
    .eq('route.status', 'active');

  if (depErr) {
    console.error('transporter dashboard departures:', depErr);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }

  const departuresActive = (departureRows ?? []).length;
  let currency: string | null = null;
  let weeklyRevenueMinor = 0;

  for (const row of departureRows ?? []) {
    const route = (row as any).route as { base_price_minor: number; currency: string } | null;
    if (!route) continue;
    currency = currency ?? route.currency ?? null;
    const priceMinor = Number((row as any).price_override_minor ?? route.base_price_minor ?? 0);
    const daysMask = Number((row as any).days_of_week ?? 0);
    const daysInWeek = countDaysOfWeek(daysMask);
    weeklyRevenueMinor += priceMinor * daysInWeek;
  }

  return NextResponse.json({
    routesActive: routesActive ?? 0,
    vehiclesOnline: vehiclesOnline ?? 0,
    departuresActive,
    weeklyRevenueMinor,
    currency: currency ?? 'UGX',
  });
}

function countDaysOfWeek(mask: number): number {
  // mask is 1..127 bitmask for 7 days.
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if ((mask & (1 << i)) !== 0) n++;
  }
  return n;
}

