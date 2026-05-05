import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { publicPlatformSettingsSchema, type PublicPlatformSettings } from '@/lib/platform-settings/validate';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export type PublicPlatformSettingsCamel = {
  siteName: string;
  platformFeeBps: number;
  maintenanceMode: boolean;
  supportEmail: string | null;
};

function toCamel(p: PublicPlatformSettings): PublicPlatformSettingsCamel {
  return {
    siteName: p.site_name,
    platformFeeBps: p.platform_fee_bps,
    maintenanceMode: p.maintenance_mode,
    supportEmail: p.support_email ?? null,
  };
}

/** Fetches public platform settings; on failure returns defaults so checkout is not blocked. */
export async function fetchPublicPlatformSettings(): Promise<PublicPlatformSettingsCamel> {
  try {
    const res = await fetch('/api/platform/settings', { cache: 'no-store' });
    if (!res.ok) throw new Error(await readError(res));
    const j = (await res.json()) as unknown;
    const parsed = publicPlatformSettingsSchema.safeParse(j);
    if (!parsed.success) throw new Error('Invalid settings payload');
    return toCamel(parsed.data);
  } catch {
    return {
      siteName: 'AweTravel',
      platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
      maintenanceMode: false,
      supportEmail: null,
    };
  }
}

export function platformFeeFromBps(basePriceMinor: number, bps: number): number {
  return Math.round((basePriceMinor * bps) / 10000);
}
