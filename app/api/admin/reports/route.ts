import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import type {
  AdminReportComparison,
  AdminReportFinanceDailyRow,
  AdminReportMarketing,
  AdminReportOperations,
  AdminReportResponse,
  AdminReportSignupsDailyRow,
  AdminReportTransporters,
  AdminReportUsers,
} from '@/lib/admin/reports/types';
import { assertPeriodMaxDays, deltaPct, isValidYmd, previousPeriodInclusive } from '@/lib/reports/period';

const TIMEZONES = z.enum([
  'UTC',
  'Africa/Kampala',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
]);

const querySchema = z.object({
  from: z.string().length(10),
  to: z.string().length(10),
  timezone: TIMEZONES.default('Africa/Kampala'),
  locale: z.string().min(2).max(24).default('en-UG'),
  compare: z.preprocess(
    (val) => val === true || val === 'true' || val === '1',
    z.boolean().default(false),
  ),
});

const MAX_RANGE_DAYS = 395;

const DEFINITIONS: Record<string, string> = {
  incomingCompletedUgx:
    'Sum of completed incoming ledger rows (e.g. passenger payments) in the period, in UGX.',
  outgoingCompletedUgx:
    'Sum of completed outgoing ledger rows (e.g. disbursements) in the period, in UGX.',
  netUgx: 'Incoming completed minus outgoing completed for the period.',
  pendingOutgoing: 'Count and amount of outgoing rows still pending or processing at any time in the period window.',
  newUsers: 'Profiles with created_at falling in the period (UTC bounds from your timezone selection).',
  operations: 'Total routes, vehicles, and departures in the system (not limited to the date range).',
  marketing: 'Home route ad applications by status; banners inventory is current totals.',
  byKindCompleted:
    'Completed platform transaction amounts in the period, grouped by kind (e.g. passenger payments vs payouts).',
};

type FinanceTotalsRpc = {
  incoming_completed_ugx: number;
  outgoing_completed_ugx: number;
  net_ugx: number;
  pending_outgoing_count: number;
  pending_outgoing_ugx: number;
  by_kind_completed: Record<string, number> | null;
};

type FinanceDailyRpc = {
  day: string;
  incoming_completed_ugx: number;
  outgoing_completed_ugx: number;
  incoming_completed_count: number;
  outgoing_completed_count: number;
};

type SignupsDailyRpc = {
  day: string;
  new_passengers: number;
  new_transporters: number;
  new_admins: number;
};

type OpsRpc = {
  routes_total: number;
  vehicles_total: number;
  departures_total: number;
  routes_active: number;
};

type BoundsRpc = {
  start_utc: string;
  end_utc_exclusive: string;
};

