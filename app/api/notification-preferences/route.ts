import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import type { NotificationPreferencesRow } from '@/lib/notifications/types';

const patchSchema = z.object({
  in_app_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  categories_muted: z.array(z.string().max(64)).optional(),
  do_not_disturb: z.boolean().optional(),
  dnd_start_local: z.string().optional().nullable(),
  dnd_end_local: z.string().optional().nullable(),
});

/**
 * GET /api/notification-preferences — current user's preferences (ensures row exists).
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await supabase.rpc('ensure_notification_preferences', { p_user_id: user.id });
  } catch {
    // ignore
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    console.error('notification prefs get:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }

  return NextResponse.json({ preferences: data as NotificationPreferencesRow });
}

/**
 * PUT /api/notification-preferences — patch current user's preferences.
 */
export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  try {
    await supabase.rpc('ensure_notification_preferences', { p_user_id: user.id });
  } catch {
    // ignore
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .update(parsed.data)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.error('notification prefs update:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }

  return NextResponse.json({ preferences: data as NotificationPreferencesRow });
}

