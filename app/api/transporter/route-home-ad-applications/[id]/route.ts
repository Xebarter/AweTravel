import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import { rowToRouteHomeAdApplication, type RouteHomeAdApplicationRow } from '@/lib/route-home-ads/db';
import { routeHomeAdApplicationTransporterPatchSchema } from '@/lib/route-home-ads/validate';

const SELECT_APP = `
  id,
  applicant_user_id,
  route_id,
  headline,
  subheadline,
  cta_label,
  target_url,
  image_url,
  status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at,
  updated_at,
  route:transporter_routes ( id, route_code, origin, destination )
`;

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/transporter/route-home-ad-applications/[id] — withdraw (from draft/pending) or edit draft.
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = routeHomeAdApplicationTransporterPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data: existing, error: loadErr } = await supabase
    .from('route_home_ad_applications')
    .select('id, status')
    .eq('id', id)
    .eq('applicant_user_id', auth.userId)
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const patch = parsed.data;
  const isWithdraw = patch.status === 'withdrawn';
  const isSubmitForReview = patch.status === 'pending_review';

  if (isWithdraw) {
    if (existing.status !== 'draft' && existing.status !== 'pending_review') {
      return NextResponse.json(
        { error: 'Only draft or pending applications can be withdrawn' },
        { status: 400 },
      );
    }
  } else if (isSubmitForReview) {
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft applications can be submitted for review' },
        { status: 400 },
      );
    }
  } else {
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft applications can be edited' },
        { status: 400 },
      );
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (isWithdraw) {
    updatePayload.status = 'withdrawn';
  } else {
    if (patch.headline !== undefined) updatePayload.headline = patch.headline;
    if (patch.subheadline !== undefined) updatePayload.subheadline = patch.subheadline;
    if (patch.ctaLabel !== undefined) updatePayload.cta_label = patch.ctaLabel;
    if (patch.targetUrl !== undefined) updatePayload.target_url = patch.targetUrl;
    if (patch.imageUrl !== undefined) updatePayload.image_url = patch.imageUrl;
    if (isSubmitForReview) updatePayload.status = 'pending_review';
  }

  const { data, error } = await supabase
    .from('route_home_ad_applications')
    .update(updatePayload)
    .eq('id', id)
    .eq('applicant_user_id', auth.userId)
    .select(SELECT_APP)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        {
          error:
            'This route already has an application pending review. Withdraw it first if you need to replace it.',
        },
        { status: 409 },
      );
    }
    console.error('route_home_ad_applications patch:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  type RouteJoin = { id: string; route_code: string; origin: string; destination: string };
  const row = data as unknown as RouteHomeAdApplicationRow & {
    route?: RouteJoin | RouteJoin[] | null;
  };
  const { route: routeJoin, ...appRow } = row;
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  return NextResponse.json({
    application: {
      ...rowToRouteHomeAdApplication(appRow as RouteHomeAdApplicationRow),
      route: one(routeJoin),
    },
  });
}
