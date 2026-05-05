/**
 * Paytota (gate.paytota.com) — collections / purchases API.
 * @see additems.txt (merchant docs)
 */

export type PaytotaCreatePurchaseInput = {
  bookingId: string;
  amountMinor: number;
  currency: string;
  client: {
    email: string;
    full_name?: string;
    phone?: string;
    country?: string;
  };
  successRedirect: string;
  failureRedirect: string;
  cancelRedirect?: string;
};

export type PaytotaCreatePurchaseResult =
  | { ok: true; id: string; checkout_url: string }
  | { ok: false; message: string; status?: number };

export type PaytotaPurchaseApiShape = {
  id?: string;
  status?: string;
  reference?: string;
  event_type?: string;
  checkout_url?: string;
  payment?: { amount?: number; currency?: string } | null;
  purchase?: { total?: number; currency?: string };
  client?: { email?: string };
};

function getBaseUrl(): string {
  const raw = process.env.PAYTOTA_BASE_URL || 'https://gate.paytota.com';
  return raw.replace(/\/$/, '');
}

function getSecret(): string | undefined {
  return process.env.PAYTOTA_SECRET_KEY || process.env.PAYTOTA_API_KEY;
}

function getBrandId(): string | undefined {
  return process.env.PAYTOTA_BRAND_ID;
}

export function isPaytotaConfigured(): boolean {
  return Boolean(getSecret() && getBrandId());
}

export async function createPaytotaPurchase(input: PaytotaCreatePurchaseInput): Promise<PaytotaCreatePurchaseResult> {
  const secret = getSecret();
  const brandId = getBrandId();
  if (!secret || !brandId) {
    return { ok: false, message: 'Paytota is not configured (missing secret or brand id)' };
  }

  const base = getBaseUrl();
  const body: Record<string, unknown> = {
    client: {
      email: input.client.email,
      ...(input.client.phone ? { phone: input.client.phone } : {}),
      country: input.client.country || 'UG',
      ...(input.client.full_name ? { full_name: input.client.full_name } : {}),
    },
    purchase: {
      currency: input.currency,
      products: [
        {
          name: `AweTravel booking ${input.bookingId.slice(0, 8)}`,
          price: String(Math.max(0, Math.round(input.amountMinor))),
        },
      ],
    },
    reference: input.bookingId,
    skip_capture: false,
    brand_id: brandId,
    success_redirect: input.successRedirect,
    failure_redirect: input.failureRedirect,
    cancel_redirect: input.cancelRedirect ?? input.failureRedirect,
  };

  const res = await fetch(`${base}/api/v1/purchases/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as PaytotaPurchaseApiShape & {
    detail?: string;
    message?: string;
  };

  if (!res.ok) {
    const msg =
      (typeof data.detail === 'string' && data.detail) ||
      (typeof data.message === 'string' && data.message) ||
      `Paytota error (${res.status})`;
    return { ok: false, message: msg, status: res.status };
  }

  const id = typeof data.id === 'string' ? data.id : '';
  const checkout_url = typeof data.checkout_url === 'string' ? data.checkout_url : '';
  if (!id || !checkout_url) {
    return { ok: false, message: 'Invalid Paytota response (missing id or checkout_url)' };
  }

  return { ok: true, id, checkout_url };
}

export async function fetchPaytotaPurchase(purchaseId: string): Promise<PaytotaPurchaseApiShape | null> {
  const secret = getSecret();
  if (!secret) return null;

  const base = getBaseUrl();
  const res = await fetch(`${base}/api/v1/purchases/${encodeURIComponent(purchaseId)}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as PaytotaPurchaseApiShape | null;
}
