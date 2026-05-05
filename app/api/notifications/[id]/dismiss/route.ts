import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import type { NotificationRow } from '@/lib/notifications/types';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * PATCH /api/notifications/:id/dismiss — dismiss a notification.
 */
export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawParams = await context.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 });
  }

  const { id } = parsedParams.data;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('notifications')
    .update({ dismissed_at: now })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('notification dismiss:', error);
    return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ notification: data as NotificationRow });
}

