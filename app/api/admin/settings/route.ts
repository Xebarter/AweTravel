import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import {
  buildPlatformSettingsUpdatePayload,
  PLATFORM_SETTINGS_ROW_ID,
  PLATFORM_SETTINGS_SELECT,
  rowToPlatformSettings,
  type PlatformSettingsRow,
} from '@/lib/platform-settings/db';
import { platformSettingsAdminPatchSchema } from '@/lib/platform-settings/validate';

/**
 * GET /api/admin/settings
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('platform_settings')
    .select(PLATFORM_SETTINGS_SELECT)
    .eq('id', PLATFORM_SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    console.error('platform_settings get:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Platform settings not initialized' }, { status: 500 });
  }

  return NextResponse.json({ settings: rowToPlatformSettings(data as PlatformSettingsRow) });
}

/**
 * PATCH /api/admin/settings
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = platformSettingsAdminPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const p = parsed.data;
  const updatePayload = buildPlatformSettingsUpdatePayload(
    {
      siteName: p.siteName,
      supportEmail: p.supportEmail,
      supportPhone: p.supportPhone,
      termsUrl: p.termsUrl,
      privacyUrl: p.privacyUrl,
      defaultReportTimezone: p.defaultReportTimezone,
      maintenanceMode: p.maintenanceMode,
      platformFeeBps: p.platformFeeBps,
    },
    auth.userId,
  );

  const { data, error } = await supabase
    .from('platform_settings')
    .update(updatePayload)
    .eq('id', PLATFORM_SETTINGS_ROW_ID)
    .select(PLATFORM_SETTINGS_SELECT)
    .single();

  if (error) {
    console.error('platform_settings patch:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ settings: rowToPlatformSettings(data as PlatformSettingsRow) });
}
