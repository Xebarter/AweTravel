import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import {
  applicationInsertFromCreate,
  rowToRouteHomeAdApplication,
  type RouteHomeAdApplicationRow,
} from '@/lib/route-home-ads/db';
import { routeHomeAdApplicationCreateSchema } from '@/lib/route-home-ads/validate';

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

/**
 * GET /api/transporter/route-home-ad-applications — list the signed-in transporter's applications.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('route_home_ad_applications')
    .select(SELECT_APP)
    .eq('applicant_user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('route_home_ad_applications list:', error);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }

  type RouteJoin = { id: string; route_code: string; origin: string; destination: string };
  const rows = (data ?? []) as unknown as (RouteHomeAdApplicationRow & {
    route?: RouteJoin | RouteJoin[] | null;
  })[];
  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  return NextResponse.json({
    applications: rows.map((r) => {
      const { route, ...row } = r;
      return {
        ...rowToRouteHomeAdApplication(row as RouteHomeAdApplicationRow),
        route: one(route),
      };
    }),
  });
}

/**
 * POST /api/transporter/route-home-ad-applications — submit a new application.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = routeHomeAdApplicationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { routeId, headline, subheadline, ctaLabel, targetUrl, imageUrl, status } = parsed.data;

  const { data: routeRow, error: routeErr } = await supabase
    .from('transporter_routes')
    .select('id')
    .eq('id', routeId)
    .eq('owner_user_id', auth.userId)
    .maybeSingle();

  if (routeErr || !routeRow) {
    return NextResponse.json({ error: 'Route not found or not yours' }, { status: 404 });
  }

  const insert = applicationInsertFromCreate(auth.userId, {
    routeId,
    headline,
    subheadline,
    ctaLabel,
    targetUrl,
    imageUrl,
    status,
  });

  const { data, error } = await supabase
    .from('route_home_ad_applications')
    .insert(insert)
    .select(SELECT_APP)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        {
          error:
            'This route already has a draft or an application pending review. Open Home ad to continue or withdraw it first.',
        },
        { status: 409 },
      );
    }
    console.error('route_home_ad_applications insert:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
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
