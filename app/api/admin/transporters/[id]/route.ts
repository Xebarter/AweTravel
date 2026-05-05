import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireAdminSession } from '@/lib/admin/auth';
import { ADMIN_TRANSPORTER_SELECT } from '@/lib/admin/transporters/columns';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const patchBodySchema = z
  .object({
    full_name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    phone: z.union([z.string().trim().max(50), z.literal('')]).optional(),
    kyc_verified: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/transporters/[id] — single transporter (admin only).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const { data, error } = await supabase
    .from('users')
    .select(ADMIN_TRANSPORTER_SELECT)
    .eq('id', id)
    .eq('user_type', 'transporter')
    .maybeSingle();

  if (error) {
    console.error('admin transporter get:', error);
    return NextResponse.json({ error: 'Failed to load transporter' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
  }

  return NextResponse.json({ transporter: data });
}

/**
 * PATCH /api/admin/transporters/[id] — update profile fields (admin only).
 * Email changes require SUPABASE_SERVICE_ROLE_KEY so auth.users stays in sync.
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
    return NextResponse.json({ error: 'You cannot edit your own operator profile from this screen' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const payload = parsed.data;

  const { data: existing, error: loadErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', id)
    .eq('user_type', 'transporter')
    .maybeSingle();

  if (loadErr) {
    console.error('admin transporter patch load:', loadErr);
    return NextResponse.json({ error: 'Failed to load transporter' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
  }

  if (payload.email !== undefined) {
    const nextEmail = payload.email.toLowerCase();
    if (nextEmail !== existing.email.toLowerCase()) {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: 'Changing email requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
          { status: 503 },
        );
      }
      const { error: authEmailErr } = await admin.auth.admin.updateUserById(id, { email: nextEmail });
      if (authEmailErr) {
        console.error('admin transporter email auth update:', authEmailErr);
        return NextResponse.json({ error: authEmailErr.message ?? 'Failed to update login email' }, { status: 400 });
      }
    }
  }

  const updateRow: Record<string, unknown> = {};
  if (payload.full_name !== undefined) updateRow.full_name = payload.full_name;
  if (payload.email !== undefined) updateRow.email = payload.email.toLowerCase();
  if (payload.phone !== undefined) updateRow.phone = payload.phone === '' ? null : payload.phone;
  if (payload.kyc_verified !== undefined) updateRow.kyc_verified = payload.kyc_verified;

  const { data, error } = await supabase
    .from('users')
    .update(updateRow)
    .eq('id', id)
    .eq('user_type', 'transporter')
    .select(ADMIN_TRANSPORTER_SELECT)
    .maybeSingle();

  if (error) {
    console.error('admin transporter patch:', error);
    return NextResponse.json({ error: 'Failed to update transporter' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
  }

  return NextResponse.json({ transporter: data });
}

/**
 * DELETE /api/admin/transporters/[id] — remove auth user and profile (admin only, service role required).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const { data: row, error: loadErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .eq('user_type', 'transporter')
    .maybeSingle();

  if (loadErr) {
    console.error('admin transporter delete load:', loadErr);
    return NextResponse.json({ error: 'Failed to verify transporter' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Transporter not found' }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Deleting operators requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 },
    );
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    console.error('admin transporter delete:', delErr);
    return NextResponse.json({ error: delErr.message ?? 'Failed to delete user' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
