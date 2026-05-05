import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import {
  departuresToInsert,
  rowToRoute,
  routePayloadToUpdate,
  stopsToInsert,
  type TransporterRouteRowDeep,
} from '@/lib/transporter-routes/db';
import { routeUpdateSchema } from '@/lib/transporter-routes/validate';

const SELECT_DEEP = `
  *,
  stops:transporter_route_stops(*),
  departures:transporter_route_departures(
    *,
    vehicle:transporter_vehicles(registration, vehicle_type)
  )
`;

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/transporter/routes/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid route id' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_routes')
    .select(SELECT_DEEP)
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('transporter_routes get:', error);
    return NextResponse.json({ error: 'Failed to load route' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ route: rowToRoute(data as unknown as TransporterRouteRowDeep) });
}

/**
 * PATCH /api/transporter/routes/[id]
 *
 * Updates the route fields and (when provided) replaces the full set of stops
 * and/or departures. Children replacement is delete-then-insert; if either
 * step fails the request returns the prior state unchanged.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid route id' }, { status: 400 });
  }

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

  const parsed = routeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first ? `${first.path.join('.') || 'payload'}: ${first.message}` : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const payload = parsed.data;

  // Verify the route belongs to this owner before any writes.
  const { data: existing, error: existingErr } = await supabase
    .from('transporter_routes')
    .select('id')
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .maybeSingle();
  if (existingErr) {
    console.error('transporter_routes ownership check:', existingErr);
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Verify any vehicleId references actually belong to this transporter.
  if (payload.departures) {
    const vehicleIds = Array.from(
      new Set(
        payload.departures
          .map((d) => d.vehicleId)
          .filter((v): v is string => Boolean(v)),
      ),
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
      const missing = vehicleIds.find((vid) => !owned.has(vid));
      if (missing) {
        return NextResponse.json(
          { error: 'One or more departures reference a vehicle that is not in your fleet.' },
          { status: 400 },
        );
      }
    }
  }

  const updateRow = routePayloadToUpdate(payload);
  if (Object.keys(updateRow).length > 0) {
    const { error: updateErr } = await supabase
      .from('transporter_routes')
      .update(updateRow)
      .eq('id', id)
      .eq('owner_user_id', auth.userId);
    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json(
          { error: 'A route with that code already exists.' },
          { status: 409 },
        );
      }
      console.error('transporter_routes update:', updateErr);
      return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
    }
  }

  if (payload.stops) {
    const { error: delErr } = await supabase
      .from('transporter_route_stops')
      .delete()
      .eq('route_id', id);
    if (delErr) {
      console.error('transporter_route_stops delete:', delErr);
      return NextResponse.json({ error: 'Failed to update route stops' }, { status: 500 });
    }
    if (payload.stops.length > 0) {
      const { error: insErr } = await supabase
        .from('transporter_route_stops')
        .insert(
          stopsToInsert(
            id,
            payload.stops.map((s, i) => ({
              position: s.position ?? i,
              name: s.name,
              etaOffsetMinutes: s.etaOffsetMinutes,
            })),
          ),
        );
      if (insErr) {
        console.error('transporter_route_stops insert:', insErr);
        return NextResponse.json({ error: 'Failed to update route stops' }, { status: 500 });
      }
    }
  }

  if (payload.departures) {
    const { error: delErr } = await supabase
      .from('transporter_route_departures')
      .delete()
      .eq('route_id', id);
    if (delErr) {
      console.error('transporter_route_departures delete:', delErr);
      return NextResponse.json({ error: 'Failed to update departures' }, { status: 500 });
    }
    if (payload.departures.length > 0) {
      const { error: insErr } = await supabase
        .from('transporter_route_departures')
        .insert(
          departuresToInsert(
            id,
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
      if (insErr) {
        console.error('transporter_route_departures insert:', insErr);
        return NextResponse.json({ error: 'Failed to update departures' }, { status: 500 });
      }
    }
  }

  const { data: deep, error: reloadErr } = await supabase
    .from('transporter_routes')
    .select(SELECT_DEEP)
    .eq('id', id)
    .maybeSingle();

  if (reloadErr || !deep) {
    console.error('transporter_routes reload after patch:', reloadErr);
    return NextResponse.json({ error: 'Failed to load updated route' }, { status: 500 });
  }

  return NextResponse.json({ route: rowToRoute(deep as unknown as TransporterRouteRowDeep) });
}

/**
 * DELETE /api/transporter/routes/[id]
 *
 * Children rows in `transporter_route_stops` and `transporter_route_departures`
 * cascade automatically via the FK constraints.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid route id' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_routes')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('transporter_routes delete:', error);
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
