'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, RefreshCw, Search, Route as RouteIcon } from 'lucide-react';
import { DepartureDialog, type DeparturePayload, type ExistingDeparture } from '@/components/transporter/DepartureDialog';
import { listTransporterRoutes } from '@/lib/transporter-routes/client';
import { listTransporterVehicles } from '@/lib/transporter-vehicles/client';
import type { Route } from '@/types/transporter-route';
import type { Vehicle } from '@/types/transporter-vehicle';
import { cn } from '@/lib/utils';

type DepartureRow = {
  id: string;
  route_id: string;
  departure_time: string;
  days_of_week: number;
  status: 'active' | 'paused';
  vehicle_id: string | null;
  route?: { route_code: string; origin: string; destination: string };
};

function describeMask(mask: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    if (mask & (1 << i)) out.push(names[i]!);
  }
  if (out.length === 7) return 'Every day';
  if (out.length === 0) return '—';
  return out.join(', ');
}

function statusBadgeClass(status: 'active' | 'paused'): string {
  return status === 'active'
    ? 'border-0 bg-success/15 text-success hover:bg-success/20'
    : 'border-0 bg-muted text-muted-foreground';
}

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<DepartureRow[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExistingDeparture | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [depsRes, rts, vhs] = await Promise.all([
        fetch('/api/transporter/departures'),
        listTransporterRoutes().catch(() => [] as Route[]),
        listTransporterVehicles().catch(() => [] as Vehicle[]),
      ]);
      const res = depsRes;
      if (!res.ok) throw new Error(await readError(res));
      const j = (await res.json()) as { departures: DepartureRow[] };
      setSchedules(j.departures ?? []);
      setRoutes(rts);
      setVehicles(vhs);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredSchedules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return schedules.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      const routeLabel = `${s.route?.origin ?? ''} ${s.route?.destination ?? ''}`.toLowerCase();
      const code = (s.route?.route_code ?? '').toLowerCase();
      return routeLabel.includes(q) || code.includes(q) || s.departure_time.toLowerCase().includes(q);
    });
  }, [schedules, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((s) => s.status === 'active').length;
    const paused = schedules.filter((s) => s.status === 'paused').length;
    const routesCovered = new Set(schedules.map((s) => s.route_id).filter(Boolean)).size;
    return { total, active, paused, routesCovered };
  }, [schedules]);

  const handleDelete = (id: string) => {
    void (async () => {
      try {
        const res = await fetch(`/api/transporter/departures/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await readError(res));
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        console.error(e);
      } finally {
        setShowDeleteConfirm(null);
      }
    })();
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: DepartureRow) => {
    setEditing({
      id: row.id,
      routeId: row.route_id,
      vehicleId: row.vehicle_id ?? null,
      departureTime: row.departure_time,
      daysOfWeek: row.days_of_week,
      status: row.status,
      priceOverrideMinor: null,
      notes: null,
    });
    setDialogOpen(true);
  };

  const submitDeparture = async (payload: DeparturePayload, id?: string) => {
    const body = id
      ? {
          vehicleId: payload.vehicleId,
          departureTime: payload.departureTime,
          daysOfWeek: payload.daysOfWeek,
          status: payload.status,
          priceOverrideMinor: payload.priceOverrideMinor,
          notes: payload.notes,
        }
      : payload;
    const res = await fetch(id ? `/api/transporter/departures/${id}` : '/api/transporter/departures', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readError(res));
    await reload();
  };

  return (
    <div className="min-h-0 bg-muted/20 pb-[max(3rem,env(safe-area-inset-bottom,0px))] dark:bg-background sm:pb-12">
      <div className="border-b border-border/80 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Transporter console · Schedules
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Schedule management
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Create departures, assign vehicles, and control which days each trip runs.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 border-border/80 bg-background shadow-sm hover:bg-muted/40 sm:h-10 md:w-auto"
                onClick={() => void reload()}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                Refresh
              </Button>
              <Button
                type="button"
                className="h-11 w-full shrink-0 gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-10 md:w-auto"
                onClick={openCreate}
                disabled={loading && schedules.length === 0 && !!loadError}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add schedule
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:px-8">
        {loadError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}{' '}
            <button className="underline" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {[
              { key: 'total', label: 'Total schedules', value: loading ? null : stats.total },
              { key: 'active', label: 'Active', value: loading ? null : stats.active },
              { key: 'paused', label: 'Paused', value: loading ? null : stats.paused },
              { key: 'routes', label: 'Routes covered', value: loading ? null : stats.routesCovered },
            ].map((item) => (
              <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-0.5">
                  {item.value === null ? (
                    <div className="h-5 w-10 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative w-full min-w-0 flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Search by route name, code, or time…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-border/80 bg-card pl-8 text-sm shadow-sm placeholder:text-muted-foreground/70"
              aria-label="Search schedules"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter schedules by status"
              className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border/80 bg-card p-0.5 shadow-sm"
            >
              {[
                { value: 'all' as const, label: 'All' },
                { value: 'active' as const, label: 'Active' },
                { value: 'paused' as const, label: 'Paused' },
              ].map((opt) => {
                const active = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      'h-7 rounded-sm px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => setStatusFilter(opt.value)}
                    disabled={loading}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schedules List */}
        {loading ? (
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-8">
              <div className="h-40 animate-pulse rounded-lg bg-muted sm:h-48" />
            </CardContent>
          </Card>
        ) : filteredSchedules.length > 0 ? (
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-6">
              <div className="min-w-0">
                <CardTitle className="text-lg tracking-tight">Your schedules</CardTitle>
                <CardDescription className="mt-1.5">
                  {filteredSchedules.length} schedule{filteredSchedules.length === 1 ? '' : 's'}
                  {searchTerm.trim() || statusFilter !== 'all' ? ' match your filters' : ' configured'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile & tablet: cards */}
              <div className="space-y-3 bg-muted/25 p-4 sm:space-y-4 sm:p-6 lg:hidden">
                {filteredSchedules.map((schedule) => {
                  const routeLabel = schedule.route
                    ? `${schedule.route.origin} → ${schedule.route.destination}`
                    : '—';
                  const code = schedule.route?.route_code ?? '—';
                  const daysLabel = describeMask(schedule.days_of_week);
                  return (
                    <article
                      key={schedule.id}
                      className={cn(
                        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md',
                        'border-l-4',
                        schedule.status === 'active' ? 'border-l-success' : 'border-l-muted-foreground/40',
                      )}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('shrink-0 capitalize', statusBadgeClass(schedule.status))}>
                            {schedule.status}
                          </Badge>
                          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                            {code}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {schedule.departure_time}
                          </span>
                        </div>

                        <h3 className="mt-3 flex items-center gap-2 text-base font-semibold leading-snug">
                          <RouteIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                          <span className="min-w-0 truncate">{routeLabel}</span>
                        </h3>

                        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 sm:grid-cols-3">
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Departure
                            </dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {schedule.departure_time}
                            </dd>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Days
                            </dt>
                            <dd className="truncate text-sm font-medium text-foreground">{daysLabel}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="min-h-11 flex-1 touch-manipulation shadow-sm sm:min-h-10"
                            onClick={() => openEdit(schedule)}
                          >
                            <Edit className="h-4 w-4 shrink-0" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11 min-w-11 shrink-0 touch-manipulation text-destructive hover:bg-destructive/10 sm:min-h-10 sm:min-w-10"
                            aria-label="Delete schedule"
                            onClick={() => setShowDeleteConfirm(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>

                        {showDeleteConfirm === schedule.id && (
                          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                            <p className="text-sm text-destructive">Delete this schedule?</p>
                            <div className="mt-3 flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(null)}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDelete(schedule.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="relative hidden max-h-[min(72vh,720px)] w-full overflow-auto lg:block">
                <table className="w-full min-w-[840px] caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead className="h-11 w-[140px] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pl-6">
                        Code
                      </TableHead>
                      <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Route
                      </TableHead>
                      <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Time
                      </TableHead>
                      <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Days
                      </TableHead>
                      <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-11 w-[160px] pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule, rowIndex) => (
                      <TableRow
                        key={schedule.id}
                        className={cn(
                          'group border-border/60 transition-colors',
                          rowIndex % 2 === 1 && 'bg-muted/25',
                          'hover:bg-muted/50',
                        )}
                      >
                        <TableCell className="py-3.5 pl-4 lg:pl-6">
                          <span className="font-mono text-sm font-semibold tracking-tight">
                            {schedule.route?.route_code ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {schedule.route
                                ? `${schedule.route.origin} → ${schedule.route.destination}`
                                : '—'}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Route</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 font-mono text-sm text-muted-foreground">
                          {schedule.departure_time}
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-muted-foreground">
                          {describeMask(schedule.days_of_week)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge className={cn('capitalize shadow-none', statusBadgeClass(schedule.status))}>
                            {schedule.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 pr-4 text-right lg:pr-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-2"
                              onClick={() => openEdit(schedule)}
                            >
                              <Edit className="h-4 w-4" aria-hidden />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-2 text-destructive hover:bg-destructive/10"
                              onClick={() => setShowDeleteConfirm(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No schedules found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first schedule to start operations'}
              </p>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <DepartureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        routes={routes}
        vehicles={vehicles}
        initial={editing}
        onSubmit={submitDeparture}
      />
    </div>
  );
}
