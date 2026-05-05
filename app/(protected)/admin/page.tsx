'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  AlertCircle,
  BarChart3,
  Building2,
  Bus,
  ChevronRight,
  CreditCard,
  LineChart as LineChartIcon,
  MapPin,
  Minus,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminDashboardReport } from '@/hooks/use-admin-dashboard-report';
import type { AdminReportResponse } from '@/lib/admin/reports/client';
import { formatCurrency } from '@/lib/currency';

function platformKindLabel(kind: string): string {
  switch (kind) {
    case 'passenger_payment':
      return 'Passenger payments';
    case 'transporter_payout':
      return 'Transporter payouts';
    case 'refund':
      return 'Refunds';
    case 'adjustment':
      return 'Adjustments';
    default:
      return kind.replace(/_/g, ' ');
  }
}

function DeltaPill({ metric }: { metric: { deltaPct: number | null } }) {
  const delta = typeof metric?.deltaPct === 'number' ? metric.deltaPct : null;
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        No prior
      </span>
    );
  }
  const positive = delta >= 0;
  const abs = Math.abs(delta);
  return (
    <span
      className={
        positive
          ? 'inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'
          : 'inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300'
      }
    >
      {positive ? '+' : '-'}
      {abs.toFixed(0)}%
    </span>
  );
}

