import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { getUserFromRouteRequest } from '@/lib/auth/route-request-user';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export type BookingCheckoutRow = {
  id: string;
  booking_code: string;
  passenger_user_id: string | null;
  guest_email: string | null;
  guest_full_name: string | null;
  guest_phone: string | null;
  amount_minor: number;
  currency: string;
  payment_status: string;
  status: string;
  payment_reference: string | null;
};

function jsonError(message: string, status: number) {
  return { ok: false as const, status, message };
}

export async function authorizeBookingCheckout(
  request: NextRequest,
  params: {
    bookingId: string;
    guestEmail?: string | null;
  },
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; booking: BookingCheckoutRow; user: User | null }
> {
  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'passenger_user_id',
        'guest_email',
        'guest_full_name',
        'guest_phone',
        'amount_minor',
        'currency',
        'payment_status',
        'status',
        'payment_reference',
      ].join(','),
    )
    .eq('id', params.bookingId)
    .maybeSingle();

  if (error || !booking) return jsonError('Booking not found', 404);

  const row = booking as unknown as BookingCheckoutRow;

  if (row.passenger_user_id) {
    const user = await getUserFromRouteRequest(request);
    if (!user) {
      return jsonError('Sign in to complete payment', 401);
    }
    if (user.id !== row.passenger_user_id) {
      return jsonError('Forbidden', 403);
    }
    return { ok: true, booking: row, user };
  }

  const email = params.guestEmail?.trim().toLowerCase();
  const g = row.guest_email?.trim().toLowerCase();
  if (!email || !g || email !== g) {
    return jsonError('Invalid guest credentials', 403);
  }

  const user = await getUserFromRouteRequest(request);
  return { ok: true, booking: row, user };
}

export type CheckoutGroupBookingRow = BookingCheckoutRow & { checkout_group_id: string | null };

/**
 * Authorize payment for a multi-seat checkout: all rows share checkout_group_id, same passenger/guest, all unpaid pending.
 */
export async function authorizeCheckoutGroup(
  request: NextRequest,
  params: {
    checkoutGroupId: string;
    guestEmail?: string | null;
  },
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; bookings: CheckoutGroupBookingRow[]; user: User | null }
> {
  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'passenger_user_id',
        'guest_email',
        'guest_full_name',
        'guest_phone',
        'amount_minor',
        'currency',
        'payment_status',
        'status',
        'payment_reference',
        'checkout_group_id',
      ].join(','),
    )
    .eq('checkout_group_id', params.checkoutGroupId)
    .order('seat_code', { ascending: true });

  if (error || !rows?.length) return jsonError('Checkout not found', 404);

  const list = rows as unknown as CheckoutGroupBookingRow[];

  for (const b of list) {
    if (b.payment_status === 'completed') return jsonError('This checkout is already paid', 409);
    if (b.status === 'cancelled') return jsonError('This checkout was cancelled', 409);
  }

  const first = list[0];
  if (first.passenger_user_id) {
    const user = await getUserFromRouteRequest(request);
    if (!user) return jsonError('Sign in to complete payment', 401);
    if (!list.every((b) => b.passenger_user_id === user.id)) {
      return jsonError('Forbidden', 403);
    }
    return { ok: true, bookings: list, user };
  }

  const email = params.guestEmail?.trim().toLowerCase();
  const g = first.guest_email?.trim().toLowerCase();
  if (!email || !g || email !== g) {
    return jsonError('Invalid guest credentials', 403);
  }
  if (!list.every((b) => (b.guest_email?.trim().toLowerCase() ?? '') === email)) {
    return jsonError('Invalid guest credentials', 403);
  }

  const user = await getUserFromRouteRequest(request);
  return { ok: true, bookings: list, user };
}
