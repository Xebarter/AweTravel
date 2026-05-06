import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { authorizeBookingCheckout, authorizeCheckoutGroup } from '@/lib/payments/booking-checkout-access';
import { fetchPaytotaPurchase } from '@/lib/paytota';
import { trySendTicketEmail } from '@/lib/ticket-email';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const querySchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    checkoutGroupId: z.string().uuid().optional(),
    guestEmail: z.string().email().optional(),
  })
  .superRefine((v, ctx) => {
    const a = Boolean(v.bookingId);
    const b = Boolean(v.checkoutGroupId);
    if (a === b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of bookingId or checkoutGroupId',
      });
    }
  });

/**
 * GET /api/payments/status?bookingId= | checkoutGroupId= &guestEmail=
 * Polls Paytota for the purchase linked on the booking(s) and syncs local state when paid.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    bookingId: searchParams.get('bookingId') ?? undefined,
    checkoutGroupId: searchParams.get('checkoutGroupId') ?? undefined,
    guestEmail: searchParams.get('guestEmail') ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid query', 400);
  }

  const { bookingId, checkoutGroupId, guestEmail } = parsed.data;
  const refForUpdate = checkoutGroupId ?? bookingId!;

  if (checkoutGroupId) {
    const auth = await authorizeCheckoutGroup(request, { checkoutGroupId, guestEmail });
    if (!auth.ok) return jsonError(auth.message, auth.status);

    const { bookings } = auth;
    const allCompleted = bookings.every((b) => b.payment_status === 'completed');
    if (allCompleted) {
      return NextResponse.json({
        success: true,
        data: {
          bookingPaymentStatus: 'completed',
          paytotaStatus: 'paid',
          synced: false,
          bookingIds: bookings.map((b) => b.id),
        },
      });
    }

    const purchaseId = bookings[0]?.payment_reference?.trim();
    if (!purchaseId) {
      return NextResponse.json({
        success: true,
        data: {
          bookingPaymentStatus: bookings[0]?.payment_status,
          paytotaStatus: null,
          synced: false,
          bookingIds: bookings.map((b) => b.id),
        },
      });
    }

    const paytota = await fetchPaytotaPurchase(purchaseId);
    const paytotaStatus = typeof paytota?.status === 'string' ? paytota.status : null;

    let synced = false;
    let bookingIds: string[] = bookings.map((b) => b.id);
    if (paytotaStatus === 'paid') {
      const admin = createSupabaseAdminClient();
      if (admin) {
        const { error, data } = await admin
          .from('bookings')
          .update({
            payment_status: 'completed',
            status: 'confirmed',
          })
          .or(`id.eq.${refForUpdate},checkout_group_id.eq.${refForUpdate}`)
          .eq('payment_reference', purchaseId)
          .in('payment_status', ['pending'])
          .select('id');
        if (!error && data?.length) {
          synced = true;
          bookingIds = (data as { id: string }[]).map((r) => r.id);
          for (const row of data as { id: string }[]) {
            void trySendTicketEmail(row.id);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingPaymentStatus: synced ? 'completed' : bookings[0]?.payment_status,
        paytotaStatus,
        synced,
        bookingIds,
      },
    });
  }

  const auth = await authorizeBookingCheckout(request, { bookingId: bookingId!, guestEmail });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { booking } = auth;

  if (booking.payment_status === 'completed') {
    return NextResponse.json({
      success: true,
      data: {
        bookingPaymentStatus: 'completed',
        paytotaStatus: 'paid',
        synced: false,
        bookingIds: [booking.id],
      },
    });
  }

  const purchaseId = booking.payment_reference?.trim();
  if (!purchaseId) {
    return NextResponse.json({
      success: true,
      data: {
        bookingPaymentStatus: booking.payment_status,
        paytotaStatus: null,
        synced: false,
        bookingIds: [booking.id],
      },
    });
  }

  const paytota = await fetchPaytotaPurchase(purchaseId);
  const paytotaStatus = typeof paytota?.status === 'string' ? paytota.status : null;

  let synced = false;
  let bookingIds: string[] = [booking.id];
  if (paytotaStatus === 'paid') {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { error, data } = await admin
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
        })
        .or(`id.eq.${refForUpdate},checkout_group_id.eq.${refForUpdate}`)
        .eq('payment_reference', purchaseId)
        .in('payment_status', ['pending'])
        .select('id');
      if (!error && data?.length) {
        synced = true;
        bookingIds = (data as { id: string }[]).map((r) => r.id);
        for (const row of data as { id: string }[]) {
          void trySendTicketEmail(row.id);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      bookingPaymentStatus: synced ? 'completed' : booking.payment_status,
      paytotaStatus,
      synced,
      bookingIds,
    },
  });
}