async function buildReportSlice(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseRouteClient>>>,
  fromDate: string,
  toDate: string,
  timezone: string,
): Promise<{
  period: AdminReportResponse['period'];
  finance: AdminReportResponse['finance'];
  signupsDaily: AdminReportSignupsDailyRow[];
  users: AdminReportUsers;
  transporters: AdminReportTransporters;
  operations: AdminReportOperations;
  marketing: AdminReportMarketing;
}> {
  const { data: boundsRow, error: boundsErr } = await supabase
    .rpc('admin_report_period_bounds', {
      p_from: fromDate,
      p_to: toDate,
      p_tz: timezone,
    })
    .maybeSingle();

  if (boundsErr || !boundsRow) {
    console.error('admin_report_period_bounds:', boundsErr);
    throw new Error(boundsErr?.message ?? 'Failed to resolve report period');
  }

  const bounds = boundsRow as BoundsRpc;
  const startUtc = bounds.start_utc;
  const endUtc = bounds.end_utc_exclusive;

  const [
    totalsRes,
    dailyRes,
    signupsRes,
    opsRes,
    pc,
    tc,
    ac,
    npc,
    ntc,
    nac,
    susp,
    tpend,
    tappr,
    trej,
    nappr,
    btot,
    bact,
  ] = await Promise.all([
    supabase
      .rpc('admin_report_finance_totals', {
        p_from: fromDate,
        p_to: toDate,
        p_tz: timezone,
      })
      .maybeSingle(),
    supabase.rpc('admin_report_finance_daily', {
      p_from: fromDate,
      p_to: toDate,
      p_tz: timezone,
    }),
    supabase.rpc('admin_report_signups_daily', {
      p_from: fromDate,
      p_to: toDate,
      p_tz: timezone,
    }),
    supabase.rpc('admin_report_operations_counts').maybeSingle(),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'passenger'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'transporter'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'admin'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'passenger')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'transporter')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'admin')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'passenger')
      .eq('account_suspended', true),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'transporter')
      .eq('transporter_approval_status', 'pending'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'transporter')
      .eq('transporter_approval_status', 'approved'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'transporter')
      .eq('transporter_approval_status', 'rejected'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'transporter')
      .eq('transporter_approval_status', 'approved')
      .gte('transporter_approved_at', startUtc)
      .lt('transporter_approved_at', endUtc),
    supabase.from('home_banners').select('*', { count: 'exact', head: true }),
    supabase.from('home_banners').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  if (totalsRes.error) {
    console.error('admin_report_finance_totals:', totalsRes.error);
    throw new Error(totalsRes.error.message);
  }
  if (dailyRes.error) {
    console.error('admin_report_finance_daily:', dailyRes.error);
    throw new Error(dailyRes.error.message);
  }
  if (signupsRes.error) {
    console.error('admin_report_signups_daily:', signupsRes.error);
    throw new Error(signupsRes.error.message);
  }
  if (opsRes.error) {
    console.error('admin_report_operations_counts:', opsRes.error);
    throw new Error(opsRes.error.message);
  }

  const totals = totalsRes.data as FinanceTotalsRpc | null;
  if (!totals) {
    throw new Error('Finance totals unavailable');
  }

  const ops = opsRes.data as OpsRpc | null;
  if (!ops) {
    throw new Error('Operations counts unavailable');
  }

  const appStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'withdrawn'] as const;
  const appCountResults = await Promise.all(
    appStatuses.map((s) =>
      supabase.from('route_home_ad_applications').select('*', { count: 'exact', head: true }).eq('status', s),
    ),
  );

  const applicationsByStatus: Record<string, number> = {};
  let applicationsTotal = 0;
  appStatuses.forEach((s, i) => {
    const c = appCountResults[i].count ?? 0;
    applicationsByStatus[s] = c;
    applicationsTotal += c;
  });

  const daily: AdminReportFinanceDailyRow[] = ((dailyRes.data ?? []) as FinanceDailyRpc[]).map((r) => ({
    day: typeof r.day === 'string' ? r.day.slice(0, 10) : String(r.day),
    incomingCompletedUgx: Number(r.incoming_completed_ugx),
    outgoingCompletedUgx: Number(r.outgoing_completed_ugx),
    incomingCompletedCount: Number(r.incoming_completed_count),
    outgoingCompletedCount: Number(r.outgoing_completed_count),
  }));

  const signupsDaily: AdminReportSignupsDailyRow[] = ((signupsRes.data ?? []) as SignupsDailyRpc[]).map((r) => ({
    day: typeof r.day === 'string' ? r.day.slice(0, 10) : String(r.day),
    newPassengers: Number(r.new_passengers),
    newTransporters: Number(r.new_transporters),
    newAdmins: Number(r.new_admins),
  }));

  const byKind = totals.by_kind_completed;
  const byKindCompleted =
    byKind && typeof byKind === 'object' && !Array.isArray(byKind)
      ? Object.fromEntries(
          Object.entries(byKind as Record<string, unknown>).map(([k, v]) => [k, Number(v)]),
        )
      : {};

  const users: AdminReportUsers = {
    totalPassengers: pc.count ?? 0,
    totalTransporters: tc.count ?? 0,
    totalAdmins: ac.count ?? 0,
    newPassengersInPeriod: npc.count ?? 0,
    newTransportersInPeriod: ntc.count ?? 0,
    newAdminsInPeriod: nac.count ?? 0,
    suspendedPassengers: susp.count ?? 0,
  };

  const transporters: AdminReportTransporters = {
    pendingApproval: tpend.count ?? 0,
    approved: tappr.count ?? 0,
    rejected: trej.count ?? 0,
    newApprovedInPeriod: nappr.count ?? 0,
  };

  const operations: AdminReportOperations = {
    routesTotal: Number(ops.routes_total),
    routesActive: Number(ops.routes_active),
    vehiclesTotal: Number(ops.vehicles_total),
    departuresTotal: Number(ops.departures_total),
  };

  const marketing: AdminReportMarketing = {
    applicationsByStatus,
    applicationsTotal,
    bannersTotal: btot.count ?? 0,
    bannersActive: bact.count ?? 0,
  };

  return {
    period: {
      fromDate,
      toDate,
      timezone,
      startUtc,
      endUtcExclusive: endUtc,
    },
    finance: {
      totals: {
        incomingCompletedUgx: Number(totals.incoming_completed_ugx),
        outgoingCompletedUgx: Number(totals.outgoing_completed_ugx),
        netUgx: Number(totals.net_ugx),
        pendingOutgoingCount: Number(totals.pending_outgoing_count),
        pendingOutgoingUgx: Number(totals.pending_outgoing_ugx),
        byKindCompleted,
      },
      daily,
    },
    signupsDaily,
    users,
    transporters,
    operations,
    marketing,
  };
}

