import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { queryTripSearchResults } from '@/lib/passenger-trip-search-server';

export const dynamic = 'force-dynamic';

const sortSchema = z.enum(['price', 'duration', 'departure']);

const querySchema = z.object({
  from: z.string().max(80).optional().default(''),
  to: z.string().max(80).optional().default(''),
  /** Transporter account id — when set, lists only that operator's active routes. */
  owner: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  routeLimit: z.coerce.number().int().min(1).max(50).optional().default(24),
  tripLimit: z.coerce.number().int().min(1).max(500).optional().default(36),
  maxDeparturesPerRoute: z.coerce.number().int().min(0).max(50).optional().default(4),
  offset: z.coerce.number().int().min(0).max(50_000).optional().default(0),
  sort: sortSchema.optional().default('departure'),
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/home/discover
 * Public, read-only listing of active transporter routes (no auth).
 * When both `from` and `to` are non-empty, results are corridor-filtered like passenger search.
 */
export async function GET(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });

  const url = new URL(request.url);
  const raw = {
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    owner: url.searchParams.get('owner') ?? undefined,
    date: url.searchParams.get('date') ?? undefined,
    routeLimit: url.searchParams.get('routeLimit') ?? undefined,
    tripLimit: url.searchParams.get('tripLimit') ?? undefined,
    maxDeparturesPerRoute: url.searchParams.get('maxDeparturesPerRoute') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
  };

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid query' },
      { status: 400 },
    );
  }

  const { from, to, owner, tripLimit, maxDeparturesPerRoute, offset, sort, routeLimit } = parsed.data;
  const date = parsed.data.date ?? todayISO();
  const fromT = from.trim();
  const toT = to.trim();
  const applyCorridorFilter = Boolean(fromT && toT);

  const result = await queryTripSearchResults({
    admin,
    applyCorridorFilter,
    corridorFrom: fromT,
    corridorTo: toT,
    ownerUserId: owner ?? null,
    date,
    routeLimit,
    tripLimit,
    maxDeparturesPerRoute,
    offset,
    sort,
  });

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    total: result.total,
    offset: result.offset,
    limit: result.limit,
    hasMore: result.hasMore,
    sort: result.sort,
    corridor: applyCorridorFilter,
    owner: owner ?? null,
  });
}
