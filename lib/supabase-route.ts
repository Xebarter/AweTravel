import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Long-lived auth cookies (match middleware, browser client, and lib/middleware). */
const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Supabase client for Route Handlers: reads the same chunked auth cookies as the browser
 * (`createBrowserClient` from `@supabase/ssr`). A plain `createClient` + `Cookie` header does
 * not parse those cookies, which causes `getUser()` to return null → 401 on admin APIs.
 */
export async function createSupabaseRouteClient(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              (options ?? {}) as Parameters<typeof cookieStore.set>[2],
            );
          });
        } catch {
          // e.g. read-only context; session refresh may be handled by middleware
        }
      },
    },
  });
}
