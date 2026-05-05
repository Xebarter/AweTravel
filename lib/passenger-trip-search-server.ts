import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvailableRoute, RouteType, Seat, TransportCompany } from '@/lib/types';

export type TripSearchSort = 'price' | 'duration' | 'departure';

export type QueryTripSearchResultsInput = {
  admin: SupabaseClient;
  applyCorridorFilter: boolean;
  corridorFrom: string;
  corridorTo: string;
  ownerUserId: string | null;
  date: string;
  routeLimit: number;
  tripLimit: number;
  maxDeparturesPerRoute: number;
  offset: number;
  sort: TripSearchSort;
};

export type QueryTripSearchResultsOk = {
  data: AvailableRoute[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  sort: TripSearchSort;
};

type RouteRow = {
  id: string;
  owner_user_id: string;
  route_code: string;
  origin: string;
  destination: string;
  distance_km: number;
  duration_minutes: number;
  vehicle_class: string;
  base_price_minor: number;
  currency: string;
};

type DepartureRow = {
  id: string;
  route_id: string;
  vehicle_id: string | null;
  departure_time: string;
  price_override_minor: number | null;
};

type VehicleRow = {
  id: string;
  registration: string;
  vehicle_type: string;
  capacity: number;
};

type CompanyRow = {
  owner_user_id: string;
  company_name: string;
  trading_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  city: string | null;
  country: string | null;
  verified?: boolean;
};

function safeTimeHHMM(t: string | null | undefined) {
  if (!t) return '00:00';
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '00:00';
}

function routeTypeFromVehicleClass(vehicleClass: string | null | undefined): RouteType {
  const s = (vehicleClass ?? '').toLowerCase();
  if (s.includes('coach')) return 'coach';
  if (s.includes('minibus')) return 'minibus';
  if (s.includes('vessel') || s.includes('boat') || s.includes('ferry')) return 'vessel';
  return 'bus';
}

function buildCompany(row: CompanyRow): TransportCompany {
  return {
    id: row.owner_user_id,
    owner_user_id: row.owner_user_id,
    company_name: row.trading_name?.trim() || row.company_name,
    registration_number: '',
    license_number: '',
    verified: Boolean(row.verified ?? true),
    contact_email: row.support_email ?? '',
    contact_phone: row.support_phone ?? '',
    headquarters_location: row.city ?? row.country ?? '',
    created_at: new Date(0).toISOString(),
  };
}

function makeSeats(count: number, basePrice: number): Seat[] {
  const capped = Math.max(0, Math.min(60, count));
  return Array.from({ length: capped }, (_, i) => ({
    id: `avail-${i + 1}`,
    vehicle_id: 'unknown',
    seat_number: `S${String(i + 1).padStart(2, '0')}`,
    seat_type: 'regular' as const,
    base_price: basePrice,
    created_at: new Date(0).toISOString(),
  }));
}

function minSeatPrice(r: AvailableRoute): number {
  if (!r.available_seats.length) return 0;
  return Math.min(...r.available_seats.map((s) => s.base_price));
}

function sortTrips(rows: AvailableRoute[], sort: TripSearchSort): AvailableRoute[] {
  const out = [...rows];
  if (sort === 'price') {
    out.sort((a, b) => minSeatPrice(a) - minSeatPrice(b));
  } else if (sort === 'duration') {
    out.sort((a, b) => a.route.estimated_duration_minutes - b.route.estimated_duration_minutes);
  } else {
    out.sort((a, b) => a.schedule.departure_time.localeCompare(b.schedule.departure_time));
  }
  return out;
}

/**
 * Shared passenger trip search: active routes, departures, vehicles, company profiles,
 * and booking counts for a travel date. Used by authenticated passenger search and public home discover.
 */
export async function queryTripSearchResults(
  input: QueryTripSearchResultsInput,
): Promise<QueryTripSearchResultsOk | { error: string }> {
  const {
    admin,
    applyCorridorFilter,
    corridorFrom,
    corridorTo,
    ownerUserId,
    date,
    routeLimit,
    tripLimit,
    maxDeparturesPerRoute,
    offset,
    sort,
  } = input;

  const safeOffset = Math.max(0, offset);
  const safeRouteLimit = Math.max(1, Math.min(50, routeLimit));
  const safeTripLimit = Math.max(1, Math.min(500, tripLimit));
  const capDeps = maxDeparturesPerRoute > 0 ? Math.min(50, maxDeparturesPerRoute) : 50;

  let routesQuery = admin
    .from('transporter_routes')
    .select(
      'id,owner_user_id,route_code,origin,destination,distance_km,duration_minutes,vehicle_class,base_price_minor,currency',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeRouteLimit - 1);

  if (ownerUserId) {
    routesQuery = routesQuery.eq('owner_user_id', ownerUserId);
  }

  if (applyCorridorFilter) {
    const from = corridorFrom.trim();
    const to = corridorTo.trim();
    if (!from || !to) {
      return { error: 'Corridor search requires both origin and destination' };
    }
    routesQuery = routesQuery.ilike('origin', `%${from}%`).ilike('destination', `%${to}%`);
  }

  const { data: routes, error: routesErr } = await routesQuery;

  if (routesErr) {
    console.error('queryTripSearchResults routes:', routesErr);
    return { error: 'Failed to search routes' };
  }

  const routeRows = (routes ?? []) as unknown as RouteRow[];
  const routeIds = routeRows.map((r) => r.id);
  const owners = Array.from(new Set(routeRows.map((r) => r.owner_user_id)));

  const [{ data: departures }, { data: companies }] = await Promise.all([
    routeIds.length
      ? admin
          .from('transporter_route_departures')
          .select('id,route_id,vehicle_id,departure_time,price_override_minor')
          .eq('status', 'active')
          .in('route_id', routeIds)
      : Promise.resolve({ data: [] as DepartureRow[] }),
    owners.length
      ? admin
          .from('transporter_company_profiles')
          .select('owner_user_id,company_name,trading_name,support_email,support_phone,city,country')
          .in('owner_user_id', owners)
      : Promise.resolve({ data: [] as CompanyRow[] }),
  ]);

  const departureRows = (departures ?? []) as unknown as DepartureRow[];
  const vehicleIds = Array.from(new Set(departureRows.map((d) => d.vehicle_id).filter(Boolean))) as string[];
  const vehiclesRes = vehicleIds.length
    ? await admin.from('transporter_vehicles').select('id,registration,vehicle_type,capacity').in('id', vehicleIds)
    : { data: [] as VehicleRow[] };

  const vehicleRows = (vehiclesRes.data ?? []) as unknown as VehicleRow[];
  const companyRows = (companies ?? []) as unknown as CompanyRow[];

  const departuresByRoute = new Map<string, DepartureRow[]>();
  for (const d of departureRows) {
    const arr = departuresByRoute.get(d.route_id) ?? [];
    arr.push(d);
    departuresByRoute.set(d.route_id, arr);
  }
  for (const arr of departuresByRoute.values()) {
    arr.sort((a, b) => safeTimeHHMM(a.departure_time).localeCompare(safeTimeHHMM(b.departure_time)));
    if (capDeps < arr.length) arr.splice(capDeps);
  }

  const vehicleById = new Map<string, VehicleRow>(vehicleRows.map((v) => [v.id, v]));
  const companyByOwner = new Map<string, CompanyRow>(companyRows.map((c) => [c.owner_user_id, c]));

  const pairs = departureRows.map((d) => ({ route_id: d.route_id, departure_id: d.id }));
  const bookedKey = (routeId: string, departureId: string) => `${routeId}:${departureId}`;
  const bookedCounts = new Map<string, number>();

  if (pairs.length) {
    const { data: bookingRows, error: bookingErr } = await admin
      .from('bookings')
      .select('route_id,departure_id')
      .eq('travel_date', date)
      .in('status', ['pending', 'confirmed'])
      .in(
        'departure_id',
        pairs.map((p) => p.departure_id),
      );

    if (bookingErr) {
      console.error('queryTripSearchResults bookings:', bookingErr);
    } else {
      for (const b of (bookingRows ?? []) as { route_id?: string; departure_id?: string }[]) {
        if (!b.route_id || !b.departure_id) continue;
        const k = bookedKey(b.route_id, b.departure_id);
        bookedCounts.set(k, (bookedCounts.get(k) ?? 0) + 1);
      }
    }
  }

  const results: AvailableRoute[] = [];

  for (const r of routeRows) {
    const company = companyByOwner.get(r.owner_user_id);
    const companyObj = company
      ? buildCompany(company)
      : buildCompany({
          owner_user_id: r.owner_user_id,
          company_name: 'Operator',
          trading_name: null,
          support_email: null,
          support_phone: null,
          city: null,
          country: null,
        });

    const deps = departuresByRoute.get(r.id) ?? [];
    if (deps.length === 0) {
      const basePrice = r.base_price_minor ?? 0;
      results.push({
        trip_id: r.id,
        route: {
          id: r.id,
          company_id: r.owner_user_id,
          route_code: r.route_code,
          origin_city: r.origin,
          destination_city: r.destination,
          distance_km: Number(r.distance_km ?? 0),
          estimated_duration_minutes: Number(r.duration_minutes ?? 0),
          route_type: routeTypeFromVehicleClass(r.vehicle_class),
          is_active: true,
          created_at: new Date(0).toISOString(),
        },
        schedule: {
          id: r.id,
          route_id: r.id,
          departure_time: '00:00',
          arrival_time: '00:00',
          days_of_week: [],
          is_active: true,
          created_at: new Date(0).toISOString(),
        },
        vehicle: {
          id: 'unknown',
          company_id: r.owner_user_id,
          vehicle_registration: '',
          vehicle_type: routeTypeFromVehicleClass(r.vehicle_class),
          capacity: 50,
          current_status: 'active',
          created_at: new Date(0).toISOString(),
        },
        company: companyObj,
        available_seats: makeSeats(50, basePrice),
        total_seats: 50,
        booked_seats: 0,
      });
      continue;
    }

    for (const d of deps) {
      const vehicle = d.vehicle_id ? vehicleById.get(d.vehicle_id) : undefined;
      const totalSeats = vehicle?.capacity ?? 50;
      const booked = bookedCounts.get(bookedKey(r.id, d.id)) ?? 0;
      const available = Math.max(0, totalSeats - booked);
      const price = typeof d.price_override_minor === 'number' ? d.price_override_minor : r.base_price_minor ?? 0;
      const depart = safeTimeHHMM(d.departure_time);

      results.push({
        trip_id: d.id,
        route: {
          id: r.id,
          company_id: r.owner_user_id,
          route_code: r.route_code,
          origin_city: r.origin,
          destination_city: r.destination,
          distance_km: Number(r.distance_km ?? 0),
          estimated_duration_minutes: Number(r.duration_minutes ?? 0),
          route_type: routeTypeFromVehicleClass(r.vehicle_class),
          is_active: true,
          created_at: new Date(0).toISOString(),
        },
        schedule: {
          id: d.id,
          route_id: r.id,
          departure_time: depart,
          arrival_time: '—',
          days_of_week: [],
          is_active: true,
          created_at: new Date(0).toISOString(),
        },
        vehicle: {
          id: vehicle?.id ?? 'unknown',
          company_id: r.owner_user_id,
          vehicle_registration: vehicle?.registration ?? '',
          vehicle_type: routeTypeFromVehicleClass(vehicle?.vehicle_type ?? r.vehicle_class),
          capacity: totalSeats,
          current_status: 'active',
          created_at: new Date(0).toISOString(),
        },
        company: companyObj,
        available_seats: makeSeats(available, price),
        total_seats: totalSeats,
        booked_seats: booked,
      });
    }
  }

  const sorted = sortTrips(results, sort);
  const totalTrips = sorted.length;
  const data = sorted.slice(0, safeTripLimit);
  const hasMoreTrips = totalTrips > safeTripLimit;
  const hasMoreRoutes = routeRows.length === safeRouteLimit;

  return {
    data,
    total: totalTrips,
    offset: safeOffset,
    limit: safeTripLimit,
    hasMore: hasMoreTrips || hasMoreRoutes,
    sort,
  };
}
