'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import {
  BarChart3,
  BookOpen,
  Download,
  HelpCircle,
  Inbox,
  LineChart as LineChartIcon,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  REPORT_LOCALES,
  REPORT_TIMEZONES,
  fetchAdminReport,
  type AdminReportResponse,
} from '@/lib/admin/reports/client';
import { getAdminPlatformSettings } from '@/lib/platform-settings/admin-client';
import {
  formatReportCurrency,
  formatReportDay,
  formatReportInstant,
  formatReportInteger,
  formatReportPercent,
} from '@/lib/reports/format';
import { cn } from '@/lib/utils';

const MARKETING_STATUS_ORDER = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'withdrawn',
] as const;

function platformKindLabel(kind: string): string {
  switch (kind) {
    case 'passenger_payment':
      return 'Passenger payment';
    case 'transporter_payout':
      return 'Transporter payout';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    default:
      return kind.replace(/_/g, ' ');
  }
}

function applicationStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_review':
      return 'Pending review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return status.replace(/_/g, ' ');
  }
}

const FUNNEL_BAR_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(239 84% 58%)',
  'hsl(262 83% 52%)',
  'hsl(340 75% 52%)',
  'hsl(25 95% 48%)',
];

function downloadJson(data: AdminReportResponse) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `awetravel-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsvReport(data: AdminReportResponse) {
  const BOM = '\ufeff';
  const lines: string[] = [];
  lines.push('section,key,value');
  lines.push(`meta,generatedAt,${data.generatedAt}`);
  lines.push(`meta,periodFrom,${data.period.fromDate}`);
  lines.push(`meta,periodTo,${data.period.toDate}`);
  lines.push(`meta,timezone,${data.period.timezone}`);
  lines.push(`finance,incomingCompletedUgx,${data.finance.totals.incomingCompletedUgx}`);
  lines.push(`finance,outgoingCompletedUgx,${data.finance.totals.outgoingCompletedUgx}`);
  lines.push(`finance,netUgx,${data.finance.totals.netUgx}`);
  lines.push(`finance,pendingOutgoingCount,${data.finance.totals.pendingOutgoingCount}`);
  lines.push(`finance,pendingOutgoingUgx,${data.finance.totals.pendingOutgoingUgx}`);
  lines.push(`users,totalPassengers,${data.users.totalPassengers}`);
  lines.push(`users,totalTransporters,${data.users.totalTransporters}`);
  lines.push(`users,newPassengersInPeriod,${data.users.newPassengersInPeriod}`);
  lines.push(`transporters,pendingApproval,${data.transporters.pendingApproval}`);
  lines.push(`operations,routesTotal,${data.operations.routesTotal}`);
  lines.push(`operations,vehiclesTotal,${data.operations.vehiclesTotal}`);
  lines.push(`marketing,bannersTotal,${data.marketing.bannersTotal}`);
  for (const row of data.finance.daily) {
    lines.push(
      `financeDaily,${row.day},in:${row.incomingCompletedUgx};out:${row.outgoingCompletedUgx};inCount:${row.incomingCompletedCount};outCount:${row.outgoingCompletedCount}`,
    );
  }
  const kindEntries = Object.entries(data.finance.totals.byKindCompleted).sort((a, b) => b[1] - a[1]);
  for (const [kind, ugx] of kindEntries) {
    lines.push(`financeByKindCompleted,${kind},${ugx}`);
  }
  for (const row of data.signupsDaily) {
    lines.push(
      `signupsDaily,${row.day},passengers:${row.newPassengers};transporters:${row.newTransporters};admins:${row.newAdmins}`,
    );
  }
  for (const status of MARKETING_STATUS_ORDER) {
    const count = data.marketing.applicationsByStatus[status] ?? 0;
    lines.push(`marketingApplicationStatus,${status},${count}`);
  }
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `awetravel-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const defaultTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const defaultFrom = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [timezone, setTimezone] = useState<string>('Africa/Kampala');
  const [locale, setLocale] = useState<string>('en-UG');
  const [compare, setCompare] = useState(false);

  const [data, setData] = useState<AdminReportResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getAdminPlatformSettings();
        if (cancelled) return;
        if ((REPORT_TIMEZONES as readonly string[]).includes(s.defaultReportTimezone)) {
          setTimezone(s.defaultReportTimezone);
        }
      } catch {
        /* keep Africa/Kampala default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchAdminReport({
        from: fromDate,
        to: toDate,
        timezone,
        locale,
        compare,
      });
      setData(res);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load report');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, timezone, locale, compare]);

  useEffect(() => {
    void load();
  }, [load]);

  const financeChartData = useMemo(() => {
    if (!data) return [];
    return data.finance.daily.map((r) => ({
      ...r,
      label: formatReportDay(r.day, timezone, locale),
    }));
  }, [data, timezone, locale]);

  const signupsChartData = useMemo(() => {
    if (!data) return [];
    return data.signupsDaily.map((r) => ({
      ...r,
      label: formatReportDay(r.day, timezone, locale),
      newTotal: r.newPassengers + r.newTransporters + r.newAdmins,
    }));
  }, [data, timezone, locale]);

  const marketingBarData = useMemo(() => {
    if (!data) return [];
    return MARKETING_STATUS_ORDER.map((status) => ({
      statusKey: status,
      status: applicationStatusLabel(status),
      count: data.marketing.applicationsByStatus[status] ?? 0,
    }));
  }, [data]);

  const financeByKindData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.finance.totals.byKindCompleted)
      .map(([kind, ugx]) => ({
        kind,
        label: platformKindLabel(kind),
        ugx,
      }))
      .sort((a, b) => b.ugx - a.ugx);
  }, [data]);

  const kpiStrip = data
    ? [
        {
          key: 'net',
          label: 'Net (period)',
          value: formatReportCurrency(data.finance.totals.netUgx, locale),
        },
        {
          key: 'in',
          label: 'Incoming completed',
          value: formatReportCurrency(data.finance.totals.incomingCompletedUgx, locale),
        },
        {
          key: 'out',
          label: 'Outgoing completed',
          value: formatReportCurrency(data.finance.totals.outgoingCompletedUgx, locale),
        },
        {
          key: 'pending',
          label: 'Pending disbursements',
          value: `${data.finance.totals.pendingOutgoingCount} · ${formatReportCurrency(data.finance.totals.pendingOutgoingUgx, locale)}`,
        },
        {
          key: 'signups',
          label: 'New accounts',
          value: formatReportInteger(
            data.users.newPassengersInPeriod + data.users.newTransportersInPeriod + data.users.newAdminsInPeriod,
            locale,
          ),
        },
        {
          key: 'tpend',
          label: 'Transporters pending',
          value: formatReportInteger(data.transporters.pendingApproval, locale),
        },
      ]
    : [];

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Reports
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                Platform reports
              </h1>
              <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
                Timezone-aware periods, locale-aware UGX formatting, and exports suitable for finance review.{' '}
                <Link href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
                  Admin home
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                    <HelpCircle className="size-3.5" aria-hidden />
                    Metric definitions
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-border">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">How we count</DialogTitle>
                    <DialogDescription className="text-xs">
                      Generated {data ? formatReportInstant(data.generatedAt, timezone, locale) : '—'}
                    </DialogDescription>
                  </DialogHeader>
                  <ul className="max-h-[60vh] space-y-3 overflow-y-auto text-sm text-muted-foreground">
                    {data
                      ? Object.entries(data.definitions).map(([k, text]) => (
                          <li key={k}>
                            <span className="font-medium text-foreground">{k}</span>
                            <p className="mt-0.5 leading-relaxed">{text}</p>
                          </li>
                        ))
                      : null}
                  </ul>
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                disabled={isLoading || !data}
                onClick={() => data && downloadCsvReport(data)}
              >
                <Download className="size-3.5" aria-hidden />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                disabled={isLoading || !data}
                onClick={() => data && downloadJson(data)}
              >
                <Download className="size-3.5" aria-hidden />
                JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                disabled={isLoading}
                onClick={() => void load()}
              >
                <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} aria-hidden />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border bg-background px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold">Report parameters</CardTitle>
            <CardDescription className="text-xs">
              Dates are interpreted as start/end of day in the selected timezone. Maximum range 395 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="rep-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="rep-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-full md:w-44"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rep-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="rep-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-full md:w-44"
                />
              </div>
              <div className="space-y-1.5 min-w-48">
                <Label className="text-xs">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {REPORT_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-40">
                <Label className="text-xs">Display locale</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_LOCALES.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Switch id="rep-compare" checked={compare} onCheckedChange={setCompare} />
                <Label htmlFor="rep-compare" className="cursor-pointer text-xs font-medium leading-snug">
                  Compare prior period
                  <span className="mt-0.5 block font-normal text-muted-foreground">
                    Same length immediately before this range
                  </span>
                </Label>
              </div>
            </div>
            {data ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">UTC bounds (exclusive end):</span>{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{data.period.startUtc}</code>
                {' → '}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{data.period.endUtcExclusive}</code>
              </p>
            ) : null}
          </CardContent>
        </Card>

        {loadError ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Could not load report</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void load()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-3 lg:grid-cols-6">
            {isLoading && !data
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-3 py-2 sm:px-4 sm:py-2.5">
                    <Skeleton className="mb-1 h-3 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))
              : kpiStrip.map((item) => (
                  <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground sm:text-base">
                      {item.value}
                    </p>
                  </div>
                ))}
          </div>
        </div>

        {data?.comparison ? (
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Period comparison</CardTitle>
              <CardDescription className="text-xs">Change vs immediately preceding window of equal length</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Incoming (UGX)', data.comparison.incomingCompletedUgx, 'currency'],
                  ['Outgoing (UGX)', data.comparison.outgoingCompletedUgx, 'currency'],
                  ['Net (UGX)', data.comparison.netUgx, 'currency'],
                  ['New accounts', data.comparison.newUsersTotal, 'integer'],
                ] as const
              ).map(([label, m, fmt]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatReportPercent(m.deltaPct, locale)}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {fmt === 'currency'
                      ? `${formatReportCurrency(m.current, locale)} vs ${formatReportCurrency(m.previous, locale)}`
                      : `${formatReportInteger(m.current, locale)} vs ${formatReportInteger(m.previous, locale)}`}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <LineChartIcon className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base font-semibold">Finance (daily)</CardTitle>
              </div>
              <CardDescription className="text-xs">Completed incoming vs outgoing by day in report timezone</CardDescription>
            </CardHeader>
            <CardContent className="h-72 w-full">
              {!data || financeChartData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Inbox className="mb-2 size-8 opacity-50" aria-hidden />
                  <p className="text-sm">No finance activity in this range</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="repIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="repOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(32 95% 44%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(32 95% 44%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatReportInteger(Number(v), locale)} />
                    <Tooltip
                      formatter={(value: number | string) => [
                        formatReportCurrency(Number(value ?? 0), locale),
                        '',
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="incomingCompletedUgx"
                      name="Incoming"
                      stroke="hsl(142 76% 36%)"
                      fill="url(#repIn)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="outgoingCompletedUgx"
                      name="Outgoing"
                      stroke="hsl(32 95% 44%)"
                      fill="url(#repOut)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <LineChartIcon className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base font-semibold">Growth (signups)</CardTitle>
              </div>
              <CardDescription className="text-xs">New profiles per day by type</CardDescription>
            </CardHeader>
            <CardContent className="h-72 w-full">
              {!data || signupsChartData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Inbox className="mb-2 size-8 opacity-50" aria-hidden />
                  <p className="text-sm">No signups in this range</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number | string, name: string) => [
                        formatReportInteger(Number(value ?? 0), locale),
                        name,
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="newPassengers"
                      name="Passengers"
                      stackId="s"
                      stroke="hsl(221 83% 53%)"
                      fill="hsl(221 83% 53% / 0.55)"
                    />
                    <Area
                      type="monotone"
                      dataKey="newTransporters"
                      name="Transporters"
                      stackId="s"
                      stroke="hsl(262 83% 58%)"
                      fill="hsl(262 83% 58% / 0.55)"
                    />
                    <Area
                      type="monotone"
                      dataKey="newAdmins"
                      name="Admins"
                      stackId="s"
                      stroke="hsl(340 82% 52%)"
                      fill="hsl(340 82% 52% / 0.55)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border shadow-sm lg:col-span-2">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base font-semibold">Completed volume by transaction kind</CardTitle>
              </div>
              <CardDescription className="text-xs">
                UGX from completed ledger rows in this period, grouped by kind
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="h-56 w-full min-h-56">
                {!data || financeByKindData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No completed transactions by kind in this range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={financeByKindData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatReportInteger(Number(v), locale)}
                      />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number | string) => [
                          formatReportCurrency(Number(value ?? 0), locale),
                          'Completed',
                        ]}
                      />
                      <Bar dataKey="ugx" name="UGX" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Kind</th>
                      <th className="px-3 py-2 text-right">UGX (completed)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeByKindData.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                          No rows
                        </td>
                      </tr>
                    ) : (
                      financeByKindData.map((row) => (
                        <tr key={row.kind} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatReportCurrency(row.ugx, locale)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base font-semibold">Marketing funnel</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Route home ad applications by status (funnel order)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 w-full">
              {!data || data.marketing.applicationsTotal === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No applications yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketingBarData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" width={112} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number | string) => [formatReportInteger(Number(value ?? 0), locale), 'Count']}
                    />
                    <Bar dataKey="count" name="Applications" radius={[0, 4, 4, 0]}>
                      {marketingBarData.map((entry, index) => (
                        <Cell key={entry.statusKey} fill={FUNNEL_BAR_COLORS[index % FUNNEL_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Operations snapshot</CardTitle>
              <CardDescription className="text-xs">Fleet totals (all time, not filtered by report dates)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data ? (
                <>
                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-muted-foreground">Active routes</span>
                    <span className="font-semibold tabular-nums">{formatReportInteger(data.operations.routesActive, locale)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-muted-foreground">Total routes</span>
                    <span className="font-semibold tabular-nums">{formatReportInteger(data.operations.routesTotal, locale)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-muted-foreground">Vehicles</span>
                    <span className="font-semibold tabular-nums">{formatReportInteger(data.operations.vehiclesTotal, locale)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Departures</span>
                    <span className="font-semibold tabular-nums">
                      {formatReportInteger(data.operations.departuresTotal, locale)}
                    </span>
                  </div>
                </>
              ) : (
                <Skeleton className="h-24 w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed border-border bg-muted/10 shadow-sm">
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base font-semibold">Booking intelligence</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              Trip-level bookings are not yet stored in the database. When the bookings schema is live, this section will
              include conversion, load factors, and route-level revenue. Until then, use the Transactions report for
              ledger-backed cash movement.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/admin/transactions">Open transactions</Link>
            </Button>
          </CardContent>
        </Card>

        {data ? (
          <>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Users</p>
                <p className="mt-1 tabular-nums">
                  Passengers {formatReportInteger(data.users.totalPassengers, locale)} · Transporters{' '}
                  {formatReportInteger(data.users.totalTransporters, locale)} · Suspended passengers{' '}
                  {formatReportInteger(data.users.suspendedPassengers, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transporter approvals</p>
                <p className="mt-1 tabular-nums">
                  Pending {formatReportInteger(data.transporters.pendingApproval, locale)} · Approved{' '}
                  {formatReportInteger(data.transporters.approved, locale)} · Rejected{' '}
                  {formatReportInteger(data.transporters.rejected, locale)} · New approvals in period{' '}
                  {formatReportInteger(data.transporters.newApprovedInPeriod, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Banners</p>
                <p className="mt-1 tabular-nums">
                  Total {formatReportInteger(data.marketing.bannersTotal, locale)} · Active flag{' '}
                  {formatReportInteger(data.marketing.bannersActive, locale)}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
