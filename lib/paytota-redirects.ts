/**
 * Absolute URLs for Paytota success / failure / cancel redirects.
 * @see additems.txt — optional PAYTOTA_*_REDIRECT overrides
 */

export function getPublicAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

const DEFAULT_RETURN_PATH = '/passenger/payment/return';

/**
 * @param envOverride - Full `https://…` URL, or path starting with `/` (appended to public origin).
 * @param query - Merged into the final URL (overwrites same keys on env URL).
 */
export function buildPaytotaRedirectUrl(
  envOverride: string | undefined,
  query: Record<string, string>,
  defaultPath: string = DEFAULT_RETURN_PATH,
): string {
  const origin = getPublicAppOrigin();
  const sp = new URLSearchParams(query);
  const raw = envOverride?.trim();

  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    const u = new URL(raw);
    for (const [k, v] of Object.entries(query)) {
      u.searchParams.set(k, v);
    }
    return u.toString();
  }

  const path = raw && raw.startsWith('/') ? raw : defaultPath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}?${sp.toString()}`;
}
