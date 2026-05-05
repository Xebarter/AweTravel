import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import { rowToVehicle, vehiclePayloadToInsert, type TransporterVehicleRow } from '@/lib/transporter-vehicles/db';
import { vehicleCreateSchema } from '@/lib/transporter-vehicles/validate';
import type { Vehicle } from '@/types/transporter-vehicle';

function parseJsonVehicle(body: unknown): Omit<Vehicle, 'id'> {
  const raw = body as Record<string, unknown>;
  return {
    registration: String(raw.registration ?? '').trim().toUpperCase(),
    type: String(raw.type ?? ''),
    capacity: Number(raw.capacity),
    status: raw.status as Vehicle['status'],
    lastMaintenance: String(raw.lastMaintenance ?? ''),
    mileage: Number(raw.mileage),
    acquisitionDate: String(raw.acquisitionDate ?? ''),
    vin: raw.vin != null ? String(raw.vin) : undefined,
    color: raw.color != null ? String(raw.color) : undefined,
    fuelType: raw.fuelType != null ? String(raw.fuelType) : undefined,
    insurer: raw.insurer != null ? String(raw.insurer) : undefined,
    policyExpires: raw.policyExpires != null ? String(raw.policyExpires) : undefined,
    nextInspectionDue: raw.nextInspectionDue != null ? String(raw.nextInspectionDue) : undefined,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    wheelchairAccessible: raw.wheelchairAccessible === true,
    gpsTracked: raw.gpsTracked !== false,
  };
}

/**
 * GET /api/transporter/vehicles — list the signed-in transporter's fleet.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { data, error } = await supabase
    .from('transporter_vehicles')
    .select('*')
    .eq('owner_user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('transporter_vehicles list:', error);
    return NextResponse.json({ error: 'Failed to load vehicles' }, { status: 500 });
  }

  const rows = (data ?? []) as TransporterVehicleRow[];
  return NextResponse.json({ vehicles: rows.map(rowToVehicle) });
}

/**
 * POST /api/transporter/vehicles — register a vehicle.
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

  let payload: Omit<Vehicle, 'id'>;
  try {
    const parsed = parseJsonVehicle(body);
    payload = vehicleCreateSchema.parse(parsed) as Omit<Vehicle, 'id'>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const insert = vehiclePayloadToInsert(auth.userId, payload);

  const { data, error } = await supabase
    .from('transporter_vehicles')
    .insert(insert)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A vehicle with that registration is already in your fleet.' },
        { status: 409 },
      );
    }
    console.error('transporter_vehicles insert:', error);
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }

  return NextResponse.json({ vehicle: rowToVehicle(data as TransporterVehicleRow) }, { status: 201 });
}
