import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

const listSchema = z.object({
  routeId: z.string().uuid().optional(),
});

const createSchema = z.object({
  routeId: z.string().uuid(),
  vehicleId: z.string().uuid().nullable().optional(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24-hour)'),
  daysOfWeek: z.number().int().min(1).max(127),
  status: z.enum(['active', 'paused']).default('active'),
  priceOverrideMinor: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const SELECT = `
  id,
  route_id,
  vehicle_id,
  departure_time,
  days_of_week,
  status,
  price_override_minor,
  notes,
  created_at,
  updated_at,
  route:transporter_routes!inner(route_code, origin, destination, owner_user_id),
  vehicle:transporter_vehicles(registration, vehicle_type)
`;

/**
 * GET /api/transporter/departures — list departures (optionally by routeId).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const parsed = listSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });

  let q = supabase
    .from('transporter_route_departures')
    .select(SELECT)
    .eq('route.owner_user_id', auth.userId)
    .order('updated_at', { ascending: false });

  if (parsed.data.routeId) q = q.eq('route_id', parsed.data.routeId);

  const { data, error } = await q;
  if (error) {
    console.error('transporter departures list:', error);
    return NextResponse.json({ error: 'Failed to load schedules' }, { status: 500 });
  }

  return NextResponse.json({ departures: data ?? [] });
}

/**
 * POST /api/transporter/departures — create a departure.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join('.') || 'payload'}: ${first.message}` : 'Invalid payload' },
      { status: 400 },
    );
  }

  // Ensure route belongs to this transporter.
  const { data: route, error: routeErr } = await supabase
    .from('transporter_routes')
    .select('id')
    .eq('id', parsed.data.routeId)
    .eq('owner_user_id', auth.userId)
    .maybeSingle();
  if (routeErr) {
    console.error('departure create route check:', routeErr);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 });

  // If vehicle is provided, ensure it belongs to this transporter.
  if (parsed.data.vehicleId) {
    const { data: vehicle, error: vErr } = await supabase
      .from('transporter_vehicles')
      .select('id')
      .eq('id', parsed.data.vehicleId)
      .eq('owner_user_id', auth.userId)
      .maybeSingle();
    if (vErr) {
      console.error('departure create vehicle check:', vErr);
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const insertRow = {
    route_id: parsed.data.routeId,
    vehicle_id: parsed.data.vehicleId ?? null,
    departure_time: parsed.data.departureTime,
    days_of_week: parsed.data.daysOfWeek,
    status: parsed.data.status,
    price_override_minor: parsed.data.priceOverrideMinor ?? null,
    notes: parsed.data.notes ?? null,
  };

  const { data, error } = await supabase
    .from('transporter_route_departures')
    .insert(insertRow)
    .select(SELECT)
    .single();

  if (error) {
    console.error('departure insert:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }

  return NextResponse.json({ departure: data }, { status: 201 });
}

