import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { getServerPlatformFeeBps } from '@/lib/platform-settings/server';
import { authorizeBookingCheckout, authorizeCheckoutGroup } from '@/lib/payments/booking-checkout-access';
import { buildPaytotaRedirectUrl } from '@/lib/paytota-redirects';
import { createPaytotaPurchase, getPaytotaMinPurchaseUgx, isPaytotaConfigured } from '@/lib/paytota';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const postSchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    checkoutGroupId: z.string().uuid().optional(),
    guestEmail: z.string().email().optional(),
    /** Departure / trip id for post-checkout redirect (optional). */
    tripId: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    const hasBooking = Boolean(v.bookingId);
    const hasGroup = Boolean(v.checkoutGroupId);
    if (hasBooking === hasGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of bookingId or checkoutGroupId',
      });
    }
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

  const { bookingId, checkoutGroupId, guestEmail, tripId: returnTripId } = parsed.data;

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const feeBps = await getServerPlatformFeeBps();

  let paytotaReference: string;
  let ticketMinor: number;
  let currency: string;
  let email: string;
  let fullName: string | undefined;
  let phone: string | undefined;
  let passengerUserId: string | null;
  let paytotaTicketCount = 1;

  if (checkoutGroupId) {
    const gAuth = await authorizeCheckoutGroup(request, { checkoutGroupId, guestEmail });
    if (!gAuth.ok) return jsonError(gAuth.message, gAuth.status);

    const { bookings, user } = gAuth;
    paytotaTicketCount = bookings.length;
    ticketMinor = bookings.reduce((s, b) => s + Math.round(b.amount_minor), 0);
    currency = (bookings[0]?.currency || 'UGX').toUpperCase();
    paytotaReference = checkoutGroupId;
    passengerUserId = bookings[0].passenger_user_id;

    if (passengerUserId && user?.email) {
      email = user.email.trim();
      fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;
      phone = bookings[0].guest_phone?.trim() || undefined;
    } else {
      email = bookings[0].guest_email?.trim() ?? '';
      fullName = bookings[0].guest_full_name?.trim() || undefined;
      phone = bookings[0].guest_phone?.trim() || undefined;
    }
    if (!email) return jsonError('Missing customer email for checkout', 400);
  } else {
    const auth = await authorizeBookingCheckout(request, { bookingId: bookingId!, guestEmail });
    if (!auth.ok) return jsonError(auth.message, auth.status);

    const { booking, user } = auth;

    if (booking.payment_status === 'completed') {
      return jsonError('This booking is already paid', 409);
    }
    if (booking.status === 'cancelled') {
      return jsonError('This booking was cancelled', 409);
    }

    ticketMinor = Math.round(booking.amount_minor);
    currency = (booking.currency || 'UGX').toUpperCase();
    paytotaReference = booking.id;
    passengerUserId = booking.passenger_user_id;

    email =
      booking.passenger_user_id && user?.email
        ? user.email.trim()
        : (booking.guest_email?.trim() ?? '');
    if (!email) {
      return jsonError('Missing customer email for checkout', 400);
    }

    fullName =
      booking.passenger_user_id && user
        ? (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined)
        : (booking.guest_full_name?.trim() || undefined);

    phone = booking.guest_phone?.trim() || undefined;
  }

  const totalMinor = ticketMinor + platformFeeFromBps(ticketMinor, feeBps);
  const minUgx = getPaytotaMinPurchaseUgx();
  if (currency === 'UGX' && minUgx > 0 && totalMinor < minUgx) {
    return jsonError(
      `Checkout amount is below the Paytota minimum (${minUgx} UGX). Adjust PAYTOTA_MIN_PURCHASE_UGX or pricing.`,
      400,
    );
  }

  const returnQuery: Record<string, string> = checkoutGroupId
    ? { checkoutGroupId }
    : { bookingId: bookingId! };
  if (returnTripId) returnQuery.tripId = returnTripId;
  if (!passengerUserId && email) returnQuery.guestEmail = email;

  const successRedirect = buildPaytotaRedirectUrl(process.env.PAYTOTA_SUCCESS_REDIRECT, {
    ...returnQuery,
    status: 'success',
  });
  const failureRedirect = buildPaytotaRedirectUrl(process.env.PAYTOTA_FAILURE_REDIRECT, {
    ...returnQuery,
    status: 'failure',
  });
  const cancelRedirect = buildPaytotaRedirectUrl(process.env.PAYTOTA_CANCEL_REDIRECT ?? process.env.PAYTOTA_FAILURE_REDIRECT, {
    ...returnQuery,
    status: 'cancelled',
  });

  const created = await createPaytotaPurchase({
    bookingId: paytotaReference,
    amountMinor: totalMinor,
    currency,
    ticketCount: paytotaTicketCount,
    client: {
      email,
      full_name: fullName,
      phone,
      country: 'UG',
    },
    successRedirect,
    failureRedirect,
    cancelRedirect,
  });

  if (!created.ok) {
    console.error('[Paytota] create purchase failed:', created.message, created.status);
    return jsonError(created.message, created.status && created.status >= 400 && created.status < 600 ? created.status : 502);
  }

  const updBase = admin.from('bookings').update({ payment_reference: created.id }).in('payment_status', ['pending']);
  const { error: updErr } = checkoutGroupId
    ? await updBase.eq('checkout_group_id', checkoutGroupId)
    : await updBase.eq('id', bookingId!);

  if (updErr) {
    console.error('[Paytota] failed to store payment_reference:', updErr);
    return jsonError('Could not link payment to booking', 500);
  }

  return NextResponse.json({
    success: true,
    checkoutUrl: created.checkout_url,
    purchaseId: created.id,
    totalMinor,
    currency,
  });
}
