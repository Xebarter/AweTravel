import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';

/**
 * Load `public.users` for the given id. Retries briefly so reads after SIGNED_IN
 * succeed once the browser client has attached the JWT to PostgREST requests.
 */
export async function fetchUserProfileWithRetry(
  supabase: SupabaseClient,
  userId: string,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<{ profile: UserProfile | null; errorMessage: string | null }> {
  const attempts = options?.attempts ?? 8;
  const baseDelayMs = options?.baseDelayMs ?? 120;

  for (let i = 0; i < attempts; i++) {
    await supabase.auth.getSession();
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

    if (error) {
      return { profile: null, errorMessage: error.message };
    }
    if (data) {
      return { profile: data as UserProfile, errorMessage: null };
    }

    await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
  }

  return { profile: null, errorMessage: null };
}
