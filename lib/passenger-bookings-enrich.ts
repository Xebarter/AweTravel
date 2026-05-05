import type { SupabaseClient } from '@supabase/supabase-js';
import type { PassengerBookingListItem } from '@/lib/types';

export type BookingRow = {
  id: string;
  booking_code: string;
  passenger_user_id: string | null;
  route_id: string;
  departure_id: string | null;
  travel_date: string;
  seat_code: string;
  status: string;
  amount_minor: number;
  currency: string;
  payment_status: string;
  created_at: string;
};

type RouteRow = {
  id: string;
  owner_user_id: string;
  origin: string;
  destination: string;
  base_price_minor: number;
  currency: string;
};

type DepartureRow = {
  id: string;
  route_id: string;
  departure_time: string;
  price_override_minor: number | null;
};

type CompanyRow = {
  owner_user_id: string;
  company_name: string;
  trading_name: string | null;
};

function buildRouteLabel(r: Pick<RouteRow, 'origin' | 'destination'>) {
  return `${r.origin} — ${r.destination}`;
}

function pickCompanyName(c: CompanyRow | undefined) {
  return c?.trading_name?.trim() || c?.company_name?.trim() || undefined;
}

function safeTimeHHMM(t: string | null | undefined) {
  if (!t) return '00:00';
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '00:00';
}

/** Enrich raw booking rows for passenger UI (route label, departure time, operator name). */
export async function enrichPassengerBookings(
  admin: SupabaseClient | null,
  bookings: BookingRow[],
): Promise<PassengerBookingListItem[]> {
  if (!bookings.length) return [];

  if (!admin) {
    return bookings.map((b) => ({
      id: b.id,
      bookingId: b.booking_code,
      tripId: b.route_id,
      departureId: b.departure_id,
      route: 'Route',
      seat: b.seat_code,
      date: b.travel_date,
      departureTime: '00:00',
      status: b.status,
      amount: b.amount_minor,
      paymentStatus: b.payment_status,
      createdAt: b.created_at,
    }));
  }

  const routeIds = Array.from(new Set(bookings.map((b) => b.route_id)));
  const departureIds = Array.from(new Set(bookings.map((b) => b.departure_id).filter(Boolean))) as string[];

  const [{ data: routes }, { data: departures }] = await Promise.all([
    admin.from('transporter_routes').select('id,owner_user_id,origin,destination,base_price_minor,currency').in('id', routeIds),
    departureIds.length
      ? admin
          .from('transporter_route_departures')
          .select('id,route_id,departure_time,price_override_minor')
          .in('id', departureIds)
      : Promise.resolve({ data: [] as DepartureRow[] }),
  ]);

  const owners = Array.from(new Set((routes as RouteRow[] | null)?.map((r) => r.owner_user_id) ?? []));
  const { data: companies } = owners.length
    ? await admin.from('transporter_company_profiles').select('owner_user_id,company_name,trading_name').in('owner_user_id', owners)
    : { data: [] as CompanyRow[] };

  const routeById = new Map<string, RouteRow>(((routes as RouteRow[] | null) ?? []).map((r) => [r.id, r]));
  const departureById = new Map<string, DepartureRow>(((departures as DepartureRow[] | null) ?? []).map((d) => [d.id, d]));
  const companyByOwner = new Map<string, CompanyRow>(((companies as CompanyRow[] | null) ?? []).map((c) => [c.owner_user_id, c]));

  return bookings.map((b) => {
    const r = routeById.get(b.route_id);
    const d = b.departure_id ? departureById.get(b.departure_id) : undefined;
    const company = r ? pickCompanyName(companyByOwner.get(r.owner_user_id)) : undefined;
    return {
      id: b.id,
      bookingId: b.booking_code,
      tripId: b.route_id,
      departureId: b.departure_id,
      route: r ? buildRouteLabel(r) : 'Unknown route',
      seat: b.seat_code,
      date: b.travel_date,
      departureTime: safeTimeHHMM(d?.departure_time),
      status: b.status,
      amount: b.amount_minor,
      paymentStatus: b.payment_status,
      company,
      createdAt: b.created_at,
    };
  });
}
