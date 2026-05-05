import type { Vehicle, VehicleStatus } from '@/types/transporter-vehicle';

export type TransporterVehicleRow = {
  id: string;
  owner_user_id: string;
  registration: string;
  vehicle_type: string;
  capacity: number;
  status: VehicleStatus;
  last_maintenance_date: string;
  mileage_km: number;
  acquisition_date: string;
  vin: string | null;
  color: string | null;
  fuel_type: string | null;
  insurer: string | null;
  policy_expires: string | null;
  next_inspection_due: string | null;
  notes: string | null;
  wheelchair_accessible: boolean;
  gps_tracked: boolean;
  created_at: string;
  updated_at: string;
};

function dateToIsoDate(d: string): string {
  if (!d) return d;
  if (d.length === 10) return d;
  return d.slice(0, 10);
}

export function rowToVehicle(row: TransporterVehicleRow): Vehicle {
  return {
    id: row.id,
    registration: row.registration,
    type: row.vehicle_type,
    capacity: row.capacity,
    status: row.status,
    lastMaintenance: dateToIsoDate(row.last_maintenance_date),
    mileage: row.mileage_km,
    acquisitionDate: dateToIsoDate(row.acquisition_date),
    vin: row.vin ?? undefined,
    color: row.color ?? undefined,
    fuelType: row.fuel_type ?? undefined,
    insurer: row.insurer ?? undefined,
    policyExpires: row.policy_expires ? dateToIsoDate(row.policy_expires) : undefined,
    nextInspectionDue: row.next_inspection_due ? dateToIsoDate(row.next_inspection_due) : undefined,
    notes: row.notes ?? undefined,
    wheelchairAccessible: row.wheelchair_accessible ? true : undefined,
    gpsTracked: row.gps_tracked,
  };
}

export type VehicleInsert = {
  owner_user_id: string;
  registration: string;
  vehicle_type: string;
  capacity: number;
  status: VehicleStatus;
  last_maintenance_date: string;
  mileage_km: number;
  acquisition_date: string;
  vin?: string | null;
  color?: string | null;
  fuel_type?: string | null;
  insurer?: string | null;
  policy_expires?: string | null;
  next_inspection_due?: string | null;
  notes?: string | null;
  wheelchair_accessible: boolean;
  gps_tracked: boolean;
};

export function vehiclePayloadToInsert(
  ownerUserId: string,
  v: Omit<Vehicle, 'id'>,
): VehicleInsert {
  return {
    owner_user_id: ownerUserId,
    registration: v.registration.trim(),
    vehicle_type: v.type.trim(),
    capacity: v.capacity,
    status: v.status,
    last_maintenance_date: v.lastMaintenance,
    mileage_km: v.mileage,
    acquisition_date: v.acquisitionDate,
    vin: v.vin?.trim() || null,
    color: v.color?.trim() || null,
    fuel_type: v.fuelType?.trim() || null,
    insurer: v.insurer?.trim() || null,
    policy_expires: v.policyExpires?.trim() || null,
    next_inspection_due: v.nextInspectionDue?.trim() || null,
    notes: v.notes?.trim() || null,
    wheelchair_accessible: Boolean(v.wheelchairAccessible),
    gps_tracked: v.gpsTracked !== false,
  };
}

export function vehiclePayloadToUpdate(v: Partial<Omit<Vehicle, 'id'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (v.registration !== undefined) out.registration = v.registration.trim();
  if (v.type !== undefined) out.vehicle_type = v.type.trim();
  if (v.capacity !== undefined) out.capacity = v.capacity;
  if (v.status !== undefined) out.status = v.status;
  if (v.lastMaintenance !== undefined) out.last_maintenance_date = v.lastMaintenance;
  if (v.mileage !== undefined) out.mileage_km = v.mileage;
  if (v.acquisitionDate !== undefined) out.acquisition_date = v.acquisitionDate;
  if (v.vin !== undefined) out.vin = v.vin?.trim() || null;
  if (v.color !== undefined) out.color = v.color?.trim() || null;
  if (v.fuelType !== undefined) out.fuel_type = v.fuelType?.trim() || null;
  if (v.insurer !== undefined) out.insurer = v.insurer?.trim() || null;
  if (v.policyExpires !== undefined) out.policy_expires = v.policyExpires?.trim() || null;
  if (v.nextInspectionDue !== undefined) out.next_inspection_due = v.nextInspectionDue?.trim() || null;
  if (v.notes !== undefined) out.notes = v.notes?.trim() || null;
  if (v.wheelchairAccessible !== undefined) out.wheelchair_accessible = Boolean(v.wheelchairAccessible);
  if (v.gpsTracked !== undefined) out.gps_tracked = v.gpsTracked !== false;
  return out;
}
