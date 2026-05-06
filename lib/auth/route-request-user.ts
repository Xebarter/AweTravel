import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';

function bearerToken(request: NextRequest): string | null {
  const raw = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!raw?.toLowerCase().startsWith('bearer ')) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

async function getUserFromAccessToken(accessToken: string): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * User for Route Handlers: Authorization Bearer first (matches browser `apiFetch`), then cookie session.
 * Ignores cookie `getUser()` errors when Bearer succeeds — needed for guest flows where missing session is normal.
 */
export async function getUserFromRouteRequest(request: NextRequest): Promise<User | null> {
  const token = bearerToken(request);
  if (token) {
    const fromBearer = await getUserFromAccessToken(token);
    if (fromBearer) return fromBearer;
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
