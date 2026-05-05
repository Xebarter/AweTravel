import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type TransporterAuthOk = { userId: string };

export async function requireTransporterSession(
  supabase: SupabaseClient,
): Promise<TransporterAuthOk | { response: NextResponse }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('user_type, transporter_approval_status')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.user_type !== 'transporter') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  if (profile.transporter_approval_status !== 'approved') {
    return {
      response: NextResponse.json(
        {
          error:
            profile.transporter_approval_status === 'rejected'
              ? 'Your operator application was not approved. Contact support if you believe this is a mistake.'
              : 'Your operator account is pending admin approval. You will get access once an administrator approves it.',
        },
        { status: 403 },
      ),
    };
  }

  return { userId: user.id };
}
