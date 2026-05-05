import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

const uuidSchema = z.string().uuid();
const patchSchema = z
  .object({
    routeId: uuidSchema.optional(),
    vehicleId: z.union([uuidSchema, z.null()]).optional(),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24-hour)').optional(),
    daysOfWeek: z.number().int().min(1).max(127).optional(),
    status: z.enum(['active', 'paused']).optional(),
    priceOverrideMinor: z.number().int().min(0).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

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
  vehicle:transporter_vehicles(registration, vehicle_type, capacity)
`;

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

function trimDepartureTime(t: string): string {
  if (!t) return t;
  return /^\d{2}:\d{2}$/.test(t) ? t : t.slice(0, 5);
}

/**
 * GET /api/transporter/departures/[id] — one schedule (ownership via route).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!uuidRe.test(id)) return NextResponse.json({ error: 'Invalid departure id' }, { status: 400 });

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_route_departures')
    .select(SELECT)
    .eq('id', id)
    .eq('route.owner_user_id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('departure get:', error);
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const dep = data as { departure_time: string };
  return NextResponse.json({
    departure: { ...dep, departure_time: trimDepartureTime(dep.departure_time) },
  });
}

/**
 * PATCH /api/transporter/departures/[id]
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!uuidRe.test(id)) return NextResponse.json({ error: 'Invalid departure id' }, { status: 400 });

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join('.') || 'payload'}: ${first.message}` : 'Invalid payload' },
      { status: 400 },
    );
  }

  // Ensure the departure exists and belongs to this transporter via its route.
  const { data: existing, error: exErr } = await supabase
    .from('transporter_route_departures')
    .select('id, route_id, route:transporter_routes!inner(owner_user_id)')
    .eq('id', id)
    .eq('route.owner_user_id', auth.userId)
    .maybeSingle();
  if (exErr) {
    console.error('departure patch ownership check:', exErr);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.routeId !== undefined) {
    const { data: rte, error: rteErr } = await supabase
      .from('transporter_routes')
      .select('id')
      .eq('id', parsed.data.routeId)
      .eq('owner_user_id', auth.userId)
      .maybeSingle();
    if (rteErr) {
      console.error('departure patch route check:', rteErr);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
    if (!rte) return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  if ('vehicleId' in parsed.data && parsed.data.vehicleId) {
    const { data: vehicle, error: vErr } = await supabase
      .from('transporter_vehicles')
      .select('id')
      .eq('id', parsed.data.vehicleId)
      .eq('owner_user_id', auth.userId)
      .maybeSingle();
    if (vErr) {
      console.error('departure patch vehicle check:', vErr);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const updateRow: Record<string, unknown> = {};
  if (parsed.data.routeId !== undefined) updateRow.route_id = parsed.data.routeId;
  if ('vehicleId' in parsed.data) updateRow.vehicle_id = parsed.data.vehicleId ?? null;
  if (parsed.data.departureTime !== undefined) updateRow.departure_time = parsed.data.departureTime;
  if (parsed.data.daysOfWeek !== undefined) updateRow.days_of_week = parsed.data.daysOfWeek;
  if (parsed.data.status !== undefined) updateRow.status = parsed.data.status;
  if (parsed.data.priceOverrideMinor !== undefined) updateRow.price_override_minor = parsed.data.priceOverrideMinor;
  if (parsed.data.notes !== undefined) updateRow.notes = parsed.data.notes;

  const { data, error } = await supabase
    .from('transporter_route_departures')
    .update(updateRow)
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    console.error('departure patch:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }

  return NextResponse.json({ departure: data });
}

/**
 * DELETE /api/transporter/departures/[id]
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!uuidRe.test(id)) return NextResponse.json({ error: 'Invalid departure id' }, { status: 400 });

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_route_departures')
    .delete()
    .eq('id', id)
    .select('id, route:transporter_routes!inner(owner_user_id)')
    .eq('route.owner_user_id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('departure delete:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

