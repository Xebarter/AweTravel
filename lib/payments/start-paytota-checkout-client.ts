'use client';

import { getSupabaseAuthHeaderInit } from '@/lib/supabase';

export type StartPaytotaCheckoutParams = {
  /** Departure id — forwarded to Paytota return URLs. */
  tripId: string;
  /** Required for guest checkout when the server authorizes by email. */
  guestEmail?: string;
} & ({ bookingId: string; checkoutGroupId?: never } | { checkoutGroupId: string; bookingId?: never });

/**
 * Creates a Paytota purchase and sends the browser to `checkoutUrl`.
 */
export async function startPaytotaCheckout(params: StartPaytotaCheckoutParams): Promise<void> {
  const authHeaders = await getSupabaseAuthHeaderInit();
  const body: Record<string, string> = {
    tripId: params.tripId.trim(),
    ...(params.guestEmail?.trim() ? { guestEmail: params.guestEmail.trim() } : {}),
  };
  if ('checkoutGroupId' in params && params.checkoutGroupId?.trim()) {
    body.checkoutGroupId = params.checkoutGroupId.trim();
  } else {
    body.bookingId = (params as { bookingId: string }).bookingId.trim();
  }

  const res = await fetch('/api/payments', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { success?: boolean; checkoutUrl?: string; error?: string };
  if (!res.ok || !json.success || !json.checkoutUrl) {
    throw new Error(json.error || 'Could not start checkout');
  }
  window.location.assign(json.checkoutUrl);
}