export default function AdminDashboard() {
  const { report, isLoading, error, refetch, fromDate, toDate } = useAdminDashboardReport();

  const financeChartData = useMemo(() => {
    if (!report) return [];
    return report.finance.daily.map((r) => ({
      day: r.day,
      incoming: r.incomingCompletedUgx,
      outgoing: r.outgoingCompletedUgx,
    }));
  }, [report]);

  const signupsChartData = useMemo(() => {
    if (!report) return [];
    return report.signupsDaily.map((r) => ({
      day: r.day,
      passengers: r.newPassengers,
      transporters: r.newTransporters,
    }));
  }, [report]);

  const financeByKind = useMemo(() => {
    const obj = report?.finance.totals.byKindCompleted ?? {};
    return Object.entries(obj)
      .map(([kind, ugx]) => ({ kind, ugx: Number(ugx) }))
      .sort((a, b) => b.ugx - a.ugx);
  }, [report]);

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Dashboard</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Platform
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Admin dashboard
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Executive overview of operations, growth, and revenue. Use the quick actions below to manage
                passengers, transporters, companies, and financial flows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-sm">
                <Link href="/admin/settings">
                  <Settings className="size-4" aria-hidden />
                  Settings
                </Link>
              </Button>
              <Button type="button" size="sm" className="h-8 font-medium shadow-sm" disabled={isLoading} onClick={() => void refetch()}>
                <TrendingUp className="size-4" aria-hidden />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Could not load dashboard</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Passengers
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-20" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report?.users.totalPassengers.toLocaleString() ?? '—'}
                    </p>
                  )}
                  <div className="mt-1">
                    {isLoading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : report?.comparison ? (
                      <DeltaPill metric={report.comparison.newUsersTotal} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {fromDate} → {toDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Bus className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Transporters pending
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report?.transporters.pendingApproval.toLocaleString() ?? '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">Awaiting approval</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <MapPin className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Routes active
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report?.operations.routesActive.toLocaleString() ?? '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    Total {report?.operations.routesTotal.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <Truck className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Vehicles total
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report?.operations.vehiclesTotal.toLocaleString() ?? '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    Departures {report?.operations.departuresTotal.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <TrendingUp className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Net (UGX)
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report ? formatCurrency(report.finance.totals.netUgx) : '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">Completed in period</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    <CreditCard className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Pending payouts
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-7 w-24" />
                  ) : (
                    <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                      {report ? formatCurrency(report.finance.totals.pendingOutgoingUgx) : '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {report ? `${report.finance.totals.pendingOutgoingCount} awaiting completion` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management + Alerts */}
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/80 shadow-sm lg:col-span-7">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
              <CardDescription className="text-xs">Jump into high-velocity admin surfaces</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/users" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Users className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Passengers</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Profiles, access, and suspensions
                    </p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/transporters" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Bus className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Transporters</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Approvals, provisioning, lifecycle
                    </p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/companies" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Building2 className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Companies</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Operators, branding, compliance
                    </p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/home-ads" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <ShieldCheck className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">
                      Homepage promotions
                    </p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Applications and banner inventory
                    </p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/transactions" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <CreditCard className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Transactions</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Payments, payouts, and auditability
                    </p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/admin/reports" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <BarChart3 className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Reports</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Exports, summaries, and trends
                    </p>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-semibold">System status</CardTitle>
              <CardDescription className="text-xs">Signals that require attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 p-5">
              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Pending company verification</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      3 companies awaiting approval. Review their documents and compliance signals.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Suspicious activity</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      1 account flagged for review. Validate unusual booking behavior and payment patterns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">All systems operational</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      No active incidents. Background jobs are within expected latency.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics */}
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/80 shadow-sm lg:col-span-7">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Daily platform metrics</CardTitle>
                  <CardDescription className="text-xs">Completed incoming vs outgoing (UGX)</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <BarChart3 className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-[290px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={financeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      if (Number.isFinite(n)) return formatCurrency(n);
                      return String(value);
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="incoming"
                    fill="hsl(var(--primary))"
                    name="Incoming (completed)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="outgoing"
                    fill="hsl(var(--accent))"
                    name="Outgoing (completed)"
                    radius={[6, 6, 0, 0]}
                  />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">User growth</CardTitle>
                  <CardDescription className="text-xs">New passengers vs transporters</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <LineChartIcon className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-[290px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <LineChart data={signupsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="passengers"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="transporters"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2.25}
                    dot={{ fill: 'hsl(var(--accent))', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/80 shadow-sm lg:col-span-7">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Finance by kind (completed)</CardTitle>
                  <CardDescription className="text-xs">Breakdown of completed ledger amounts in the selected period</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <CreditCard className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : financeByKind.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No completed transactions in this period.</p>
                </div>
              ) : (
                <>
                  <div className="md:hidden">
                    <div className="divide-y divide-border/60">
                      {financeByKind.map((row, idx) => (
                        <div key={row.kind} className="bg-card px-6 py-3.5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/30 text-xs font-semibold text-foreground">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{platformKindLabel(row.kind)}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{row.kind}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-semibold tabular-nums text-foreground">{formatCurrency(row.ugx)}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">UGX</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="border-b border-border/60 bg-background">
                        <tr className="text-left">
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Kind
                          </th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Key
                          </th>
                          <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Amount (UGX)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {financeByKind.map((row) => (
                          <tr key={row.kind} className="bg-card transition-colors hover:bg-muted/15">
                            <td className="px-6 py-3 font-medium text-foreground">{platformKindLabel(row.kind)}</td>
                            <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{row.kind}</td>
                            <td className="px-6 py-3 text-right tabular-nums">
                              <span className="font-semibold text-foreground">{formatCurrency(row.ugx)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Separator className="bg-border/60" />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
                    <span>
                      Period: <span className="font-medium text-foreground">{fromDate}</span> →{' '}
                      <span className="font-medium text-foreground">{toDate}</span>
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-8 border-border/80">
                      <Link href="/admin/reports">
                        <BarChart3 className="size-4" aria-hidden />
                        Open reports
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Marketing & inventory</CardTitle>
                  <CardDescription className="text-xs">Applications pipeline and banner inventory</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <ShieldCheck className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 p-5">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground">Ad applications</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                        {report?.marketing.applicationsTotal.toLocaleString() ?? '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Total in system</p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground">Banners active</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                        {report ? `${report.marketing.bannersActive}/${report.marketing.bannersTotal}` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Active / total</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground">Applications by status</p>
                    <div className="mt-3 space-y-2">
                      {Object.entries(report?.marketing.applicationsByStatus ?? {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-muted-foreground">{status.replace(/_/g, ' ')}</span>
                            <span className="tabular-nums font-medium text-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">Showing top 5 statuses by count.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
