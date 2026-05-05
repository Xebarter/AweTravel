import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { requireAdminSession } from '@/lib/admin/auth';
import { ADMIN_PASSENGER_SELECT } from '@/lib/admin/passengers/columns';

const createBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).optional().nullable(),
});

/**
 * GET /api/admin/passengers — list passenger accounts (admin only).
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('users')
    .select(ADMIN_PASSENGER_SELECT)
    .eq('user_type', 'passenger')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin passengers list:', error);
    return NextResponse.json({ error: 'Failed to load passengers' }, { status: 500 });
  }

  return NextResponse.json({ passengers: data ?? [] });
}

/**
 * POST /api/admin/passengers — create passenger auth user + profile (admin only, service role required).
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
      { error: 'Server is not configured for user provisioning (missing SUPABASE_SERVICE_ROLE_KEY).' },
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
    app_metadata: {
      user_type: 'passenger',
      transporter_approval_status: null,
      account_suspended: false,
    },
  });

  if (createErr || !created.user) {
    console.error('admin create passenger auth:', createErr);
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
    user_type: 'passenger',
    kyc_verified: false,
    phone: phone?.trim() ? phone.trim() : null,
    account_suspended: false,
  });

  if (insertErr) {
    console.error('admin create passenger profile:', insertErr);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create profile row' }, { status: 500 });
  }

  const { data: row, error: readErr } = await admin
    .from('users')
    .select(ADMIN_PASSENGER_SELECT)
    .eq('id', userId)
    .single();

  if (readErr || !row) {
    return NextResponse.json({ error: 'Created but failed to load profile' }, { status: 201 });
  }

  return NextResponse.json({ passenger: row }, { status: 201 });
}
