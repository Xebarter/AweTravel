import type { ReactNode } from 'react';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { loadTicketPdfDetails } from '@/lib/ticket-details';
import { verifyTicketQr } from '@/lib/ticket-signature';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function Shell(props: { ok: boolean; title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className={`text-lg font-semibold ${props.ok ? 'text-success' : 'text-destructive'}`}>{props.title}</h1>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">{props.children}</div>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default async function VerifyTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; s?: string }>;
}) {
  const { b, s } = await searchParams;
  const bookingId = typeof b === 'string' ? b.trim() : '';
  const sig = typeof s === 'string' ? s.trim() : '';

  if (!bookingId || !sig || !UUID_RE.test(bookingId)) {
    return (
      <Shell ok={false} title="Invalid ticket link">
        <p>Use the QR code from your AweTravel ticket PDF.</p>
      </Shell>
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return (
      <Shell ok={false} title="Unavailable">
        <p>Verification is temporarily unavailable.</p>
      </Shell>
    );
  }

  const { data: row } = await admin.from('bookings').select('booking_code').eq('id', bookingId).maybeSingle();
  const code = (row as { booking_code?: string } | null)?.booking_code;
  if (!code) {
    return (
      <Shell ok={false} title="Ticket not found">
        <p>We could not find this booking.</p>
      </Shell>
    );
  }

  let qrOk = false;
  try {
    qrOk = verifyTicketQr(bookingId, code, sig);
  } catch {
    qrOk = false;
  }

  if (!qrOk) {
    return (
      <Shell ok={false} title="Verification failed">
        <p>This QR code is not valid for this booking.</p>
      </Shell>
    );
  }

  const details = await loadTicketPdfDetails(admin, bookingId);
  if (!details) {
    return (
      <Shell ok={false} title="Booking not active">
        <p>This ticket is not valid — the booking may be unpaid or cancelled.</p>
      </Shell>
    );
  }

  return (
    <Shell ok title="Ticket verified">
      <p className="font-medium text-foreground">{details.passengerName}</p>
      <p className="text-foreground">{details.routeLabel}</p>
      <p>
        {details.travelDate} · Departs {details.departureTime} · Seat {details.seatCode}
      </p>
      <p className="text-xs">Booking code: {details.bookingCode}</p>
      {details.companyName ? <p className="text-xs">Operator: {details.companyName}</p> : null}
    </Shell>
  );
}
