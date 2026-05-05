import { VEHICLE_CLASS_OPTIONS, type VehicleClass } from './transporter-vehicle';

export type RouteStatus = 'active' | 'paused' | 'archived';
export type DepartureStatus = 'active' | 'paused';

/** ISO weekday index used in the days-of-week bitmask. Sunday = 0 ... Saturday = 6. */
export const DAYS_OF_WEEK = [
  { index: 0, short: 'Sun', label: 'Sunday' },
  { index: 1, short: 'Mon', label: 'Monday' },
  { index: 2, short: 'Tue', label: 'Tuesday' },
  { index: 3, short: 'Wed', label: 'Wednesday' },
  { index: 4, short: 'Thu', label: 'Thursday' },
  { index: 5, short: 'Fri', label: 'Friday' },
  { index: 6, short: 'Sat', label: 'Saturday' },
] as const;

export const ALL_DAYS_MASK = 0b111_1111;
export const WEEKDAYS_MASK = 0b011_1110;
export const WEEKEND_MASK = 0b100_0001;

export function encodeDays(days: ReadonlyArray<number>): number {
  let mask = 0;
  for (const d of days) {
    if (d >= 0 && d <= 6) mask |= 1 << d;
  }
  return mask;
}

export function decodeDays(mask: number): number[] {
  const out: number[] = [];
  for (let d = 0; d <= 6; d += 1) {
    if (mask & (1 << d)) out.push(d);
  }
  return out;
}

export function describeDays(mask: number): string {
  if (mask === ALL_DAYS_MASK) return 'Every day';
  if (mask === WEEKDAYS_MASK) return 'Weekdays';
  if (mask === WEEKEND_MASK) return 'Weekends';
  const days = decodeDays(mask);
  return days.map((d) => DAYS_OF_WEEK[d].short).join(', ');
}

export type RouteStop = {
  id?: string;
  position: number;
  name: string;
  etaOffsetMinutes?: number;
};

export type RouteDeparture = {
  id?: string;
  vehicleId?: string | null;
  /** "HH:MM" 24-hour format. */
  departureTime: string;
  /** Bitmask: bit 0 = Sun … bit 6 = Sat. */
  daysOfWeek: number;
  status: DepartureStatus;
  /** Optional override of the route base price, in minor currency units. */
  priceOverrideMinor?: number | null;
  notes?: string;
  /** Cached fields populated when the API joins the vehicle. */
  vehicleRegistration?: string | null;
  vehicleType?: string | null;
};

export type Route = {
  id: string;
  routeCode: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  vehicleClass: VehicleClass;
  /** Sellable seats on this route; passenger booking map uses min(this, departure vehicle capacity). */
  passengerSeatingCapacity: number;
  basePriceMinor: number;
  currency: string;
  status: RouteStatus;
  notes?: string;
  stops: RouteStop[];
  departures: RouteDeparture[];
  createdAt?: string;
  updatedAt?: string;
};

export const ROUTE_STATUS_OPTIONS: ReadonlyArray<{ value: RouteStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
];

export const DEPARTURE_STATUS_OPTIONS: ReadonlyArray<{ value: DepartureStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

export { VEHICLE_CLASS_OPTIONS };
export type { VehicleClass };

export function suggestRouteCode(origin: string, destination: string, sequence = 1): string {
  const a = origin.trim().slice(0, 2).toUpperCase();
  const b = destination.trim().slice(0, 2).toUpperCase();
  const seq = String(Math.max(1, sequence)).padStart(3, '0');
  if (!a || !b) return '';
  return `${a}${b}-${seq}`;
}
