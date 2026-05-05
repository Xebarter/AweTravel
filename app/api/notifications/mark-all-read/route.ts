import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';

/**
 * POST /api/notifications/mark-all-read — mark all undismissed notifications as read.
 */
export async function POST() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('recipient_id', user.id)
    .is('dismissed_at', null)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('notifications mark all read:', error);
    return NextResponse.json({ error: 'Failed to mark all read' }, { status: 500 });
  }

  return NextResponse.json({ updated: Array.isArray(data) ? data.length : 0 });
}

