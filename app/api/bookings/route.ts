import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRouteRequest } from '@/lib/auth/route-request-user';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { hasSeatConflict } from '@/lib/bookings-seat-conflict';
import { enrichPassengerBookings, type BookingRow } from '@/lib/passenger-bookings-enrich';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const createSchema = z.object({
  routeId: z.string().uuid(),
  departureId: z.string().uuid().optional().nullable(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatCode: z.string().min(1).max(16),
  guestFullName: z.string().trim().min(1).max(200).optional(),
  guestEmail: z.string().trim().email().optional(),
  guestPhone: z.string().trim().max(32).optional().nullable(),
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

  const user = await getUserFromRouteRequest(request);
  if (!user) return jsonError('Unauthorized', 401);

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
  const data = await enrichPassengerBookings(admin, bookings);

  return NextResponse.json({ success: true, data, total: exactTotal, limit, offset });
}

/**
 * POST /api/bookings
 * Create a booking: signed-in passengers use RLS; guests use service role with contact details.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

  const { routeId, departureId, travelDate, seatCode, guestFullName, guestEmail, guestPhone } = parsed.data;

  const user = await getUserFromRouteRequest(request);

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  if (!user) {
    if (!guestFullName || !guestEmail) {
      return jsonError('Sign in to book, or provide guest full name and email', 401);
    }
  }

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

  const normalizedSeat = seatCode.trim().toUpperCase();
  if (departureId) {
    const taken = await hasSeatConflict(admin, {
      departureId,
      travelDate,
      seatCode: normalizedSeat,
    });
    if (taken) return jsonError('Seat is no longer available', 409);
  }

  const year = new Date().getFullYear();
  const maxAttempts = 4;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bookingCode = `AWE-${year}-${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`;
    const insertRow = !user
      ? {
          booking_code: bookingCode,
          passenger_user_id: null as string | null,
          guest_full_name: guestFullName!,
          guest_email: guestEmail!,
          guest_phone: guestPhone?.trim() ? guestPhone.trim() : null,
          route_id: routeId,
          departure_id: departureId ?? null,
          travel_date: travelDate,
          seat_code: normalizedSeat,
          status: 'pending',
          amount_minor: amountMinor,
          currency,
          payment_status: 'pending',
        }
      : {
          booking_code: bookingCode,
          passenger_user_id: user.id,
          route_id: routeId,
          departure_id: departureId ?? null,
          travel_date: travelDate,
          seat_code: normalizedSeat,
          status: 'pending',
          amount_minor: amountMinor,
          currency,
          payment_status: 'pending',
        };

    const client = !user ? admin : supabase;
    const { data, error } = await client
      .from('bookings')
      .insert(insertRow)
      .select(
        'id,booking_code,route_id,departure_id,travel_date,seat_code,status,amount_minor,currency,payment_status,created_at',
      )
      .maybeSingle();

    if (!error && data) {
      const created = data as BookingRow;
      const [enriched] = await enrichPassengerBookings(admin, [created]);
      return NextResponse.json({ success: true, data: enriched }, { status: 201 });
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

  const user = await getUserFromRouteRequest(request);
  if (!user) return jsonError('Unauthorized', 401);

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
  if (typeof seatCode !== 'undefined') patch.seat_code = seatCode.trim().toUpperCase();
  if (typeof travelDate !== 'undefined') patch.travel_date = travelDate;

  if (Object.keys(patch).length === 0) return jsonError('Nothing to update', 400);

  const admin = createSupabaseAdminClient();

  // If editing seat/date, require booking to still be pending and seat still free.
  if ((seatCode || travelDate) && status !== 'cancelled') {
    const { data: current } = await supabase
      .from('bookings')
      .select('status,departure_id,travel_date,seat_code')
      .eq('id', id)
      .eq('passenger_user_id', user.id)
      .maybeSingle();
    if (!current) return jsonError('Not found', 404);
    if (current.status !== 'pending') return jsonError('Only pending bookings can be edited', 409);

    const nextDate = (travelDate ?? current.travel_date) as string;
    const nextSeat = (
      seatCode ? (patch.seat_code as string) : (current.seat_code as string)
    ).trim().toUpperCase();
    if (current.departure_id && admin) {
      const taken = await hasSeatConflict(admin, {
        departureId: current.departure_id,
        travelDate: nextDate,
        seatCode: nextSeat,
        exceptBookingId: id,
      });
      if (taken) return jsonError('Seat is no longer available', 409);
    }
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
  const [enriched] = await enrichPassengerBookings(admin, [updated]);
  return NextResponse.json({
    success: true,
    data: enriched,
  });
}
