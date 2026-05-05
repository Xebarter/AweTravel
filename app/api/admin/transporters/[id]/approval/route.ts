import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import { ADMIN_TRANSPORTER_SELECT } from '@/lib/admin/transporters/columns';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    rejectionReason: z.string().trim().min(1, 'A rejection reason is required').max(2000),
  }),
]);

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/transporters/[id]/approval — approve or reject a transporter (admin only).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  if (id === auth.userId) {
    return NextResponse.json({ error: 'You cannot change your own approval status' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.action === 'approve') {
    const { data, error } = await supabase
      .from('users')
      .update({
        transporter_approval_status: 'approved',
        transporter_approved_at: new Date().toISOString(),
        transporter_approved_by: auth.userId,
        transporter_rejection_reason: null,
      })
      .eq('id', id)
      .eq('user_type', 'transporter')
      .select(ADMIN_TRANSPORTER_SELECT)
      .maybeSingle();

    if (error) {
      console.error('admin approve transporter:', error);
      return NextResponse.json({ error: 'Failed to approve transporter' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
    }
    return NextResponse.json({ transporter: data });
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      transporter_approval_status: 'rejected',
      transporter_approved_at: null,
      transporter_approved_by: null,
      transporter_rejection_reason: payload.rejectionReason,
    })
    .eq('id', id)
    .eq('user_type', 'transporter')
    .select(ADMIN_TRANSPORTER_SELECT)
    .maybeSingle();

  if (error) {
    console.error('admin reject transporter:', error);
    return NextResponse.json({ error: 'Failed to reject transporter' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
  }

  return NextResponse.json({ transporter: data });
}
