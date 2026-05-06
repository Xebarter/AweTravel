import type { SupabaseClient } from '@supabase/supabase-js';

export type TicketPdfDetails = {
  bookingId: string;
  bookingCode: string;
  passengerName: string;
  routeLabel: string;
  seatCode: string;
  travelDate: string;
  departureTime: string;
  companyName: string | undefined;
  amountMinor: number;
  currency: string;
};

function buildRouteLabel(origin: string, destination: string) {
  return `${origin} — ${destination}`;
}

function safeTimeHHMM(t: string | null | undefined) {
  if (!t) return '—';
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '—';
}

/** Loads booking + route/departure/company for PDF / email (service role). */
export async function loadTicketPdfDetails(
  admin: SupabaseClient,
  bookingId: string,
): Promise<TicketPdfDetails | null> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'passenger_user_id',
        'guest_full_name',
        'route_id',
        'departure_id',
        'travel_date',
        'seat_code',
        'status',
        'payment_status',
        'amount_minor',
        'currency',
      ].join(','),
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !b) {
    if (error) console.error('[ticket-details] booking load:', error);
    return null;
  }

  const row = b as unknown as {
    id: string;
    booking_code: string;
    passenger_user_id: string | null;
    guest_full_name: string | null;
    route_id: string;
    departure_id: string | null;
    travel_date: string;
    seat_code: string;
    status: string;
    payment_status: string;
    amount_minor: number;
    currency: string;
  };

  if (row.payment_status !== 'completed' || !['confirmed', 'completed'].includes(row.status)) {
    return null;
  }

  let passengerName = row.guest_full_name?.trim() || 'Passenger';
  if (row.passenger_user_id) {
    const { data: u } = await admin.from('users').select('full_name').eq('id', row.passenger_user_id).maybeSingle();
    const fn = (u as { full_name?: string } | null)?.full_name?.trim();
    if (fn) passengerName = fn;
  }

  const { data: route } = await admin
    .from('transporter_routes')
    .select('id,owner_user_id,origin,destination')
    .eq('id', row.route_id)
    .maybeSingle();

  const r = route as { owner_user_id: string; origin: string; destination: string } | null;
  if (!r) return null;

  let departureTime = '—';
  if (row.departure_id) {
    const { data: dep } = await admin
      .from('transporter_route_departures')
      .select('departure_time')
      .eq('id', row.departure_id)
      .maybeSingle();
    departureTime = safeTimeHHMM((dep as { departure_time?: string } | null)?.departure_time);
  }

  const { data: company } = await admin
    .from('transporter_company_profiles')
    .select('company_name,trading_name')
    .eq('owner_user_id', r.owner_user_id)
    .maybeSingle();

  const c = company as { company_name?: string; trading_name?: string | null } | null;
  const companyName = c?.trading_name?.trim() || c?.company_name?.trim() || undefined;

  return {
    bookingId: row.id,
    bookingCode: row.booking_code,
    passengerName,
    routeLabel: buildRouteLabel(r.origin, r.destination),
    seatCode: row.seat_code,
    travelDate: row.travel_date,
    departureTime,
    companyName,
    amountMinor: row.amount_minor,
    currency: row.currency || 'UGX',
  };
}
