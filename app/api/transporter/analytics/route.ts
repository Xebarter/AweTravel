import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

/**
 * GET /api/transporter/analytics
 *
 * Provides chart-ready aggregates for the transporter dashboard.
 * - weeklyRevenueBookings: last 7 days revenue + bookings count (completed payments)
 * - bookingsTrend: last 6 days bookings count
 * - recentActivity: latest bookings for routes owned by this transporter
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const userId = auth.userId;
  const url = new URL(request.url);
  const currency = url.searchParams.get('currency') || 'UGX';

  const days7 = lastNDates(7);
  const from7 = days7[0]!;
  const days6 = lastNDates(6);
  const from6 = days6[0]!;

  // Bookings aggregates over travel_date (not created_at) for better ops analytics.
  const { data: bookingRows7, error: bErr7 } = await supabase
    .from('bookings')
    .select(
      'travel_date, amount_minor, currency, payment_status, route:transporter_routes!inner(owner_user_id)',
    )
    .eq('route.owner_user_id', userId)
    .gte('travel_date', from7)
    .lte('travel_date', days7[days7.length - 1]!)
    .eq('payment_status', 'completed');

  if (bErr7) {
    console.error('transporter analytics bookings7:', bErr7);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }

  const revenueByDay = new Map<string, number>();
  const bookingsByDay = new Map<string, number>();

  for (const r of bookingRows7 ?? []) {
    const day = (r as any).travel_date as string;
    const amt = Number((r as any).amount_minor ?? 0);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + amt);
    bookingsByDay.set(day, (bookingsByDay.get(day) ?? 0) + 1);
  }

  const weeklyRevenueBookings = days7.map((day) => ({
    day,
    revenueMinor: revenueByDay.get(day) ?? 0,
    bookings: bookingsByDay.get(day) ?? 0,
    currency,
  }));

  // Bookings trend (count) for last 6 days (any payment status).
  const { data: bookingRows6, error: bErr6 } = await supabase
    .from('bookings')
    .select('travel_date, route:transporter_routes!inner(owner_user_id)')
    .eq('route.owner_user_id', userId)
    .gte('travel_date', from6)
    .lte('travel_date', days6[days6.length - 1]!);

  if (bErr6) {
    console.error('transporter analytics bookings6:', bErr6);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }

  const countByDay = new Map<string, number>();
  for (const r of bookingRows6 ?? []) {
    const day = (r as any).travel_date as string;
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }

  const bookingsTrend = days6.map((day) => ({
    day,
    bookings: countByDay.get(day) ?? 0,
  }));

  // Recent activity: latest bookings (any payment status) for this transporter's routes.
  const { data: recent, error: rErr } = await supabase
    .from('bookings')
    .select(
      `
        id,
        booking_code,
        travel_date,
        seat_code,
        status,
        payment_status,
        amount_minor,
        currency,
        created_at,
        guest_full_name,
        guest_email,
        passenger:users!bookings_passenger_user_id_fkey(full_name,email),
        route:transporter_routes!inner(owner_user_id,route_code,origin,destination)
      `,
    )
    .eq('route.owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (rErr) {
    console.error('transporter analytics recent:', rErr);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }

  const recentActivity = (recent ?? []).map((row: any) => ({
    id: row.id,
    bookingCode: row.booking_code,
    travelDate: row.travel_date,
    routeCode: row.route?.route_code ?? '',
    routeLabel: row.route ? `${row.route.origin} → ${row.route.destination}` : '',
    passengerName:
      row.passenger?.full_name ?? row.passenger?.email ?? row.guest_full_name ?? row.guest_email ?? null,
    seatCode: row.seat_code,
    status: row.status,
    paymentStatus: row.payment_status,
    amountMinor: Number(row.amount_minor ?? 0),
    currency: row.currency ?? 'UGX',
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    weeklyRevenueBookings,
    bookingsTrend,
    recentActivity,
  });
}

