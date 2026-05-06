import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { loadTicketPdfDetails } from '@/lib/ticket-details';
import { buildTicketPdfBuffer } from '@/lib/ticket-pdf';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sends the ticket PDF once per booking when `RESEND_API_KEY` is set.
 * Uses `ticket_email_sent_at` so webhooks and status polling do not duplicate sends.
 */
export async function trySendTicketEmail(bookingId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { data: claimed, error: claimErr } = await admin
    .from('bookings')
    .update({ ticket_email_sent_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('payment_status', 'completed')
    .in('status', ['confirmed', 'completed'])
    .is('ticket_email_sent_at', null)
    .select('id,passenger_user_id,guest_email')
    .maybeSingle();

  if (claimErr || !claimed) return;

  const row = claimed as { passenger_user_id: string | null; guest_email: string | null };
  let to: string | null = null;
  if (row.guest_email?.trim()) to = row.guest_email.trim();
  else if (row.passenger_user_id) {
    const { data: u } = await admin.from('users').select('email').eq('id', row.passenger_user_id).maybeSingle();
    to = (u as { email?: string } | null)?.email?.trim() ?? null;
  }

  if (!to) {
    await admin.from('bookings').update({ ticket_email_sent_at: null }).eq('id', bookingId);
    return;
  }

  try {
    const details = await loadTicketPdfDetails(admin, bookingId);
    if (!details) {
      await admin.from('bookings').update({ ticket_email_sent_at: null }).eq('id', bookingId);
      return;
    }
    const pdfBytes = await buildTicketPdfBuffer(details);
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL?.trim() || 'AweTravel <onboarding@resend.dev>';
    const filename = `AweTravel-${details.bookingCode}.pdf`;

    const { error: sendErr } = await resend.emails.send({
      from,
      to: [to],
      subject: `Your AweTravel ticket — ${details.bookingCode}`,
      html: `<p>Hi ${escapeHtml(details.passengerName)},</p>
<p>Thanks for your payment. Your ticket is attached as a PDF with a QR code for boarding.</p>
<p><strong>${escapeHtml(details.routeLabel)}</strong><br/>
${escapeHtml(details.travelDate)} · Seat ${escapeHtml(details.seatCode)}</p>`,
      attachments: [{ filename, content: Buffer.from(pdfBytes).toString('base64') }],
    });

    if (sendErr) {
      console.error('[trySendTicketEmail] Resend:', sendErr);
      await admin.from('bookings').update({ ticket_email_sent_at: null }).eq('id', bookingId);
    }
  } catch (e) {
    console.error('[trySendTicketEmail]', e);
    await admin.from('bookings').update({ ticket_email_sent_at: null }).eq('id', bookingId);
  }
}
