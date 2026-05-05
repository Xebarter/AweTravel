/**
 * Paytota (gate.paytota.com) — collections / purchases API.
 * @see additems.txt (implementation guide)
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
    street_address?: string;
  };
  successRedirect: string;
  failureRedirect: string;
  cancelRedirect?: string;
};

export type PaytotaCreatePurchaseResult =
  | { ok: true; id: string; checkout_url: string }
  | { ok: false; message: string; status?: number; code?: string };

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

/** From env: `true` / `1` / `yes` → true (default false). */
function getSkipCapture(): boolean {
  const v = process.env.PAYTOTA_SKIP_CAPTURE?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function getPaymentMethodWhitelist(): string[] | undefined {
  const raw = process.env.PAYTOTA_PAYMENT_METHOD_WHITELIST?.trim();
  if (!raw) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Minimum UGX for collections; `0` / `false` / `off` / unset empty → 0 (disabled). Default 500 when unset. */
export function getPaytotaMinPurchaseUgx(): number {
  const raw = process.env.PAYTOTA_MIN_PURCHASE_UGX?.trim().toLowerCase();
  if (raw === '' || raw === '0' || raw === 'false' || raw === 'off') return 0;
  if (raw === undefined) return 500;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 500;
}

export function isPaytotaConfigured(): boolean {
  return Boolean(getSecret() && getBrandId());
}

/**
 * Uganda MSISDN for Paytota client.phone: digits only, 0… → 256…, 9-digit local → 256…
 */
export function normalizeUgandaMsisdn(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  let d = raw.replace(/\D/g, '');
  if (d.length === 0) return undefined;
  if (d.startsWith('0')) d = `256${d.slice(1)}`;
  else if (d.length === 9 && !d.startsWith('256')) d = `256${d}`;
  if (!d.startsWith('256') || d.length < 12) return undefined;
  return d;
}

function buildClientPhone(input: PaytotaCreatePurchaseInput): string | undefined {
  const country = (input.client.country || 'UG').toUpperCase();
  if (country !== 'UG') return input.client.phone?.trim() || undefined;
  return normalizeUgandaMsisdn(input.client.phone) ?? undefined;
}

export function parsePaytotaApiErrorMessage(status: number, parsedJson: unknown, rawText: string): string {
  const code =
    parsedJson && typeof parsedJson === 'object' && 'code' in parsedJson
      ? String((parsedJson as { code?: unknown }).code ?? '')
      : '';

  if (code === 'purchase_no_available_payment_method' || rawText.includes('purchase_no_available_payment_method')) {
    return (
      'No payment method is available for this checkout. Check Paytota: UGX/mobile methods enabled for the brand, ' +
      'live vs test keys match brand_id, skip_capture matches the brand, and amount meets minimums.'
    );
  }

  if (parsedJson && typeof parsedJson === 'object') {
    const o = parsedJson as Record<string, unknown>;
    if (typeof o.detail === 'string' && o.detail) return o.detail;
    if (typeof o.message === 'string' && o.message) return o.message;
    const err = o.error;
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      if (typeof e.message === 'string' && e.message) return e.message;
    }
  }
  const t = rawText.trim();
  if (t) return t.length > 600 ? `${t.slice(0, 600)}…` : t;
  return `Paytota error (${status})`;
}

export async function createPaytotaPurchase(input: PaytotaCreatePurchaseInput): Promise<PaytotaCreatePurchaseResult> {
  const secret = getSecret();
  const brandId = getBrandId();
  if (!secret || !brandId) {
    return { ok: false, message: 'Paytota is not configured (missing secret or brand id)' };
  }

  const currency = (input.currency || 'UGX').toUpperCase();
  const minUgx = getPaytotaMinPurchaseUgx();
  if (currency === 'UGX' && minUgx > 0 && input.amountMinor < minUgx) {
    return {
      ok: false,
      message: `Amount is below the Paytota minimum for UGX (${minUgx}). Set PAYTOTA_MIN_PURCHASE_UGX=0 to disable this check.`,
    };
  }

  const base = getBaseUrl();
  const phone = buildClientPhone(input);

  const body: Record<string, unknown> = {
    client: {
      email: input.client.email,
      ...(phone ? { phone } : {}),
      country: input.client.country || 'UG',
      ...(input.client.full_name ? { full_name: input.client.full_name } : {}),
      ...(input.client.street_address ? { street_address: input.client.street_address } : {}),
    },
    purchase: {
      currency,
      products: [
        {
          name: `AweTravel booking ${input.bookingId.slice(0, 8)}`,
          price: String(Math.max(0, Math.round(input.amountMinor))),
        },
      ],
    },
    reference: input.bookingId,
    skip_capture: getSkipCapture(),
    brand_id: brandId,
    success_redirect: input.successRedirect,
    failure_redirect: input.failureRedirect,
    cancel_redirect: input.cancelRedirect ?? input.failureRedirect,
  };

  const whitelist = getPaymentMethodWhitelist();
  if (whitelist) {
    body.payment_method_whitelist = whitelist;
  }

  const res = await fetch(`${base}/api/v1/purchases/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let data: unknown = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }

  const typed = data as PaytotaPurchaseApiShape & { detail?: string; message?: string; code?: string };

  if (!res.ok) {
    const code = typeof typed.code === 'string' ? typed.code : undefined;
    const msg = parsePaytotaApiErrorMessage(res.status, data, rawText);
    return { ok: false, message: msg, status: res.status, code };
  }

  const id = typeof typed.id === 'string' ? typed.id : '';
  const checkout_url = typeof typed.checkout_url === 'string' ? typed.checkout_url : '';
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

/**
 * Step 2 (optional): server-to-server execute — e.g. STK prompt. Paytota expects multipart only (no JSON Bearer on this URL per guide).
 */
export async function executePaytotaPurchaseS2S(
  purchaseId: string,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; message: string; status?: number }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.set('s2s', 'true');
  form.set('pm', 'paytota_proxy');

  const res = await fetch(`${base}/p/${encodeURIComponent(purchaseId)}/`, {
    method: 'POST',
    body: form,
  });

  const rawText = await res.text();
  let body: unknown = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { raw: rawText };
  }

  if (!res.ok) {
    return {
      ok: false,
      message: parsePaytotaApiErrorMessage(res.status, body, rawText),
      status: res.status,
    };
  }

  return { ok: true, status: res.status, body };
}
