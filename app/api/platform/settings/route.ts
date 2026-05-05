import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publicPlatformSettingsSchema } from '@/lib/platform-settings/validate';

/**
 * GET /api/platform/settings — public subset (no auth).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.rpc('get_public_platform_settings');

  if (error) {
    console.error('get_public_platform_settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }

  const parsed = publicPlatformSettingsSchema.safeParse(data);
  if (!parsed.success) {
    console.error('public platform settings shape:', data);
    return NextResponse.json({ error: 'Invalid settings' }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}
