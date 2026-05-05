import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

type CompanyPayload = {
  company_name: string;
  trading_name?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  ops_email?: string | null;
  ops_phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  about?: string | null;
};

function normalizeText(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function normalizeEmail(v: unknown): string | null {
  const t = normalizeText(v, 320);
  if (!t) return null;
  return t.toLowerCase();
}

/**
 * GET /api/transporter/profile
 * - returns transporter owner profile fields + company profile row (nullable)
 *
 * PUT /api/transporter/profile
 * - updates owner profile (public.users)
 *
 * PATCH /api/transporter/profile
 * - upserts transporter_company_profiles row
 *
 * DELETE /api/transporter/profile
 * - deletes transporter_company_profiles row
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const [{ data: owner, error: ownerErr }, { data: company, error: companyErr }] = await Promise.all([
    supabase.from('users').select('id,email,full_name,phone,profile_image,user_type,kyc_verified,created_at').eq('id', auth.userId).single(),
    supabase.from('transporter_company_profiles').select('*').eq('owner_user_id', auth.userId).maybeSingle(),
  ]);

  if (ownerErr) {
    console.error('transporter profile owner:', ownerErr);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
  if (companyErr) {
    console.error('transporter profile company:', companyErr);
    return NextResponse.json({ error: 'Failed to load company profile' }, { status: 500 });
  }

  return NextResponse.json({
    owner,
    company,
  });
}

export async function PUT(req: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: any = null;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fullName = normalizeText(body?.full_name, 120);
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  const phone = normalizeText(body?.phone, 40);
  const profileImage = normalizeText(body?.profile_image, 1000);

  const { error: updErr } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      phone,
      profile_image: profileImage,
    })
    .eq('id', auth.userId);

  if (updErr) {
    console.error('transporter profile owner update:', updErr);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }

  const { data: refreshed, error: fetchErr } = await supabase
    .from('users')
    .select('id,email,full_name,phone,profile_image,user_type,kyc_verified,created_at')
    .eq('id', auth.userId)
    .single();

  if (fetchErr) {
    console.error('transporter profile owner refresh:', fetchErr);
    return NextResponse.json({ error: 'Saved, but failed to refresh profile' }, { status: 500 });
  }

  return NextResponse.json({ owner: refreshed });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: any = null;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const p: CompanyPayload | null = body?.company ?? null;
  const companyName = normalizeText(p?.company_name, 180);
  if (!companyName) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });

  const payload = {
    owner_user_id: auth.userId,
    company_name: companyName,
    trading_name: normalizeText(p?.trading_name, 180),
    support_email: normalizeEmail(p?.support_email),
    support_phone: normalizeText(p?.support_phone, 60),
    ops_email: normalizeEmail(p?.ops_email),
    ops_phone: normalizeText(p?.ops_phone, 60),
    website: normalizeText(p?.website, 320),
    logo_url: normalizeText(p?.logo_url, 1000),
    address_line1: normalizeText(p?.address_line1, 240),
    address_line2: normalizeText(p?.address_line2, 240),
    city: normalizeText(p?.city, 120),
    region: normalizeText(p?.region, 120),
    country: normalizeText(p?.country, 120) ?? 'Uganda',
    registration_number: normalizeText(p?.registration_number, 120),
    tax_id: normalizeText(p?.tax_id, 120),
    about: normalizeText(p?.about, 400),
  };

  const { error } = await supabase.from('transporter_company_profiles').upsert(payload, {
    onConflict: 'owner_user_id',
  });

  if (error) {
    console.error('transporter profile company upsert:', error);
    return NextResponse.json({ error: 'Failed to save company profile' }, { status: 500 });
  }

  const { data: company, error: fetchErr } = await supabase
    .from('transporter_company_profiles')
    .select('*')
    .eq('owner_user_id', auth.userId)
    .maybeSingle();

  if (fetchErr) {
    console.error('transporter profile company refresh:', fetchErr);
    return NextResponse.json({ error: 'Saved, but failed to refresh company profile' }, { status: 500 });
  }

  return NextResponse.json({ company });
}

export async function DELETE() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { error } = await supabase.from('transporter_company_profiles').delete().eq('owner_user_id', auth.userId);
  if (error) {
    console.error('transporter profile company delete:', error);
    return NextResponse.json({ error: 'Failed to delete company profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

