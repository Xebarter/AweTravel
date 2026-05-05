import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { queryTripSearchResults } from '@/lib/passenger-trip-search-server';

const querySchema = z.object({
  from: z.string().min(1).max(80),
  to: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * GET /api/passenger/search?from=...&to=...&date=...&limit=...
 * Authenticated passenger search backed by Supabase (same data as public /api/home/discover).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get('from') ?? '',
    to: url.searchParams.get('to') ?? '',
    date: url.searchParams.get('date') ?? '',
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });

  const { from, to, date, limit } = parsed.data;

  const result = await queryTripSearchResults({
    admin,
    applyCorridorFilter: true,
    corridorFrom: from,
    corridorTo: to,
    ownerUserId: null,
    date,
    routeLimit: limit,
    tripLimit: 500,
    maxDeparturesPerRoute: 50,
    offset: 0,
    sort: 'departure',
  });

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data, total: result.total });
}