/**
 * GET /api/admin/reports — aggregated admin snapshot (timezone-aware period).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid query' }, { status: 400 });
  }

  const { from: fromDate, to: toDate, timezone, locale, compare } = parsed.data;

  if (!isValidYmd(fromDate) || !isValidYmd(toDate)) {
    return NextResponse.json({ error: 'Invalid date (use YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    assertPeriodMaxDays(fromDate, toDate, MAX_RANGE_DAYS);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid range' },
      { status: 400 },
    );
  }

  try {
    const current = await buildReportSlice(supabase, fromDate, toDate, timezone);

    let comparison: AdminReportComparison | null = null;
    if (compare) {
      const { prevFrom, prevTo } = previousPeriodInclusive(fromDate, toDate);
      const prev = await buildReportSlice(supabase, prevFrom, prevTo, timezone);
      const newUsersCur = current.users.newPassengersInPeriod + current.users.newTransportersInPeriod + current.users.newAdminsInPeriod;
      const newUsersPrev = prev.users.newPassengersInPeriod + prev.users.newTransportersInPeriod + prev.users.newAdminsInPeriod;

      comparison = {
        incomingCompletedUgx: {
          current: current.finance.totals.incomingCompletedUgx,
          previous: prev.finance.totals.incomingCompletedUgx,
          deltaPct: deltaPct(current.finance.totals.incomingCompletedUgx, prev.finance.totals.incomingCompletedUgx),
        },
        outgoingCompletedUgx: {
          current: current.finance.totals.outgoingCompletedUgx,
          previous: prev.finance.totals.outgoingCompletedUgx,
          deltaPct: deltaPct(current.finance.totals.outgoingCompletedUgx, prev.finance.totals.outgoingCompletedUgx),
        },
        netUgx: {
          current: current.finance.totals.netUgx,
          previous: prev.finance.totals.netUgx,
          deltaPct: deltaPct(current.finance.totals.netUgx, prev.finance.totals.netUgx),
        },
        newUsersTotal: {
          current: newUsersCur,
          previous: newUsersPrev,
          deltaPct: deltaPct(newUsersCur, newUsersPrev),
        },
      };
    }

    const body: AdminReportResponse = {
      generatedAt: new Date().toISOString(),
      locale,
      currencyCode: 'UGX',
      period: current.period,
      definitions: DEFINITIONS,
      finance: current.finance,
      signupsDaily: current.signupsDaily,
      users: current.users,
      transporters: current.transporters,
      operations: current.operations,
      marketing: current.marketing,
      comparison,
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error('admin reports:', e);
    const msg = e instanceof Error ? e.message : 'Failed to build report';
    if (msg.includes('forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
