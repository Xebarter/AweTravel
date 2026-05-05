import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { getServerPlatformFeeBps } from '@/lib/platform-settings/server';
import { authorizeBookingCheckout } from '@/lib/payments/booking-checkout-access';
import { createPaytotaPurchase, isPaytotaConfigured } from '@/lib/paytota';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function publicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

const postSchema = z.object({
  bookingId: z.string().uuid(),
  guestEmail: z.string().email().optional(),
  /** Departure / trip id for post-checkout redirect (optional). */
  tripId: z.string().uuid().optional(),
});

/**
 * POST /api/payments
 * Creates a Paytota purchase and returns checkout_url (redirect the passenger).
 */
export async function POST(request: NextRequest) {
  if (!isPaytotaConfigured()) {
    return jsonError('Payment gateway is not configured', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
  }

  const { bookingId, guestEmail, tripId: returnTripId } = parsed.data;

  const auth = await authorizeBookingCheckout(request, { bookingId, guestEmail });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { booking, user } = auth;

  if (booking.payment_status === 'completed') {
    return jsonError('This booking is already paid', 409);
  }
  if (booking.status === 'cancelled') {
    return jsonError('This booking was cancelled', 409);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const feeBps = await getServerPlatformFeeBps();
  const ticketMinor = Math.round(booking.amount_minor);
  const totalMinor = ticketMinor + platformFeeFromBps(ticketMinor, feeBps);

  const email =
    booking.passenger_user_id && user?.email
      ? user.email.trim()
      : (booking.guest_email?.trim() ?? '');
  if (!email) {
    return jsonError('Missing customer email for checkout', 400);
  }

  const fullName =
    booking.passenger_user_id && user
      ? (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined)
      : (booking.guest_full_name?.trim() || undefined);

  const phone = booking.guest_phone?.trim() || undefined;

  const base = publicAppUrl();
  const tripQ = returnTripId ? `&tripId=${encodeURIComponent(returnTripId)}` : '';
  const guestQ =
    !booking.passenger_user_id && email
      ? `&guestEmail=${encodeURIComponent(email)}`
      : '';
  const successRedirect = `${base}/passenger/payment/return?bookingId=${encodeURIComponent(booking.id)}&status=success${tripQ}${guestQ}`;
  const failureRedirect = `${base}/passenger/payment/return?bookingId=${encodeURIComponent(booking.id)}&status=failure${tripQ}${guestQ}`;

  const created = await createPaytotaPurchase({
    bookingId: booking.id,
    amountMinor: totalMinor,
    currency: booking.currency || 'UGX',
    client: {
      email,
      full_name: fullName,
      phone,
      country: 'UG',
    },
    successRedirect,
    failureRedirect,
    cancelRedirect: failureRedirect,
  });

  if (!created.ok) {
    console.error('[Paytota] create purchase failed:', created.message, created.status);
    return jsonError(created.message, created.status && created.status >= 400 && created.status < 600 ? created.status : 502);
  }

  const { error: updErr } = await admin
    .from('bookings')
    .update({ payment_reference: created.id })
    .eq('id', booking.id)
    .in('payment_status', ['pending']);

  if (updErr) {
    console.error('[Paytota] failed to store payment_reference:', updErr);
    return jsonError('Could not link payment to booking', 500);
  }

  return NextResponse.json({
    success: true,
    checkoutUrl: created.checkout_url,
    purchaseId: created.id,
    totalMinor,
    currency: booking.currency || 'UGX',
  });
}
