import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { getServerPlatformFeeBps } from '@/lib/platform-settings/server';
import { authorizeBookingCheckout } from '@/lib/payments/booking-checkout-access';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const querySchema = z.object({
  bookingId: z.string().uuid(),
  guestEmail: z.string().email().optional(),
});

/**
 * GET /api/payments/preview?bookingId=&guestEmail=
 * Returns ticket total, platform fee, and charge total for the payment page (authorized).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    bookingId: searchParams.get('bookingId'),
    guestEmail: searchParams.get('guestEmail') ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid query', 400);
  }

  const { bookingId, guestEmail } = parsed.data;

  const auth = await authorizeBookingCheckout(request, { bookingId, guestEmail });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { booking } = auth;
  if (booking.payment_status === 'completed') {
    return jsonError('This booking is already paid', 409);
  }
  if (booking.status === 'cancelled') {
    return jsonError('This booking was cancelled', 409);
  }

  const feeBps = await getServerPlatformFeeBps();
  const ticketMinor = Math.round(booking.amount_minor);
  const feeMinor = platformFeeFromBps(ticketMinor, feeBps);
  const totalMinor = ticketMinor + feeMinor;

  return NextResponse.json({
    success: true,
    data: {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      currency: booking.currency,
      ticketMinor,
      platformFeeBps: feeBps,
      platformFeeMinor: feeMinor,
      totalMinor,
    },
  });
}
