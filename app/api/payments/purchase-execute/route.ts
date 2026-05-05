import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeBookingCheckout } from '@/lib/payments/booking-checkout-access';
import { executePaytotaPurchaseS2S } from '@/lib/paytota';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

const bodySchema = z.object({
  bookingId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  guestEmail: z.string().email().optional(),
});

/**
 * POST /api/payments/purchase-execute
 * Optional Paytota “Step 2”: multipart execute (e.g. STK) instead of hosted checkout only.
 * @see additems.txt — executePurchaseS2S
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
  }

  const { bookingId, purchaseId, guestEmail } = parsed.data;

  const auth = await authorizeBookingCheckout(request, { bookingId, guestEmail });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { booking } = auth;
  const ref = booking.payment_reference?.trim();
  if (!ref || ref !== purchaseId) {
    return jsonError('Purchase does not match this booking’s active checkout', 403);
  }

  const result = await executePaytotaPurchaseS2S(purchaseId);
  if (!result.ok) {
    return jsonError(result.message, result.status && result.status >= 400 && result.status < 600 ? result.status : 502);
  }

  return NextResponse.json({ success: true, data: result.body }, { status: 200 });
}
