export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export type Vehicle = {
  id: string;
  registration: string;
  type: string;
  capacity: number;
  status: VehicleStatus;
  lastMaintenance: string;
  mileage: number;
  acquisitionDate: string;
  vin?: string;
  color?: string;
  fuelType?: string;
  insurer?: string;
  policyExpires?: string;
  nextInspectionDue?: string;
  notes?: string;
  wheelchairAccessible?: boolean;
  gpsTracked?: boolean;
};

export const VEHICLE_CLASS_OPTIONS = [
  'Bus',
  'Minibus',
  'Coach',
  'Sprinter',
  'Sedan shuttle',
] as const;

export type VehicleClass = (typeof VEHICLE_CLASS_OPTIONS)[number];

export const DEFAULT_CAPACITY_BY_CLASS: Record<VehicleClass, number> = {
  Bus: 45,
  Minibus: 18,
  Coach: 56,
  Sprinter: 14,
  'Sedan shuttle': 4,
};

export const FUEL_TYPE_OPTIONS = ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG', 'Other'] as const;
