import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import { rowToRouteHomeAdApplication, type RouteHomeAdApplicationRow } from '@/lib/route-home-ads/db';

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

/**
 * GET /api/admin/route-home-ad-applications — list applications (admin).
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
    .from('route_home_ad_applications')
    .select(SELECT_APP)
    .order('created_at', { ascending: false });

  if (
    status === 'draft' ||
    status === 'pending_review' ||
    status === 'approved' ||
    status === 'rejected' ||
    status === 'withdrawn'
  ) {
    q = q.eq('status', status);
  }

  const { data, error } = await q;

  if (error) {
    console.error('admin route_home_ad_applications list:', error);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }

  type RouteJoin = { id: string; route_code: string; origin: string; destination: string };
  type ApplicantJoin = { id: string; full_name: string; email: string };
  type Row = RouteHomeAdApplicationRow & {
    route?: RouteJoin | RouteJoin[] | null;
    applicant?: ApplicantJoin | ApplicantJoin[] | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  const one = <T,>(v: T | T[] | null | undefined): T | null => {
    if (v == null) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  };

  return NextResponse.json({
    applications: rows.map((r) => {
      const { route, applicant, ...appRow } = r;
      return {
        ...rowToRouteHomeAdApplication(appRow),
        route: one(route),
        applicant: one(applicant),
      };
    }),
  });
}
