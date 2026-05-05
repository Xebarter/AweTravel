import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import { rowToVehicle, vehiclePayloadToUpdate, type TransporterVehicleRow } from '@/lib/transporter-vehicles/db';
import { vehicleUpdateSchema } from '@/lib/transporter-vehicles/validate';
import type { Vehicle } from '@/types/transporter-vehicle';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePartialVehicle(body: unknown): Partial<Omit<Vehicle, 'id'>> {
  const raw = body as Record<string, unknown>;
  const out: Partial<Omit<Vehicle, 'id'>> = {};
  if ('registration' in raw) out.registration = String(raw.registration ?? '').trim().toUpperCase();
  if ('type' in raw) out.type = String(raw.type ?? '');
  if ('capacity' in raw) out.capacity = Number(raw.capacity);
  if ('status' in raw) out.status = raw.status as Vehicle['status'];
  if ('lastMaintenance' in raw) out.lastMaintenance = String(raw.lastMaintenance ?? '');
  if ('mileage' in raw) out.mileage = Number(raw.mileage);
  if ('acquisitionDate' in raw) out.acquisitionDate = String(raw.acquisitionDate ?? '');
  if ('vin' in raw) out.vin = raw.vin == null || raw.vin === '' ? undefined : String(raw.vin);
  if ('color' in raw) out.color = raw.color == null || raw.color === '' ? undefined : String(raw.color);
  if ('fuelType' in raw) out.fuelType = raw.fuelType == null ? undefined : String(raw.fuelType);
  if ('insurer' in raw) out.insurer = raw.insurer == null ? undefined : String(raw.insurer);
  if ('policyExpires' in raw)
    out.policyExpires =
      raw.policyExpires == null || raw.policyExpires === '' ? undefined : String(raw.policyExpires);
  if ('nextInspectionDue' in raw)
    out.nextInspectionDue =
      raw.nextInspectionDue == null || raw.nextInspectionDue === '' ? undefined : String(raw.nextInspectionDue);
  if ('notes' in raw) out.notes = raw.notes == null ? undefined : String(raw.notes);
  if ('wheelchairAccessible' in raw) out.wheelchairAccessible = raw.wheelchairAccessible === true;
  if ('gpsTracked' in raw) out.gpsTracked = raw.gpsTracked !== false;
  return out;
}

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/transporter/vehicles/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid vehicle id' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_vehicles')
    .select('*')
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('transporter_vehicles get:', error);
    return NextResponse.json({ error: 'Failed to load vehicle' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ vehicle: rowToVehicle(data as TransporterVehicleRow) });
}

/**
 * PATCH /api/transporter/vehicles/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid vehicle id' }, { status: 400 });
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

  const partial = parsePartialVehicle(body);
  let validated: Partial<Omit<Vehicle, 'id'>>;
  try {
    validated = vehicleUpdateSchema.parse(partial) as Partial<Omit<Vehicle, 'id'>>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const updateRow = vehiclePayloadToUpdate(validated);
  if (Object.keys(updateRow).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('transporter_vehicles')
    .update(updateRow)
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A vehicle with that registration is already in your fleet.' },
        { status: 409 },
      );
    }
    console.error('transporter_vehicles update:', error);
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ vehicle: rowToVehicle(data as TransporterVehicleRow) });
}

/**
 * DELETE /api/transporter/vehicles/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid vehicle id' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_vehicles')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', auth.userId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('transporter_vehicles delete:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
