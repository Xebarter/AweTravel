import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRouteRequest } from '@/lib/auth/route-request-user';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { hasSeatConflict } from '@/lib/bookings-seat-conflict';
import { enrichPassengerBookings, type BookingRow } from '@/lib/passenger-bookings-enrich';

export const dynamic = 'force-dynamic';

const patchBodySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  seatCode: z.string().min(1).max(16).optional(),
});

const SELECT_LIST =
  'id,booking_code,passenger_user_id,route_id,departure_id,travel_date,seat_code,status,amount_minor,currency,payment_status,created_at';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/bookings/[id] — one booking for the signed-in passenger (enriched).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const user = await getUserFromRouteRequest(request);
  if (!user) return jsonError('Unauthorized', 401);

  const { id } = await context.params;

  const { data: row, error } = await supabase
    .from('bookings')
    .select(SELECT_LIST)
    .eq('id', id)
    .eq('passenger_user_id', user.id)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error('Bookings [id] GET:', error);
    return jsonError('Not found', 404);
  }

  const admin = createSupabaseAdminClient();
  const [enriched] = await enrichPassengerBookings(admin, [row as BookingRow]);
  return NextResponse.json({ success: true, data: enriched });
}

/**
 * PATCH /api/bookings/[id] — update seat / travel date (pending only) or status.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const user = await getUserFromRouteRequest(request);
  if (!user) return jsonError('Unauthorized', 401);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

  const { status, seatCode, travelDate } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (typeof status !== 'undefined') patch.status = status;
  if (typeof seatCode !== 'undefined') patch.seat_code = seatCode.trim().toUpperCase();
  if (typeof travelDate !== 'undefined') patch.travel_date = travelDate;

  if (Object.keys(patch).length === 0) return jsonError('Nothing to update', 400);

  const admin = createSupabaseAdminClient();

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
    const nextSeat = (seatCode ? (patch.seat_code as string) : (current.seat_code as string))
      .trim()
      .toUpperCase();
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
    .select(SELECT_LIST)
    .maybeSingle();

  if (error || !data) {
    console.error('Bookings [id] PATCH:', error);
    return jsonError('Failed to update booking', 500);
  }

  const [enriched] = await enrichPassengerBookings(admin, [data as BookingRow]);
  return NextResponse.json({ success: true, data: enriched });
}

/**
 * DELETE /api/bookings/[id] — passenger cancels a pending or confirmed booking.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return jsonError('Server misconfigured', 500);

  const user = await getUserFromRouteRequest(request);
  if (!user) return jsonError('Unauthorized', 401);

  const { id } = await context.params;
  const admin = createSupabaseAdminClient();

  const { data: current, error: readErr } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', id)
    .eq('passenger_user_id', user.id)
    .maybeSingle();

  if (readErr || !current) return jsonError('Not found', 404);

  if (current.status === 'cancelled') {
    const { data: row } = await supabase.from('bookings').select(SELECT_LIST).eq('id', id).maybeSingle();
    if (!row) return jsonError('Not found', 404);
    const [enriched] = await enrichPassengerBookings(admin, [row as BookingRow]);
    return NextResponse.json({ success: true, data: enriched });
  }

  if (current.status !== 'pending' && current.status !== 'confirmed') {
    return jsonError('Only pending or confirmed bookings can be cancelled', 409);
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('passenger_user_id', user.id)
    .select(SELECT_LIST)
    .maybeSingle();

  if (error || !data) {
    console.error('Bookings [id] DELETE:', error);
    return jsonError('Failed to cancel booking', 500);
  }

  const [enriched] = await enrichPassengerBookings(admin, [data as BookingRow]);
  return NextResponse.json({ success: true, data: enriched });
}
