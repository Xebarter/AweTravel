import { NextRequest, NextResponse } from 'next/server';
import { authorizeBookingCheckout } from '@/lib/payments/booking-checkout-access';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { loadTicketPdfDetails } from '@/lib/ticket-details';
import { buildTicketPdfBuffer } from '@/lib/ticket-pdf';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function safeFilename(code: string) {
  return `AweTravel-ticket-${code.replace(/[^a-zA-Z0-9_-]+/g, '-')}.pdf`;
}

/**
 * GET /api/bookings/[id]/ticket?guestEmail=
 * PDF boarding pass with QR (same auth as payment status polling).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const guestEmail = request.nextUrl.searchParams.get('guestEmail') ?? undefined;
  const auth = await authorizeBookingCheckout(request, { bookingId: id, guestEmail });
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const { booking } = auth;
  if (booking.payment_status !== 'completed' || !['confirmed', 'completed'].includes(booking.status)) {
    return jsonError('Ticket is available after payment completes', 403);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const details = await loadTicketPdfDetails(admin, id);
  if (!details) return jsonError('Could not build ticket', 404);

  let bytes: Uint8Array;
  try {
    bytes = await buildTicketPdfBuffer(details);
  } catch (e) {
    console.error('[ticket GET] pdf:', e);
    const msg = e instanceof Error ? e.message : 'Ticket generation failed';
    return jsonError(
      msg.includes('TICKET_QR') || msg.includes('CRON_SECRET') ? 'Ticket signing not configured' : 'Ticket generation failed',
      500,
    );
  }

  const filename = safeFilename(details.bookingCode);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
