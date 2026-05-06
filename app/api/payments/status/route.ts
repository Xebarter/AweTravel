import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { authorizeBookingCheckout } from '@/lib/payments/booking-checkout-access';
import { fetchPaytotaPurchase } from '@/lib/paytota';
import { trySendTicketEmail } from '@/lib/ticket-email';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const querySchema = z.object({
  bookingId: z.string().uuid(),
  guestEmail: z.string().email().optional(),
});

/**
 * GET /api/payments/status?bookingId=&guestEmail=
 * Polls Paytota for the purchase linked on the booking and syncs local state when paid.
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
    return NextResponse.json({
      success: true,
      data: { bookingPaymentStatus: 'completed', paytotaStatus: 'paid', synced: false },
    });
  }

  const purchaseId = booking.payment_reference?.trim();
  if (!purchaseId) {
    return NextResponse.json({
      success: true,
      data: { bookingPaymentStatus: booking.payment_status, paytotaStatus: null, synced: false },
    });
  }

  const paytota = await fetchPaytotaPurchase(purchaseId);
  const paytotaStatus = typeof paytota?.status === 'string' ? paytota.status : null;

  let synced = false;
  if (paytotaStatus === 'paid') {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { error } = await admin
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
        })
        .eq('id', booking.id)
        .in('payment_status', ['pending']);
      if (!error) {
        synced = true;
        void trySendTicketEmail(booking.id);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      bookingPaymentStatus: synced ? 'completed' : booking.payment_status,
      paytotaStatus,
      synced,
    },
  });
}
