import type { PlatformSettings } from '@/lib/platform-settings/db';
import type { PlatformSettingsAdminPatchInput } from '@/lib/platform-settings/validate';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === 'string') return j.error;
    if (j.error !== undefined && typeof j.error === 'object') {
      return JSON.stringify(j.error);
    }
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getAdminPlatformSettings(): Promise<PlatformSettings> {
  const res = await fetch('/api/admin/settings');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { settings: PlatformSettings };
  return j.settings;
}

export async function patchAdminPlatformSettings(
  patch: PlatformSettingsAdminPatchInput,
): Promise<PlatformSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { settings: PlatformSettings };
  return j.settings;
}
