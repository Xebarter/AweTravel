import { redirect } from 'next/navigation';

type Search = {
  tripId?: string | string[];
  bookingId?: string | string[];
  checkoutGroupId?: string | string[];
  guestEmail?: string | string[];
  date?: string | string[];
};

function first(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

/**
 * Legacy URL: payment is completed from the booking page / mobile drawer.
 * Preserves query params for pending guest checkouts.
 */
export default async function LegacyPaymentRedirect({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const tripId = first(q.tripId)?.trim();
  const bookingId = first(q.bookingId)?.trim();
  const checkoutGroupId = first(q.checkoutGroupId)?.trim();
  const guestEmail = first(q.guestEmail)?.trim();
  const date = first(q.date)?.trim();

  if (tripId) {
    const p = new URLSearchParams();
    if (checkoutGroupId) p.set('checkoutGroupId', checkoutGroupId);
    else if (bookingId) p.set('bookingId', bookingId);
    if (guestEmail) p.set('guestEmail', guestEmail);
    if (date) p.set('date', date);
    const qs = p.toString();
    redirect(`/passenger/booking/${encodeURIComponent(tripId)}${qs ? `?${qs}` : ''}`);
  }

  redirect('/passenger/bookings');
}
