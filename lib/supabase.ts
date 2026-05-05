import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your environment variables.');
}

/** Align with middleware: long-lived session cookies (not session-only / tab-close). */
const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** Browser client — uses cookies so middleware and Route Handlers can see the same session. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    path: '/',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
  },
});

// Helper to get the current user session
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

  if (error) console.error('Error fetching user profile:', error);
  return data;
}

// Helper to sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out:', error);
  return !error;
}
