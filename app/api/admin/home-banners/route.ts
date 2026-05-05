import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import { rowToHomeBanner, type HomeBannerRow } from '@/lib/route-home-ads/db';
import { homeBannerCreateSchema } from '@/lib/route-home-ads/validate';

const SELECT_BANNER = `
  id,
  source_application_id,
  image_url,
  title,
  subtitle,
  cta_label,
  link_url,
  sponsored_label,
  starts_at,
  ends_at,
  sort_order,
  is_active,
  created_by,
  created_at,
  updated_at
`;

/**
 * GET /api/admin/home-banners — all banners (admin).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('home_banners')
    .select(SELECT_BANNER)
    .order('sort_order', { ascending: true })
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('admin home_banners list:', error);
    return NextResponse.json({ error: 'Failed to load banners' }, { status: 500 });
  }

  const rows = (data ?? []) as HomeBannerRow[];
  return NextResponse.json({ banners: rows.map(rowToHomeBanner) });
}

/**
 * POST /api/admin/home-banners — create a banner (admin).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = homeBannerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const v = parsed.data;

  if (v.sourceApplicationId) {
    const { data: srcApp, error: srcErr } = await supabase
      .from('route_home_ad_applications')
      .select('id, status')
      .eq('id', v.sourceApplicationId)
      .maybeSingle();

    if (srcErr || !srcApp) {
      return NextResponse.json({ error: 'Source application not found' }, { status: 404 });
    }
    if ((srcApp as { status: string }).status !== 'approved') {
      return NextResponse.json(
        { error: 'Approve the application before publishing a banner linked to it' },
        { status: 400 },
      );
    }
  }

  const insert = {
    source_application_id: v.sourceApplicationId ?? null,
    image_url: v.imageUrl,
    title: v.title,
    subtitle: v.subtitle ?? null,
    cta_label: v.ctaLabel,
    link_url: v.linkUrl,
    sponsored_label: v.sponsoredLabel ?? null,
    starts_at: v.startsAt,
    ends_at: v.endsAt ?? null,
    sort_order: v.sortOrder,
    is_active: v.isActive,
    created_by: auth.userId,
  };

  const { data, error } = await supabase.from('home_banners').insert(insert).select(SELECT_BANNER).single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A homepage banner for this application already exists' },
        { status: 409 },
      );
    }
    console.error('admin home_banners insert:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }

  return NextResponse.json({ banner: rowToHomeBanner(data as HomeBannerRow) });
}
