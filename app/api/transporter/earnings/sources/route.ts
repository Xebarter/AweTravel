import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

const querySchema = z.object({
  routeId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from (YYYY-MM-DD)')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to (YYYY-MM-DD)')
    .optional(),
  q: z.string().trim().min(1).max(120).optional(),
  groupBy: z.enum(['none', 'route', 'date', 'departure', 'month']).optional().default('none'),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const SELECT = [
  'id',
  'booking_code',
  'travel_date',
  'seat_code',
  'status',
  'amount_minor',
  'currency',
  'payment_status',
  'payment_reference',
  'created_at',
  'route_id',
  'departure_id',
  'guest_full_name',
  'guest_email',
  'passenger:users!bookings_passenger_user_id_fkey(id,full_name,email)',
  'route:transporter_routes!inner(id,owner_user_id,route_code,origin,destination)',
  'departure:transporter_route_departures(id,departure_time,vehicle:transporter_vehicles(id,registration))',
  'platform_transaction:platform_transactions(id,kind,status,amount_ugx,currency,created_at,completed_at,gateway_reference,external_reference)',
].join(',');

type EarningSourceItem = {
  bookingId: string;
  bookingCode: string;
  travelDate: string;
  seatCode: string;
  bookingStatus: string;
  amountMinor: number;
  currency: string;
  paymentReference: string | null;
  bookedAt: string;
  passenger: { id: string; name: string | null; email: string | null } | null;
  route: { id: string; routeCode: string; origin: string; destination: string } | null;
  departure: {
    id: string;
    departureTime: string | null;
    vehicle: { id: string; registration: string } | null;
  } | null;
  transaction: {
    id: string;
    kind: string;
    status: string;
    amountUgx: number;
    currency: string;
    createdAt: string;
    completedAt: string | null;
    reference: string | null;
  } | null;
  earnedAt: string | null;
};

type Group = {
  key: string;
  label: string;
  count: number;
  amountUgx: number;
  latestEarnedAt: string | null;
};

function buildGroups(
  items: EarningSourceItem[],
  groupBy: 'route' | 'date' | 'departure' | 'month',
): Group[] {
  const buckets = new Map<string, Group>();

  for (const it of items) {
    const earnedAt = it.earnedAt ?? it.bookedAt;
    let key = 'unknown';
    let label = 'Unknown';

    if (groupBy === 'route') {
      key = it.route?.id ?? 'unknown';
      label = it.route
        ? `${it.route.routeCode} · ${it.route.origin} → ${it.route.destination}`
        : 'Unknown route';
    } else if (groupBy === 'date') {
      key = (earnedAt ?? '').slice(0, 10) || 'unknown';
      label = key === 'unknown' ? 'Unknown date' : key;
    } else if (groupBy === 'month') {
      key = (earnedAt ?? '').slice(0, 7) || 'unknown';
      label = key === 'unknown' ? 'Unknown month' : key;
    } else if (groupBy === 'departure') {
      const time = it.departure?.departureTime
        ? String(it.departure.departureTime).slice(0, 5)
        : '—';
      const route = it.route?.routeCode ?? '—';
      key = `${it.route?.id ?? 'unknown'}::${it.departure?.id ?? 'none'}`;
      label = `${route} · ${time}`;
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.amountUgx += it.amountMinor;
      if (earnedAt && (!existing.latestEarnedAt || earnedAt > existing.latestEarnedAt)) {
        existing.latestEarnedAt = earnedAt;
      }
    } else {
      buckets.set(key, {
        key,
        label,
        count: 1,
        amountUgx: it.amountMinor,
        latestEarnedAt: earnedAt,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.amountUgx - a.amountUgx);
}

export async function GET(req: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { userId } = auth;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join('.') || 'query'}: ${first.message}` : 'Invalid query' },
      { status: 400 },
    );
  }
  const { routeId, from, to, q, groupBy, limit, offset } = parsed.data;

  // Resolve owned route ids to filter on bookings.route_id (avoids brittle embed filters).
  const { data: ownedRoutes, error: routesErr } = await supabase
    .from('transporter_routes')
    .select('id')
    .eq('owner_user_id', userId);

  if (routesErr) {
    console.error('transporter earnings sources owned routes:', routesErr);
    return NextResponse.json({ error: 'Failed to load earning sources' }, { status: 500 });
  }

  const ownedIds = (ownedRoutes ?? []).map((r: { id: string }) => r.id);
  if (ownedIds.length === 0) {
    return NextResponse.json({
      items: [],
      totals: { count: 0, amountUgx: 0, firstEarnedAt: null, lastEarnedAt: null },
      groups: groupBy !== 'none' ? [] : undefined,
    });
  }

  const targetIds = routeId ? (ownedIds.includes(routeId) ? [routeId] : []) : ownedIds;
  if (targetIds.length === 0) {
    return NextResponse.json({
      items: [],
      totals: { count: 0, amountUgx: 0, firstEarnedAt: null, lastEarnedAt: null },
      groups: groupBy !== 'none' ? [] : undefined,
    });
  }

  let query = supabase
    .from('bookings')
    .select(SELECT)
    .eq('payment_status', 'completed')
    .in('route_id', targetIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('travel_date', from);
  if (to) query = query.lte('travel_date', to);
  if (q) {
    const pat = `%${q.replace(/%/g, '').slice(0, 64)}%`;
    query = query.or(
      `booking_code.ilike.${pat},payment_reference.ilike.${pat},seat_code.ilike.${pat}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('transporter earnings sources:', error);
    return NextResponse.json({ error: 'Failed to load earning sources' }, { status: 500 });
  }

  // Supabase type inference returns a "GenericStringError" when `SELECT` can't be validated
  // against generated types. Runtime data is still correct, so we defensively cast.
  const rows = ((data as unknown) as Record<string, unknown>[] | null) ?? [];

  const items: EarningSourceItem[] = rows
    .map((row) => {
      const tx = (row.platform_transaction ?? null) as Record<string, unknown> | null;
      const earnedAt =
        (tx?.completed_at as string | null | undefined) ??
        (tx?.created_at as string | null | undefined) ??
        (row.created_at as string | null | undefined) ??
        null;

      const passenger = (row.passenger ?? null) as
        | { id?: string; full_name?: string | null; email?: string | null }
        | null;

      const route = (row.route ?? null) as
        | { id: string; route_code: string; origin: string; destination: string }
        | null;

      const departure = (row.departure ?? null) as
        | {
            id: string;
            departure_time: string | null;
            vehicle: { id: string; registration: string } | null;
          }
        | null;

      return {
        bookingId: row.id as string,
        bookingCode: row.booking_code as string,
        travelDate: row.travel_date as string,
        seatCode: row.seat_code as string,
        bookingStatus: row.status as string,
        amountMinor: Number(row.amount_minor ?? 0),
        currency: (row.currency ?? 'UGX') as string,
        paymentReference: (row.payment_reference ?? null) as string | null,
        bookedAt: row.created_at as string,
        passenger: passenger
          ? {
              id: passenger.id ?? '',
              name: passenger.full_name ?? null,
              email: passenger.email ?? null,
            }
          : (row.guest_full_name as string | undefined) || (row.guest_email as string | undefined)
            ? {
                id: '',
                name: (row.guest_full_name as string | null | undefined) ?? null,
                email: (row.guest_email as string | null | undefined) ?? null,
              }
            : null,
        route: route
          ? {
              id: route.id,
              routeCode: route.route_code,
              origin: route.origin,
              destination: route.destination,
            }
          : null,
        departure: departure
          ? {
              id: departure.id,
              departureTime: departure.departure_time ?? null,
              vehicle: departure.vehicle
                ? { id: departure.vehicle.id, registration: departure.vehicle.registration }
                : null,
            }
          : null,
        transaction: tx
          ? {
              id: tx.id as string,
              kind: tx.kind as string,
              status: tx.status as string,
              amountUgx: Number(tx.amount_ugx ?? 0),
              currency: (tx.currency ?? 'UGX') as string,
              createdAt: tx.created_at as string,
              completedAt: (tx.completed_at ?? null) as string | null,
              reference: (tx.gateway_reference ?? tx.external_reference ?? null) as string | null,
            }
          : null,
        earnedAt,
      };
    })
    .filter((r) => !r.transaction || r.transaction.kind === 'passenger_payment'); // defensive: ensure passenger payments only

  const totals = items.reduce(
    (acc, it) => {
      const earnedAt = it.earnedAt ?? it.bookedAt;
      acc.count += 1;
      acc.amountUgx += it.amountMinor;
      if (earnedAt) {
        if (!acc.firstEarnedAt || earnedAt < acc.firstEarnedAt) acc.firstEarnedAt = earnedAt;
        if (!acc.lastEarnedAt || earnedAt > acc.lastEarnedAt) acc.lastEarnedAt = earnedAt;
      }
      return acc;
    },
    {
      count: 0,
      amountUgx: 0,
      firstEarnedAt: null as string | null,
      lastEarnedAt: null as string | null,
    },
  );

  const groups = groupBy !== 'none' ? buildGroups(items, groupBy) : undefined;

  return NextResponse.json({ items, totals, groups });
}
