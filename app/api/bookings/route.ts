import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import type { PassengerBookingListItem } from '@/lib/types';

type BookingRow = {
  id: string;
  booking_code: string;
  passenger_user_id: string;
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
  // Supabase `time` often returns `HH:MM:SS`
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '00:00';
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const createSchema = z.object({
  routeId: z.string().uuid(),
  departureId: z.string().uuid().optional().nullable(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatCode: z.string().min(1).max(16),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  seatCode: z.string().min(1).max(16).optional(),
});

/**
 * GET /api/bookings
 * Authenticated: returns current user's bookings (enriched for passenger UI).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return jsonError('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  // The Supabase route client is intentionally untyped; keep this query loosely typed
  // to avoid fragile generic inference issues during build.
  const query = supabase
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'passenger_user_id',
        'route_id',
        'departure_id',
        'travel_date',
        'seat_code',
        'status',
        'amount_minor',
        'currency',
        'payment_status',
        'created_at',
      ].join(','),
      { count: 'exact' },
    ) as any;

  const { data: rows, error, count } = await query
    .eq('passenger_user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Bookings GET error:', error);
    return jsonError('Failed to fetch bookings', 500);
  }

  const exactTotal = count ?? 0;
  const bookings: BookingRow[] = ((rows ?? []) as unknown as BookingRow[]);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    // Fallback: return without enrichment
    const lite: PassengerBookingListItem[] = bookings.map((b: BookingRow) => ({
      id: b.id,
      bookingId: b.booking_code,
      tripId: b.route_id,
      route: 'Route',
      seat: b.seat_code,
      date: b.travel_date,
      departureTime: '00:00',
      status: b.status,
      amount: b.amount_minor,
      paymentStatus: b.payment_status,
      createdAt: b.created_at,
    }));
    return NextResponse.json({ success: true, data: lite, total: exactTotal, limit, offset });
  }

  const routeIds = Array.from(new Set(bookings.map((b: BookingRow) => b.route_id)));
  const departureIds = Array.from(new Set(bookings.map((b: BookingRow) => b.departure_id).filter(Boolean))) as string[];

  const [{ data: routes }, { data: departures }] = await Promise.all([
    admin
      .from('transporter_routes')
      .select('id,owner_user_id,origin,destination,base_price_minor,currency')
      .in('id', routeIds),
    departureIds.length
      ? admin
          .from('transporter_route_departures')
          .select('id,route_id,departure_time,price_override_minor')
          .in('id', departureIds)
      : Promise.resolve({ data: [] as DepartureRow[] }),
  ]);

  const owners = Array.from(new Set((routes as RouteRow[] | null)?.map((r) => r.owner_user_id) ?? []));
  const { data: companies } = owners.length
    ? await admin
        .from('transporter_company_profiles')
        .select('owner_user_id,company_name,trading_name')
        .in('owner_user_id', owners)
    : { data: [] as CompanyRow[] };

  const routeById = new Map<string, RouteRow>(((routes as RouteRow[] | null) ?? []).map((r) => [r.id, r]));
  const departureById = new Map<string, DepartureRow>(((departures as DepartureRow[] | null) ?? []).map((d) => [d.id, d]));
  const companyByOwner = new Map<string, CompanyRow>(((companies as CompanyRow[] | null) ?? []).map((c) => [c.owner_user_id, c]));

  const data: PassengerBookingListItem[] = bookings.map((b: BookingRow) => {
    const r = routeById.get(b.route_id);
    const d = b.departure_id ? departureById.get(b.departure_id) : undefined;
    const company = r ? pickCompanyName(companyByOwner.get(r.owner_user_id)) : undefined;
    return {
      id: b.id,
      bookingId: b.booking_code,
      tripId: b.route_id,
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

  return NextResponse.json({ success: true, data, total: exactTotal, limit, offset });
}

/**
 * POST /api/bookings
 * Create a new booking for the signed-in passenger (RLS-protected insert).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return jsonError('Unauthorized', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

  const { routeId, departureId, travelDate, seatCode } = parsed.data;

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const { data: route, error: routeErr } = await admin
    .from('transporter_routes')
    .select('id,base_price_minor,currency,status')
    .eq('id', routeId)
    .maybeSingle();
  if (routeErr || !route || route.status !== 'active') return jsonError('Invalid route', 400);

  let departure: { id: string; route_id: string; status: string; price_override_minor: number | null } | null = null;
  if (departureId) {
    const { data, error } = await admin
      .from('transporter_route_departures')
      .select('id,route_id,status,price_override_minor')
      .eq('id', departureId)
      .maybeSingle();
    if (error || !data || data.route_id !== routeId || data.status !== 'active') return jsonError('Invalid departure', 400);
    departure = data;
  }

  const amountMinor =
    typeof departure?.price_override_minor === 'number' ? departure.price_override_minor : (route.base_price_minor as number);
  const currency = (route.currency as string) || 'UGX';

  const year = new Date().getFullYear();
  const maxAttempts = 4;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bookingCode = `AWE-${year}-${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        booking_code: bookingCode,
        passenger_user_id: user.id,
        route_id: routeId,
        departure_id: departureId ?? null,
        travel_date: travelDate,
        seat_code: seatCode,
        status: 'pending',
        amount_minor: amountMinor,
        currency,
        payment_status: 'pending',
      })
      .select(
        'id,booking_code,route_id,departure_id,travel_date,seat_code,status,amount_minor,currency,payment_status,created_at',
      )
      .maybeSingle();

    if (!error && data) {
      const created = data as BookingRow;
      return NextResponse.json(
        {
          success: true,
          data: {
            id: created.id,
            bookingId: created.booking_code,
            tripId: created.route_id,
            route: 'New booking',
            seat: created.seat_code,
            date: created.travel_date,
            departureTime: '00:00',
            status: created.status,
            amount: created.amount_minor,
            paymentStatus: created.payment_status,
            createdAt: created.created_at,
          } satisfies PassengerBookingListItem,
        },
        { status: 201 },
      );
    }

    lastError = error;
    // Likely booking_code conflict; retry.
  }

  console.error('Booking creation error:', lastError);
  return jsonError('Failed to create booking', 500);
}

/**
 * PATCH /api/bookings
 * Update a passenger booking (typically cancel; or change seat/date while pending).
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return jsonError('Unauthorized', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

  const { id, status, seatCode, travelDate } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (typeof status !== 'undefined') patch.status = status;
  if (typeof seatCode !== 'undefined') patch.seat_code = seatCode;
  if (typeof travelDate !== 'undefined') patch.travel_date = travelDate;

  if (Object.keys(patch).length === 0) return jsonError('Nothing to update', 400);

  // If editing seat/date, require booking to still be pending.
  if ((seatCode || travelDate) && status !== 'cancelled') {
    const { data: current } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', id)
      .eq('passenger_user_id', user.id)
      .maybeSingle();
    if (!current) return jsonError('Not found', 404);
    if (current.status !== 'pending') return jsonError('Only pending bookings can be edited', 409);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .eq('passenger_user_id', user.id)
    .select(
      'id,booking_code,route_id,departure_id,travel_date,seat_code,status,amount_minor,currency,payment_status,created_at',
    )
    .maybeSingle();

  if (error || !data) {
    console.error('Bookings PATCH error:', error);
    return jsonError('Failed to update booking', 500);
  }

  const updated = data as BookingRow;
  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      bookingId: updated.booking_code,
      tripId: updated.route_id,
      route: 'Booking',
      seat: updated.seat_code,
      date: updated.travel_date,
      departureTime: '00:00',
      status: updated.status,
      amount: updated.amount_minor,
      paymentStatus: updated.payment_status,
      createdAt: updated.created_at,
    } satisfies PassengerBookingListItem,
  });
}
