import { createHmac, timingSafeEqual } from 'crypto';
import { getPublicAppOrigin } from '@/lib/paytota-redirects';

function getTicketSecret(): string {
  const s = process.env.TICKET_QR_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!s) {
    throw new Error('Set TICKET_QR_SECRET (or CRON_SECRET) for ticket QR signing');
  }
  return s;
}

/** HMAC-SHA256 hex over `v1|bookingId|bookingCode` (server-only verification). */
export function signTicketQr(bookingId: string, bookingCode: string): string {
  const payload = `v1|${bookingId}|${bookingCode}`;
  return createHmac('sha256', getTicketSecret()).update(payload).digest('hex');
}

export function verifyTicketQr(bookingId: string, bookingCode: string, signatureHex: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(signatureHex)) return false;
  const expected = signTicketQr(bookingId, bookingCode);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signatureHex, 'hex'));
  } catch {
    return false;
  }
}

/** URL encoded in the PDF QR (opens on-phone verification view). */
export function buildTicketQrVerifyUrl(bookingId: string, bookingCode: string): string {
  const origin = getPublicAppOrigin();
  const sig = signTicketQr(bookingId, bookingCode);
  const u = new URL(`${origin}/v/ticket`);
  u.searchParams.set('b', bookingId);
  u.searchParams.set('s', sig);
  return u.toString();
}
