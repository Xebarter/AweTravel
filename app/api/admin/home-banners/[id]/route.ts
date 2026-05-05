import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import { rowToHomeBanner, type HomeBannerRow } from '@/lib/route-home-ads/db';
import { homeBannerUpdateSchema, type HomeBannerUpdateInput } from '@/lib/route-home-ads/validate';

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

type Ctx = { params: Promise<{ id: string }> };

function buildUpdatePayload(v: HomeBannerUpdateInput): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (v.sourceApplicationId !== undefined) out.source_application_id = v.sourceApplicationId;
  if (v.imageUrl !== undefined) out.image_url = v.imageUrl;
  if (v.title !== undefined) out.title = v.title;
  if (v.subtitle !== undefined) out.subtitle = v.subtitle;
  if (v.ctaLabel !== undefined) out.cta_label = v.ctaLabel;
  if (v.linkUrl !== undefined) out.link_url = v.linkUrl;
  if (v.sponsoredLabel !== undefined) out.sponsored_label = v.sponsoredLabel;
  if (v.startsAt !== undefined) out.starts_at = v.startsAt;
  if (v.endsAt !== undefined) out.ends_at = v.endsAt;
  if (v.sortOrder !== undefined) out.sort_order = v.sortOrder;
  if (v.isActive !== undefined) out.is_active = v.isActive;
  return Object.keys(out).length ? out : null;
}

/**
 * PATCH /api/admin/home-banners/[id]
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = homeBannerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updatePayload = buildUpdatePayload(parsed.data);
  if (!updatePayload) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  if (parsed.data.startsAt !== undefined || parsed.data.endsAt !== undefined) {
    const { data: row } = await supabase
      .from('home_banners')
      .select('starts_at, ends_at')
      .eq('id', id)
      .maybeSingle();

    if (row) {
      const starts =
        (updatePayload.starts_at as string | undefined) ?? (row as { starts_at: string }).starts_at;
      const ends =
        (updatePayload.ends_at as string | null | undefined) ??
        (row as { ends_at: string | null }).ends_at;
      if (ends != null && new Date(ends).getTime() < new Date(starts).getTime()) {
        return NextResponse.json(
          { error: 'ends_at must be on or after starts_at' },
          { status: 400 },
        );
      }
    }
  }

  const { data, error } = await supabase
    .from('home_banners')
    .update(updatePayload)
    .eq('id', id)
    .select(SELECT_BANNER)
    .single();

  if (error) {
    console.error('admin home_banners patch:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  }

  return NextResponse.json({ banner: rowToHomeBanner(data as HomeBannerRow) });
}

/**
 * DELETE /api/admin/home-banners/[id]
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;

  const { data: deleted, error } = await supabase.from('home_banners').delete().eq('id', id).select('id');

  if (error) {
    console.error('admin home_banners delete:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }

  if (!deleted?.length) {
    return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
