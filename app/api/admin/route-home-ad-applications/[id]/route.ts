import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import { rowToRouteHomeAdApplication, type RouteHomeAdApplicationRow } from '@/lib/route-home-ads/db';
import { routeHomeAdApplicationAdminReviewSchema } from '@/lib/route-home-ads/validate';

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
  route:transporter_routes ( id, route_code, origin, destination ),
  applicant:users!route_home_ad_applications_applicant_user_id_fkey ( id, full_name, email )
`;

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/route-home-ad-applications/[id] — approve or reject (admin).
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

  const parsed = routeHomeAdApplicationAdminReviewSchema.safeParse(body);
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
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (existing.status !== 'pending_review') {
    return NextResponse.json(
      { error: 'Only pending_review applications can be reviewed' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const decision = parsed.data;

  const updatePayload =
    decision.decision === 'approve'
      ? {
          status: 'approved' as const,
          reviewed_by: auth.userId,
          reviewed_at: now,
          rejection_reason: null,
        }
      : {
          status: 'rejected' as const,
          reviewed_by: auth.userId,
          reviewed_at: now,
          rejection_reason: decision.rejectionReason,
        };

  const { data, error } = await supabase
    .from('route_home_ad_applications')
    .update(updatePayload)
    .eq('id', id)
    .select(SELECT_APP)
    .single();

  if (error) {
    console.error('admin route_home_ad_applications review:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  type RouteJoin = { id: string; route_code: string; origin: string; destination: string };
  type ApplicantJoin = { id: string; full_name: string; email: string };
  const row = data as unknown as RouteHomeAdApplicationRow & {
    route?: RouteJoin | RouteJoin[] | null;
    applicant?: ApplicantJoin | ApplicantJoin[] | null;
  };
  const { route, applicant, ...appRow } = row;
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  return NextResponse.json({
    application: {
      ...rowToRouteHomeAdApplication(appRow),
      route: one(route),
      applicant: one(applicant),
    },
  });
}
