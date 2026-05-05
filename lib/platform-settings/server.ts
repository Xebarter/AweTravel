import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { publicPlatformSettingsSchema } from '@/lib/platform-settings/validate';

/** Reads platform fee (basis points) via the same RPC as public settings; safe for server routes. */
export async function getServerPlatformFeeBps(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_PLATFORM_FEE_BPS;

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc('get_public_platform_settings');
  if (error || data == null) return DEFAULT_PLATFORM_FEE_BPS;

  const parsed = publicPlatformSettingsSchema.safeParse(data);
  if (!parsed.success) return DEFAULT_PLATFORM_FEE_BPS;
  return parsed.data.platform_fee_bps;
}
