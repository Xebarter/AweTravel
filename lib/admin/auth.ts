import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type AdminAuthOk = { userId: string };

export async function requireAdminSession(
  supabase: SupabaseClient,
): Promise<AdminAuthOk | { response: NextResponse }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.user_type !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId: user.id };
}
