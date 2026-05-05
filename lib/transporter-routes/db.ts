import type {
  Route,
  RouteDeparture,
  RouteStatus,
  RouteStop,
  DepartureStatus,
} from '@/types/transporter-route';
import type { VehicleClass } from '@/types/transporter-vehicle';

export type TransporterRouteRow = {
  id: string;
  owner_user_id: string;
  route_code: string;
  origin: string;
  destination: string;
  distance_km: number | string;
  duration_minutes: number;
  vehicle_class: string;
  passenger_seating_capacity: number;
  base_price_minor: number;
  currency: string;
  status: RouteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TransporterRouteStopRow = {
  id: string;
  route_id: string;
  position: number;
  name: string;
  eta_offset_minutes: number | null;
  created_at: string;
};

export type TransporterRouteDepartureRow = {
  id: string;
  route_id: string;
  vehicle_id: string | null;
  departure_time: string;
  days_of_week: number;
  status: DepartureStatus;
  price_override_minor: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Optional joined fields when the API selects the parent vehicle. */
  vehicle?: { registration: string | null; vehicle_type: string | null } | null;
};

export type TransporterRouteRowDeep = TransporterRouteRow & {
  stops?: TransporterRouteStopRow[] | null;
  departures?: TransporterRouteDepartureRow[] | null;
};

function toNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** "08:00:00" -> "08:00" (drop seconds for the UI). */
function trimTime(time: string): string {
  if (!time) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  return time.slice(0, 5);
}

export function rowToStop(row: TransporterRouteStopRow): RouteStop {
  return {
    id: row.id,
    position: row.position,
    name: row.name,
    etaOffsetMinutes: row.eta_offset_minutes ?? undefined,
  };
}

export function rowToDeparture(row: TransporterRouteDepartureRow): RouteDeparture {
  return {
    id: row.id,
    vehicleId: row.vehicle_id ?? null,
    departureTime: trimTime(row.departure_time),
    daysOfWeek: row.days_of_week,
    status: row.status,
    priceOverrideMinor: row.price_override_minor ?? null,
    notes: row.notes ?? undefined,
    vehicleRegistration: row.vehicle?.registration ?? null,
    vehicleType: row.vehicle?.vehicle_type ?? null,
  };
}

export function rowToRoute(row: TransporterRouteRowDeep): Route {
  const stops = (row.stops ?? []).slice().sort((a, b) => a.position - b.position).map(rowToStop);
  const departures = (row.departures ?? [])
    .slice()
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
    .map(rowToDeparture);
  return {
    id: row.id,
    routeCode: row.route_code,
    origin: row.origin,
    destination: row.destination,
    distanceKm: toNumber(row.distance_km),
    durationMinutes: row.duration_minutes,
    vehicleClass: row.vehicle_class as VehicleClass,
    passengerSeatingCapacity: Number(row.passenger_seating_capacity ?? 50),
    basePriceMinor: row.base_price_minor,
    currency: row.currency,
    status: row.status,
    notes: row.notes ?? undefined,
    stops,
    departures,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type RouteInsert = {
  owner_user_id: string;
  route_code: string;
  origin: string;
  destination: string;
  distance_km: number;
  duration_minutes: number;
  vehicle_class: string;
  passenger_seating_capacity: number;
  base_price_minor: number;
  currency: string;
  status: RouteStatus;
  notes: string | null;
};

export function routePayloadToInsert(
  ownerUserId: string,
  payload: {
    routeCode: string;
    origin: string;
    destination: string;
    distanceKm: number;
    durationMinutes: number;
    vehicleClass: string;
    passengerSeatingCapacity: number;
    basePriceMinor: number;
    currency: string;
    status: RouteStatus;
    notes?: string | null;
  },
): RouteInsert {
  return {
    owner_user_id: ownerUserId,
    route_code: payload.routeCode.trim(),
    origin: payload.origin.trim(),
    destination: payload.destination.trim(),
    distance_km: payload.distanceKm,
    duration_minutes: payload.durationMinutes,
    vehicle_class: payload.vehicleClass,
    passenger_seating_capacity: payload.passengerSeatingCapacity,
    base_price_minor: payload.basePriceMinor,
    currency: payload.currency.trim().toUpperCase(),
    status: payload.status,
    notes: payload.notes?.trim() || null,
  };
}

export function routePayloadToUpdate(payload: {
  routeCode?: string;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  durationMinutes?: number;
  vehicleClass?: string;
  passengerSeatingCapacity?: number;
  basePriceMinor?: number;
  currency?: string;
  status?: RouteStatus;
  notes?: string | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.routeCode !== undefined) out.route_code = payload.routeCode.trim();
  if (payload.origin !== undefined) out.origin = payload.origin.trim();
  if (payload.destination !== undefined) out.destination = payload.destination.trim();
  if (payload.distanceKm !== undefined) out.distance_km = payload.distanceKm;
  if (payload.durationMinutes !== undefined) out.duration_minutes = payload.durationMinutes;
  if (payload.vehicleClass !== undefined) out.vehicle_class = payload.vehicleClass;
  if (payload.passengerSeatingCapacity !== undefined) {
    out.passenger_seating_capacity = payload.passengerSeatingCapacity;
  }
  if (payload.basePriceMinor !== undefined) out.base_price_minor = payload.basePriceMinor;
  if (payload.currency !== undefined) out.currency = payload.currency.trim().toUpperCase();
  if (payload.status !== undefined) out.status = payload.status;
  if (payload.notes !== undefined) out.notes = payload.notes?.trim() || null;
  return out;
}

export function stopsToInsert(routeId: string, stops: ReadonlyArray<RouteStop>) {
  return stops.map((s, i) => ({
    route_id: routeId,
    position: s.position ?? i,
    name: s.name.trim(),
    eta_offset_minutes: s.etaOffsetMinutes ?? null,
  }));
}

export function departuresToInsert(
  routeId: string,
  departures: ReadonlyArray<RouteDeparture>,
) {
  return departures.map((d) => ({
    route_id: routeId,
    vehicle_id: d.vehicleId || null,
    departure_time: d.departureTime,
    days_of_week: d.daysOfWeek,
    status: d.status,
    price_override_minor: d.priceOverrideMinor ?? null,
    notes: d.notes?.trim() || null,
  }));
}
