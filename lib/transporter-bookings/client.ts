import type { Booking } from '@/lib/bookings/types';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listTransporterBookings(params?: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<Booking[]> {
  const usp = new URLSearchParams();
  if (params?.q) usp.set('q', params.q);
  if (params?.status) usp.set('status', params.status);
  if (params?.paymentStatus) usp.set('paymentStatus', params.paymentStatus);
  if (params?.from) usp.set('from', params.from);
  if (params?.to) usp.set('to', params.to);
  if (params?.limit) usp.set('limit', String(params.limit));
  if (params?.offset) usp.set('offset', String(params.offset));

  const res = await fetch(`/api/transporter/bookings${usp.toString() ? `?${usp.toString()}` : ''}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { bookings: Booking[] };
  return j.bookings ?? [];
}

export async function patchTransporterBooking(
  id: string,
  patch: { status?: string; payment_status?: string },
): Promise<void> {
  const res = await fetch(`/api/transporter/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
}

