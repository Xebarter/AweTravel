import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';

/**
 * GET /api/notifications/unread — unread count for signed-in user.
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.rpc('notifications_unread_count');
  if (error) {
    console.error('notifications_unread_count:', error);
    return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 });
  }

  return NextResponse.json({ unread: Number(data) || 0 });
}

