import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import type { Booking, BookingStatus, BookingPaymentStatus } from '@/lib/bookings/types';

const statusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed'] satisfies [
  BookingStatus,
  BookingStatus,
  BookingStatus,
  BookingStatus,
]);

const paymentStatusSchema = z.enum(['pending', 'completed', 'failed', 'cancelled'] satisfies [
  BookingPaymentStatus,
  BookingPaymentStatus,
  BookingPaymentStatus,
  BookingPaymentStatus,
]);

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.union([statusSchema, z.literal('all')]).optional().default('all'),
  paymentStatus: z.union([paymentStatusSchema, z.literal('all')]).optional().default('all'),
  from: z.string().trim().optional(), // YYYY-MM-DD
  to: z.string().trim().optional(), // YYYY-MM-DD
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const SELECT = `
  id,
  booking_code,
  passenger_user_id,
  route_id,
  departure_id,
  travel_date,
  seat_code,
  status,
  amount_minor,
  currency,
  payment_status,
  payment_reference,
  created_at,
  updated_at,
  passenger:users!bookings_passenger_user_id_fkey(full_name,email),
  route:transporter_routes!bookings_route_id_fkey(route_code,origin,destination),
  departure:transporter_route_departures!bookings_departure_id_fkey(departure_time)
`;

function rowToBooking(row: any): Booking {
  const routeCode = row.route?.route_code ?? '';
  const origin = row.route?.origin ?? '';
  const destination = row.route?.destination ?? '';
  return {
    id: row.id,
    bookingCode: row.booking_code,
    passengerUserId: row.passenger_user_id,
    passengerName: row.passenger?.full_name ?? null,
    passengerEmail: row.passenger?.email ?? null,
    routeId: row.route_id,
    routeCode,
    routeLabel: origin && destination ? `${origin} → ${destination}` : routeCode,
    departureId: row.departure_id ?? null,
    departureTime: row.departure?.departure_time ?? null,
    travelDate: row.travel_date,
    seatCode: row.seat_code,
    status: row.status,
    amountMinor: Number(row.amount_minor ?? 0),
    currency: row.currency ?? 'UGX',
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/transporter/bookings — list bookings belonging to this transporter's routes.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }
  const { q, status, paymentStatus, from, to, limit, offset } = parsed.data;

  // RLS already restricts rows to transporter-owned routes; we additionally filter by owner for index leverage.
  let query = supabase
    .from('bookings')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter to transporter-owned routes via join filter on route owner.
  // PostgREST supports filtering on joined fields via dotted syntax when using embedded resources.
  query = query.eq('route.owner_user_id', auth.userId);

  if (status !== 'all') query = query.eq('status', status);
  if (paymentStatus !== 'all') query = query.eq('payment_status', paymentStatus);
  if (from) query = query.gte('travel_date', from);
  if (to) query = query.lte('travel_date', to);
  if (q) {
    const pat = `%${q.replace(/%/g, '').slice(0, 64)}%`;
    query = query.or(
      `booking_code.ilike.${pat},seat_code.ilike.${pat},passenger.email.ilike.${pat},passenger.full_name.ilike.${pat},route.route_code.ilike.${pat}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('transporter bookings list:', error);
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
  }

  return NextResponse.json({ bookings: (data ?? []).map(rowToBooking) });
}

