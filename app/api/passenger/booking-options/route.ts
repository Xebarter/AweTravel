import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

type BookingOption = {
  routeId: string;
  departureId: string | null;
  route: string;
  company?: string;
  departureTime: string;
  price: number;
};

function safeTimeHHMM(t: string | null | undefined) {
  if (!t) return '00:00';
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '00:00';
}

/**
 * GET /api/passenger/booking-options
 * Returns selectable route/departure options for passengers.
 *
 * Note: This uses the service-role key to read transporter-owned tables (bypassing RLS),
 * but still requires an authenticated passenger session.
 */
export async function GET() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { data: routes, error: routeErr } = await admin
    .from('transporter_routes')
    .select('id,owner_user_id,origin,destination,base_price_minor,currency,status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (routeErr) {
    console.error('booking-options routes:', routeErr);
    return NextResponse.json({ error: 'Failed to load routes' }, { status: 500 });
  }

  const routeRows =
    (routes as
      | {
          id: string;
          owner_user_id: string;
          origin: string;
          destination: string;
          base_price_minor: number;
          currency: string;
          status: string;
        }[]
      | null) ?? [];

  const routeIds = routeRows.map((r) => r.id);
  const owners = Array.from(new Set(routeRows.map((r) => r.owner_user_id)));

  const [{ data: departures }, { data: companies }] = await Promise.all([
    routeIds.length
      ? admin
          .from('transporter_route_departures')
          .select('id,route_id,departure_time,status,price_override_minor')
          .in('route_id', routeIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] as any[] }),
    owners.length
      ? admin
          .from('transporter_company_profiles')
          .select('owner_user_id,company_name,trading_name')
          .in('owner_user_id', owners)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const departuresRows =
    (departures as
      | {
          id: string;
          route_id: string;
          departure_time: string;
          status: string;
          price_override_minor: number | null;
        }[]
      | null) ?? [];

  const companyByOwner = new Map<
    string,
    { owner_user_id: string; company_name: string; trading_name: string | null }
  >((((companies as any[]) ?? []) as any[]).map((c) => [c.owner_user_id, c]));

  const departuresByRoute = new Map<string, typeof departuresRows>();
  for (const d of departuresRows) {
    const existing = departuresByRoute.get(d.route_id) ?? [];
    existing.push(d);
    departuresByRoute.set(d.route_id, existing);
  }

  const options: BookingOption[] = [];
  for (const r of routeRows) {
    const routeLabel = `${r.origin} — ${r.destination}`;
    const company = companyByOwner.get(r.owner_user_id);
    const companyName = company?.trading_name?.trim() || company?.company_name?.trim() || undefined;

    const deps = departuresByRoute.get(r.id) ?? [];
    if (deps.length === 0) {
      options.push({
        routeId: r.id,
        departureId: null,
        route: routeLabel,
        company: companyName,
        departureTime: '00:00',
        price: r.base_price_minor,
      });
      continue;
    }

    for (const d of deps) {
      options.push({
        routeId: r.id,
        departureId: d.id,
        route: routeLabel,
        company: companyName,
        departureTime: safeTimeHHMM(d.departure_time),
        price: typeof d.price_override_minor === 'number' ? d.price_override_minor : r.base_price_minor,
      });
    }
  }

  // Deterministic ordering for UI.
  options.sort((a, b) => {
    const ra = `${a.route} ${a.departureTime}`.toLowerCase();
    const rb = `${b.route} ${b.departureTime}`.toLowerCase();
    return ra.localeCompare(rb);
  });

  return NextResponse.json({ options });
}

