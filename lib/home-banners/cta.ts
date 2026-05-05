/**
 * Homepage banner CTA resolution: same-origin passenger links become internal Next routes;
 * partner / unknown URLs stay external.
 */

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ResolvedBannerCta =
  | { kind: 'internal'; href: string }
  | { kind: 'external'; href: string };

function parseEnvAppOrigin(): string | null {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL?.trim() : '';
  if (!raw) return null;
  try {
    return new URL(raw.replace(/\/+$/, '')).origin;
  } catch {
    return null;
  }
}

/** Exported for tests / callers that need a stable app origin without reading env at call time. */
export function getAppOriginFromEnv(): string | null {
  return parseEnvAppOrigin();
}

function normalizeInternalPath(pathSearchHash: string): ResolvedBannerCta {
  const trimmed = pathSearchHash.trim();
  if (!trimmed.startsWith('/')) {
    return { kind: 'external', href: trimmed };
  }
  try {
    const u = new URL(trimmed, 'http://local.invalid');
    const p = u.pathname;
    const params = new URLSearchParams(u.searchParams);
    if (p === '/passenger/search' && !params.has('date')) {
      params.set('date', todayIsoDate());
    }
    const qs = params.toString();
    const hash = u.hash || '';
    const href = qs ? `${p}?${qs}${hash}` : `${p}${hash}`;
    return { kind: 'internal', href };
  } catch {
    return { kind: 'external', href: trimmed };
  }
}

/**
 * @param rawLinkUrl — banner.link_url from CMS / DB
 * @param context.currentOrigin — `window.location.origin` after mount; null during SSR / first paint
 * @param context.appOrigin — from NEXT_PUBLIC_APP_URL; pass null to read env inside (server-safe)
 */
export function resolveBannerCta(
  rawLinkUrl: string,
  context: { currentOrigin: string | null; appOrigin?: string | null },
): ResolvedBannerCta {
  const trimmed = rawLinkUrl.trim();
  if (!trimmed) {
    return { kind: 'external', href: '#' };
  }

  const appOrigin = context.appOrigin !== undefined ? context.appOrigin : parseEnvAppOrigin();

  // Relative in-app URL
  if (trimmed.startsWith('/')) {
    return normalizeInternalPath(trimmed);
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { kind: 'external', href: trimmed };
  }

  const host = u.hostname.toLowerCase();
  const path = u.pathname || '/';

  const matchesCurrent = Boolean(context.currentOrigin && u.origin === context.currentOrigin);
  const matchesApp = Boolean(appOrigin && u.origin === appOrigin);
  const isPlaceholderExample = host === 'example.com' && path.startsWith('/passenger/');

  const isInternalHost = matchesCurrent || matchesApp || isPlaceholderExample;

  if (!isInternalHost) {
    return { kind: 'external', href: trimmed };
  }

  const combined = `${path}${u.search}${u.hash}`;
  return normalizeInternalPath(combined);
}
