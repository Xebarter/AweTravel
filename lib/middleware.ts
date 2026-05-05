import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserType } from '@/lib/types';

/** Long-lived auth cookies (matches @supabase/ssr default lifetime). */
const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** Supabase SSR cookie adapter batch item (see `createServerClient` cookies.setAll). */
type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type RoleRow = {
  user_type: UserType;
  transporter_approval_status: string | null;
  account_suspended: boolean;
};

/** Copy Set-Cookie headers from one response to another (e.g. session refresh + redirect). */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    });
  });
}

type MetaRolePartial = {
  user_type: UserType;
  transporter_approval_status: string | null;
  account_suspended?: boolean;
};

function parseRoleFromAppMetadata(user: User): MetaRolePartial | null {
  const meta = user.app_metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;

  const rawType = (meta as Record<string, unknown>).user_type;
  if (rawType !== 'passenger' && rawType !== 'transporter' && rawType !== 'admin') return null;

  const metaRec = meta as Record<string, unknown>;
  const rawApproval = metaRec.transporter_approval_status;
  const transporter_approval_status =
    rawApproval === null || typeof rawApproval === 'undefined'
      ? null
      : typeof rawApproval === 'string'
        ? rawApproval
        : null;

  const rawSuspended = metaRec.account_suspended;
  const out: MetaRolePartial = {
    user_type: rawType,
    transporter_approval_status,
  };
  if (typeof rawSuspended === 'boolean') {
    out.account_suspended = rawSuspended;
  }
  return out;
}

async function resolveRoleRow(supabase: SupabaseClient, user: User): Promise<RoleRow | null> {
  const parsed = parseRoleFromAppMetadata(user);

  if (!parsed?.user_type) {
    const { data: dbRow } = await supabase
      .from('users')
      .select('user_type, transporter_approval_status, account_suspended')
      .eq('id', user.id)
      .maybeSingle();

    if (!dbRow?.user_type) return null;

    return {
      user_type: dbRow.user_type as UserType,
      transporter_approval_status: dbRow.transporter_approval_status ?? null,
      account_suspended: dbRow.account_suspended === true,
    };
  }

  if (parsed.account_suspended === undefined) {
    const { data: dbRow } = await supabase
      .from('users')
      .select('account_suspended')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user_type: parsed.user_type,
      transporter_approval_status: parsed.transporter_approval_status,
      account_suspended: dbRow?.account_suspended === true,
    };
  }

  return {
    user_type: parsed.user_type,
    transporter_approval_status: parsed.transporter_approval_status,
    account_suspended: parsed.account_suspended,
  };
}

/** App areas that require a signed-in user (role checks apply where listed). */
const AUTH_REQUIRED_PREFIXES = ['/passenger', '/transporter', '/admin'] as const;

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Passenger checkout pages reachable without an account (booking → pay → confirmation). */
function isPassengerGuestCheckoutPath(pathname: string): boolean {
  if (pathname === '/passenger/booking' || pathname.startsWith('/passenger/booking/')) return true;
  if (pathname === '/passenger/payment' || pathname.startsWith('/passenger/payment/')) return true;
  if (pathname === '/passenger/booking-confirmation' || pathname.startsWith('/passenger/booking-confirmation/'))
    return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            (options ?? {}) as Parameters<typeof supabaseResponse.cookies.set>[2],
          );
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicRoutes = ['/', '/login', '/signup', '/forgot-password'];
  if (publicRoutes.includes(pathname)) {
    return supabaseResponse;
  }

  if (!requiresAuth(pathname)) {
    return supabaseResponse;
  }

  if (!user && isPassengerGuestCheckoutPath(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  const row = await resolveRoleRow(supabase, user);
  if (!row) {
    const redirect = NextResponse.redirect(new URL('/', request.url));
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (row.user_type === 'passenger' && row.account_suspended) {
    const redirect = NextResponse.redirect(new URL('/login?reason=suspended', request.url));
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  const rolePrefixes: { prefix: string; allowed: UserType }[] = [
    { prefix: '/admin', allowed: 'admin' },
    { prefix: '/transporter', allowed: 'transporter' },
    { prefix: '/passenger', allowed: 'passenger' },
  ];
  const matched = rolePrefixes.find((r) => pathname.startsWith(r.prefix));
  if (matched) {
    if (row.user_type !== matched.allowed) {
      const target =
        row.user_type === 'admin'
          ? '/admin'
          : row.user_type === 'transporter'
            ? '/transporter'
            : '/passenger/dashboard';
      const redirect = NextResponse.redirect(new URL(target, request.url));
      copyCookies(supabaseResponse, redirect);
      return redirect;
    }

    const transporterPendingPath = '/transporter/pending-approval';
    const onTransporterPendingPage =
      pathname === transporterPendingPath || pathname.startsWith(`${transporterPendingPath}/`);

    if (matched.allowed === 'transporter') {
      const approval = row.transporter_approval_status;
      if (approval !== 'approved') {
        if (!onTransporterPendingPage) {
          const redirect = NextResponse.redirect(new URL(transporterPendingPath, request.url));
          copyCookies(supabaseResponse, redirect);
          return redirect;
        }
      } else if (onTransporterPendingPage) {
        const redirect = NextResponse.redirect(new URL('/transporter', request.url));
        copyCookies(supabaseResponse, redirect);
        return redirect;
      }
    }
  }

  return supabaseResponse;
}
