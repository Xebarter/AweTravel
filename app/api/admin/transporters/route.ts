import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireAdminSession } from '@/lib/admin/auth';
import { ADMIN_TRANSPORTER_SELECT } from '@/lib/admin/transporters/columns';

const createBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).optional().nullable(),
});

/**
 * GET /api/admin/transporters — list transporter accounts (admin only).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let q = supabase
    .from('users')
    .select(ADMIN_TRANSPORTER_SELECT)
    .eq('user_type', 'transporter')
    .order('created_at', { ascending: false });

  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    q = q.eq('transporter_approval_status', status);
  }

  const { data, error } = await q;

  if (error) {
    console.error('admin transporters list:', error);
    return NextResponse.json({ error: 'Failed to load transporters' }, { status: 500 });
  }

  return NextResponse.json({ transporters: data ?? [] });
}

/**
 * POST /api/admin/transporters — create transporter auth user + profile (admin only, service role required).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server is not configured for operator provisioning (missing SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const { email, password, full_name, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    console.error('admin create transporter auth:', createErr);
    return NextResponse.json(
      { error: createErr?.message ?? 'Failed to create auth user (email may already be in use).' },
      { status: 400 },
    );
  }

  const userId = created.user.id;

  const { error: insertErr } = await admin.from('users').insert({
    id: userId,
    email: normalizedEmail,
    full_name,
    user_type: 'transporter',
    kyc_verified: false,
    phone: phone?.trim() ? phone.trim() : null,
  });

  if (insertErr) {
    console.error('admin create transporter profile:', insertErr);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create profile row' }, { status: 500 });
  }

  const { data: row, error: readErr } = await admin
    .from('users')
    .select(ADMIN_TRANSPORTER_SELECT)
    .eq('id', userId)
    .single();

  if (readErr || !row) {
    return NextResponse.json({ error: 'Created but failed to load profile' }, { status: 201 });
  }

  return NextResponse.json({ transporter: row }, { status: 201 });
}
