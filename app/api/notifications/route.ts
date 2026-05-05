import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import type { NotificationRow } from '@/lib/notifications/types';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeDismissed: z.preprocess(
    (val) => val === true || val === 'true' || val === '1',
    z.boolean().optional().default(false),
  ),
  before: z.string().datetime({ offset: true }).optional(),
});

/**
 * GET /api/notifications — list current user's notifications (newest first).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid query' }, { status: 400 });
  }

  const { limit, includeDismissed } = parsed.data;
  const before = parsed.data.before?.trim() ? parsed.data.before.trim() : null;

  // Ensure prefs row exists (best-effort).
  try {
    await supabase.rpc('ensure_notification_preferences', { p_user_id: user.id });
  } catch {
    // ignore
  }

  let q = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  // RLS already restricts to own rows; keep this explicit to prevent any accidental widening.
  q = q.eq('recipient_id', user.id);

  if (!includeDismissed) {
    q = q.is('dismissed_at', null);
  }

  if (before) {
    q = q.lt('created_at', before);
  }

  const { data, error } = await q;
  if (error) {
    console.error('notifications list:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }

  return NextResponse.json({ items: (data ?? []) as NotificationRow[] });
}

