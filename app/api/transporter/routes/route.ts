import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import {
  departuresToInsert,
  rowToRoute,
  routePayloadToInsert,
  stopsToInsert,
  type TransporterRouteRow,
  type TransporterRouteRowDeep,
} from '@/lib/transporter-routes/db';
import { routeCreateSchema } from '@/lib/transporter-routes/validate';

const SELECT_DEEP = `
  *,
  stops:transporter_route_stops(*),
  departures:transporter_route_departures(
    *,
    vehicle:transporter_vehicles(registration, vehicle_type)
  )
`;

/**
 * GET /api/transporter/routes — list the signed-in transporter's routes.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_routes')
    .select(SELECT_DEEP)
    .eq('owner_user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('transporter_routes list:', error);
    return NextResponse.json({ error: 'Failed to load routes' }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as TransporterRouteRowDeep[];
  return NextResponse.json({ routes: rows.map(rowToRoute) });
}

/**
 * POST /api/transporter/routes — create a route with nested stops + departures.
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = routeCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first ? `${first.path.join('.') || 'payload'}: ${first.message}` : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const payload = parsed.data;

  // Verify any vehicleId references actually belong to this transporter.
  const vehicleIds = Array.from(
    new Set(payload.departures.map((d) => d.vehicleId).filter((v): v is string => Boolean(v))),
  );
  if (vehicleIds.length > 0) {
    const { data: ownedVehicles, error: vehErr } = await supabase
      .from('transporter_vehicles')
      .select('id')
      .eq('owner_user_id', auth.userId)
      .in('id', vehicleIds);
    if (vehErr) {
      console.error('transporter_routes verify vehicles:', vehErr);
      return NextResponse.json({ error: 'Failed to verify vehicles' }, { status: 500 });
    }
    const owned = new Set((ownedVehicles ?? []).map((v) => v.id));
    const missing = vehicleIds.find((id) => !owned.has(id));
    if (missing) {
      return NextResponse.json(
        { error: 'One or more departures reference a vehicle that is not in your fleet.' },
        { status: 400 },
      );
    }
  }

  const insertRow = routePayloadToInsert(auth.userId, payload);

  const { data: routeData, error: routeErr } = await supabase
    .from('transporter_routes')
    .insert(insertRow)
    .select('*')
    .single();

  if (routeErr || !routeData) {
    if (routeErr?.code === '23505') {
      return NextResponse.json(
        { error: 'A route with that code already exists.' },
        { status: 409 },
      );
    }
    console.error('transporter_routes insert:', routeErr);
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
  }

  const route = routeData as TransporterRouteRow;

  // Insert children. If anything fails, roll back by deleting the parent
  // (FK cascade will clean up any partial children).
  if (payload.stops.length > 0) {
    const { error: stopsErr } = await supabase
      .from('transporter_route_stops')
      .insert(
        stopsToInsert(
          route.id,
          payload.stops.map((s, i) => ({
            position: s.position ?? i,
            name: s.name,
            etaOffsetMinutes: s.etaOffsetMinutes,
          })),
        ),
      );
    if (stopsErr) {
      console.error('transporter_route_stops insert:', stopsErr);
      await supabase.from('transporter_routes').delete().eq('id', route.id);
      return NextResponse.json({ error: 'Failed to save route stops' }, { status: 500 });
    }
  }

  if (payload.departures.length > 0) {
    const { error: depsErr } = await supabase
      .from('transporter_route_departures')
      .insert(
        departuresToInsert(
          route.id,
          payload.departures.map((d) => ({
            departureTime: d.departureTime,
            daysOfWeek: d.daysOfWeek,
            status: d.status,
            vehicleId: d.vehicleId ?? null,
            priceOverrideMinor: d.priceOverrideMinor ?? null,
            notes: d.notes ?? undefined,
          })),
        ),
      );
    if (depsErr) {
      console.error('transporter_route_departures insert:', depsErr);
      await supabase.from('transporter_routes').delete().eq('id', route.id);
      return NextResponse.json({ error: 'Failed to save route departures' }, { status: 500 });
    }
  }

  // Re-read with deep select so the response includes children + vehicle joins.
  const { data: deep, error: deepErr } = await supabase
    .from('transporter_routes')
    .select(SELECT_DEEP)
    .eq('id', route.id)
    .single();

  if (deepErr || !deep) {
    console.error('transporter_routes reload after insert:', deepErr);
    // Fallback: return the bare row with empty children.
    return NextResponse.json(
      { route: rowToRoute({ ...route, stops: [], departures: [] }) },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { route: rowToRoute(deep as unknown as TransporterRouteRowDeep) },
    { status: 201 },
  );
}
