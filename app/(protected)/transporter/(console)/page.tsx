'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Wrench,
  MapPin,
  ShieldCheck,
  Ticket,
  Truck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { APP_CURRENCY_CODE, formatCurrency } from '@/lib/currency';
import { useEffect, useMemo, useState } from 'react';
import { getTransporterDashboardMetrics, type TransporterDashboardMetrics } from '@/lib/transporter-dashboard/client';

export default function TransporterDashboard() {
  // Demo data until transporter reporting is wired.
  const revenueData = [
    { day: 'Mon', revenue: 125000, bookings: 15 },
    { day: 'Tue', revenue: 180000, bookings: 22 },
    { day: 'Wed', revenue: 160000, bookings: 19 },
    { day: 'Thu', revenue: 210000, bookings: 25 },
    { day: 'Fri', revenue: 245000, bookings: 30 },
    { day: 'Sat', revenue: 280000, bookings: 35 },
    { day: 'Sun', revenue: 200000, bookings: 24 },
  ];

  const dailyBookings = [
    { date: 'May 15', bookings: 18 },
    { date: 'May 16', bookings: 22 },
    { date: 'May 17', bookings: 25 },
    { date: 'May 18', bookings: 30 },
    { date: 'May 19', bookings: 28 },
    { date: 'May 20', bookings: 35 },
  ];

  const [metrics, setMetrics] = useState<TransporterDashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMetricsLoading(true);
    setMetricsError(null);
    void (async () => {
      try {
        const next = await getTransporterDashboardMetrics();
        if (!cancelled) setMetrics(next);
      } catch (e: unknown) {
        if (!cancelled) setMetricsError(e instanceof Error ? e.message : 'Failed to load dashboard metrics.');
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyRevenue = useMemo(() => {
    if (!metrics) return null;
    // We store values as “minor units” (UGX is effectively 1:1, but keep format consistent).
    return formatCurrency(metrics.weeklyRevenueMinor);
  }, [metrics]);

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Transporter console</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Transport operations
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Transporter dashboard
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Monitor bookings, routes, fleet status, and payouts. This overview is designed for fast daily checks.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-sm">
                <Link href="/transporter/profile">
                  <ShieldCheck className="size-4" aria-hidden />
                  Profile
                </Link>
              </Button>
              <Button asChild size="sm" className="h-8 font-medium shadow-sm">
                <Link href="/transporter/routes">
                  <MapPin className="size-4" aria-hidden />
                  Manage routes
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {metricsError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {metricsError}
          </div>
        ) : null}

        {/* KPI strip */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-2.5">
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <TrendingUp className="size-3.5" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Weekly revenue
                  </p>
                  {metricsLoading ? (
                    <Skeleton className="mx-auto mt-1 h-6 w-24" />
                  ) : (
                    <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {weeklyRevenue ?? '—'}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    Currency:{' '}
                    <span className="font-medium text-foreground">{metrics?.currency ?? APP_CURRENCY_CODE}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-2.5">
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <MapPin className="size-3.5" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Active routes
                  </p>
                  {metricsLoading ? (
                    <Skeleton className="mx-auto mt-1 h-6 w-12" />
                  ) : (
                    <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {metrics?.routesActive ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">Currently published</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-2.5">
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <Truck className="size-3.5" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Fleet online
                  </p>
                  {metricsLoading ? (
                    <Skeleton className="mx-auto mt-1 h-6 w-12" />
                  ) : (
                    <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {metrics?.vehiclesOnline ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">Active vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-2.5">
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Ticket className="size-3.5" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                    Departures (active)
                  </p>
                  {metricsLoading ? (
                    <Skeleton className="mx-auto mt-1 h-6 w-12" />
                  ) : (
                    <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                      {metrics?.departuresActive ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">Across active routes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management + status */}
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/80 shadow-sm lg:col-span-7">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
              <CardDescription className="text-xs">Common surfaces used in day-to-day operations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/transporter/routes" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <MapPin className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Routes</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Create routes, manage stops, and publish availability
                    </p>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/transporter/vehicles" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Truck className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Vehicles</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Fleet, capacity, seat maps, and maintenance status
                    </p>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/transporter/schedules" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <CalendarClock className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Schedules</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Departure windows, repeating days, and trip planning
                    </p>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left">
                <Link href="/transporter/bookings" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <Ticket className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Bookings</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Passenger manifests, confirmations, and seat allocations
                    </p>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto justify-start gap-2.5 border-border/80 p-3.5 text-left sm:col-span-2">
                <Link href="/transporter/earnings" className="flex w-full items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                    <CreditCard className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal wrap-break-word font-semibold leading-snug text-foreground">Earnings</p>
                    <p className="mt-0.5 whitespace-normal wrap-break-word text-xs leading-snug text-muted-foreground">
                      Payout history, reconciliation, and export-ready totals
                    </p>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-semibold">Operational status</CardTitle>
              <CardDescription className="text-xs">Signals that might need attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 p-5">
              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <Wrench className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Fleet maintenance</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      1 vehicle due for maintenance. Review the vehicle list and schedule downtime.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <TrendingUp className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Demand</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      High booking volume today. Consider adding departures for peak routes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <CreditCard className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Payments</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {formatCurrency(35_000)} processed from 7 bookings in the last 24 hours.
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
                  <CardTitle className="text-base font-semibold">Weekly revenue & bookings</CardTitle>
                  <CardDescription className="text-xs">A 7‑day snapshot (demo data)</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <BarChart3 className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={revenueData}>
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
                      if (name?.toString().toLowerCase().includes('revenue')) {
                        const n = typeof value === 'number' ? value : Number(value);
                        return formatCurrency(Number.isFinite(n) ? n : 0);
                      }
                      return value as unknown as string;
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
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    name={`Revenue (${APP_CURRENCY_CODE})`}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="bookings"
                    fill="hsl(var(--accent))"
                    name="Bookings"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Bookings trend</CardTitle>
                  <CardDescription className="text-xs">Last 6 days (demo data)</CardDescription>
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <TrendingUp className="size-4" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={290}>
                <LineChart data={dailyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.25}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <CardDescription className="text-xs">A place to surface the latest bookings and schedule changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
            <Separator className="bg-border/60" />
            <p className="text-sm text-muted-foreground">
              This section will automatically populate once booking + schedule activity endpoints are connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
