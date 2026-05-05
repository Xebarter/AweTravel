'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Megaphone,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AddRouteDialog } from '@/components/transporter/AddRouteDialog';
import { EditRouteDialog } from '@/components/transporter/EditRouteDialog';
import { RouteHomeAdDialog } from '@/components/transporter/RouteHomeAdDialog';
import {
  createTransporterRoute,
  deleteTransporterRoute,
  listTransporterRoutes,
} from '@/lib/transporter-routes/client';
import { listTransporterVehicles } from '@/lib/transporter-vehicles/client';
import {
  listRouteHomeAdApplications,
  patchRouteHomeAdApplication,
  type RouteHomeAdApplicationWithRoute,
} from '@/lib/route-home-ads/transporter-client';
import type { RouteHomeAdApplicationStatus } from '@/types/route-home-ad';
import {
  decodeDays,
  describeDays,
  type Route,
  type RouteStatus,
} from '@/types/transporter-route';
import type { Vehicle } from '@/types/transporter-vehicle';

type SortKey = 'routeCode' | 'origin' | 'distanceKm' | 'durationMinutes' | 'departures' | 'status';

const statusStyles: Record<RouteStatus, { label: string; dot: string }> = {
  active: { label: 'Active', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', dot: 'bg-amber-500' },
  archived: { label: 'Archived', dot: 'bg-muted-foreground/50' },
};

const statusOrder: Record<RouteStatus, number> = { active: 0, paused: 1, archived: 2 };

const adStatusRank: Record<RouteHomeAdApplicationStatus, number> = {
  pending_review: 4,
  draft: 3,
  rejected: 2,
  approved: 0,
  withdrawn: 0,
};

function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '—';
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

function nextDeparture(route: Route): string | null {
  const active = route.departures.filter((d) => d.status === 'active');
  if (active.length === 0) return null;
  const sorted = [...active].sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  return sorted[0]?.departureTime ?? null;
}

/** Estimated daily departures = sum across all active departures of how many of the 7 weekdays they run on, divided by 7. */
function dailyDeparturesEstimate(route: Route): number {
  const total = route.departures
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + decodeDays(d.daysOfWeek).length, 0);
  return total / 7;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addNonce, setAddNonce] = useState(0);
  const openAdd = () => {
    setAddNonce((n) => n + 1);
    setAddOpen(true);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RouteStatus>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('routeCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [homeAdOpen, setHomeAdOpen] = useState(false);
  const [homeAdRoute, setHomeAdRoute] = useState<Route | null>(null);
  const [editRouteId, setEditRouteId] = useState<string | null>(null);
  const [homeAdApplications, setHomeAdApplications] = useState<
    Awaited<ReturnType<typeof listRouteHomeAdApplications>>
  >([]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [r, v, ads] = await Promise.all([
        listTransporterRoutes(),
        listTransporterVehicles().catch(() => [] as Vehicle[]),
        listRouteHomeAdApplications().catch(() => []),
      ]);
      setRoutes(r);
      setVehicles(v);
      setHomeAdApplications(ads);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load routes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const reloadHomeAdApplications = useCallback(async () => {
    try {
      const ads = await listRouteHomeAdApplications();
      setHomeAdApplications(ads);
    } catch {
      /* ignore */
    }
  }, []);

  const stats = useMemo(() => {
    const active = routes.filter((r) => r.status === 'active');
    const paused = routes.filter((r) => r.status === 'paused').length;
    const archived = routes.filter((r) => r.status === 'archived').length;
    const dailyDepartures = active.reduce((sum, r) => sum + dailyDeparturesEstimate(r), 0);
    const totalDistance = active.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
    const avgDistance = active.length > 0 ? totalDistance / active.length : 0;
    const pendingHomeAds = homeAdApplications.filter((a) => a.status === 'pending_review').length;
    return {
      total: routes.length,
      active: active.length,
      paused,
      archived,
      pendingHomeAds,
      dailyDepartures: Math.round(dailyDepartures * 10) / 10,
      avgDistance: Math.round(avgDistance),
    };
  }, [routes, homeAdApplications]);

  const filteredRoutes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return routes.filter((r) => {
      const matchesSearch =
        !q ||
        r.routeCode.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  const sortedRoutes = useMemo(() => {
    const list = [...filteredRoutes];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'routeCode':
          cmp = a.routeCode.localeCompare(b.routeCode, undefined, { sensitivity: 'base' });
          break;
        case 'origin':
          cmp = `${a.origin} → ${a.destination}`.localeCompare(`${b.origin} → ${b.destination}`, undefined, {
            sensitivity: 'base',
          });
          break;
        case 'distanceKm':
          cmp = (a.distanceKm || 0) - (b.distanceKm || 0);
          break;
        case 'durationMinutes':
          cmp = (a.durationMinutes || 0) - (b.durationMinutes || 0);
          break;
        case 'departures':
          cmp = a.departures.length - b.departures.length;
          break;
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          if (cmp === 0) cmp = a.routeCode.localeCompare(b.routeCode);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredRoutes, sortKey, sortDir]);

  const totalFiltered = sortedRoutes.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRoutes.slice(start, start + pageSize);
  }, [sortedRoutes, page, pageSize]);

  const routeHomeAdBadge = useMemo(() => {
    const best = new Map<string, { status: RouteHomeAdApplicationStatus; rank: number }>();
    for (const a of homeAdApplications) {
      if (a.status === 'approved' || a.status === 'withdrawn') continue;
      const rank = adStatusRank[a.status];
      const cur = best.get(a.routeId);
      if (!cur || rank > cur.rank) best.set(a.routeId, { status: a.status, rank });
    }
    return best;
  }, [homeAdApplications]);

  const homeAdDialogContext = useMemo(() => {
    if (!homeAdRoute) {
      return {
        existingDraft: null as RouteHomeAdApplicationWithRoute | null,
        blockingPending: false,
      };
    }
    const forRoute = homeAdApplications.filter((a) => a.routeId === homeAdRoute.id);
    const pending = forRoute.some((a) => a.status === 'pending_review');
    const draft = forRoute.find((a) => a.status === 'draft') ?? null;
    return { existingDraft: draft, blockingPending: pending };
  }, [homeAdRoute, homeAdApplications]);

  const withdrawableHomeAdIdByRoute = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of homeAdApplications) {
      if (a.status === 'pending_review' || a.status === 'draft') m.set(a.routeId, a.id);
    }
    return m;
  }, [homeAdApplications]);

  const [withdrawAdBusy, setWithdrawAdBusy] = useState<string | null>(null);

  const withdrawHomeAd = async (applicationId: string) => {
    setWithdrawAdBusy(applicationId);
    setActionError(null);
    try {
      await patchRouteHomeAdApplication(applicationId, { status: 'withdrawn' });
      await reloadHomeAdApplications();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not withdraw application');
    } finally {
      setWithdrawAdBusy(null);
    }
  };

  const openHomeAd = (route: Route) => {
    setHomeAdRoute(route);
    setHomeAdOpen(true);
  };

  const showingFrom = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalFiltered);

  const routeToDelete = deleteId ? routes.find((r) => r.id === deleteId) : undefined;
  const existingCodes = useMemo(() => routes.map((r) => r.routeCode), [routes]);
  const editOtherCodes = useMemo(
    () => routes.filter((r) => r.id !== editRouteId).map((r) => r.routeCode),
    [routes, editRouteId],
  );

  const handleCreate = async (payload: Parameters<typeof createTransporterRoute>[0]) => {
    setActionError(null);
    const created = await createTransporterRoute(payload);
    setRoutes((prev) => [created, ...prev]);
    setPage(1);
  };

  const handleRouteSaved = (updated: Route) => {
    setActionError(null);
    setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteTransporterRoute(deleteId);
      setRoutes((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete route.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortButton = ({
    column,
    children,
    className,
  }: {
    column: SortKey;
    children: ReactNode;
    className?: string;
  }) => {
    const active = sortKey === column;
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          '-ml-1 h-6 gap-1 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground',
          active && 'text-foreground',
          className,
        )}
        onClick={() => toggleSort(column)}
      >
        {children}
        {active ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-3 w-3 opacity-80" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
          )
        ) : null}
      </Button>
    );
  };

  const filtersActive = !!searchTerm.trim() || statusFilter !== 'all';
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const filterOptions: { value: typeof statusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="min-h-0 bg-muted/20 pb-[max(3rem,env(safe-area-inset-bottom,0px))] dark:bg-background sm:pb-12">
      <div className="border-b border-border/80 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Transporter console · Routes
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
              Manage routes
            </h1>
            <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
              Define the route path, stops, and departures. Keep inventory accurate so passengers see reliable schedules.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 border-border/80 bg-background shadow-sm hover:bg-muted/40 sm:h-10 md:w-auto"
              onClick={() => void reload()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button
              type="button"
              className="h-11 w-full shrink-0 gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-10 md:w-auto"
              onClick={openAdd}
              disabled={isLoading || !!loadError}
            >
              <Plus className="h-4 w-4" />
              Add route
            </Button>
          </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:px-8">
        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>Could not load routes</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit shrink-0"
                onClick={() => void reload()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!loadError && actionError && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {!loadError && (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
              <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5">
                {[
                  { key: 'total', label: 'Total routes', value: isLoading ? null : stats.total },
                  { key: 'active', label: 'Active', value: isLoading ? null : stats.active },
                  { key: 'paused', label: 'Paused', value: isLoading ? null : stats.paused },
                  { key: 'archived', label: 'Archived', value: isLoading ? null : stats.archived },
                  { key: 'ads', label: 'Home ads pending', value: isLoading ? null : stats.pendingHomeAds },
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
                  placeholder="Search by code, origin, or destination…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 border-border/80 bg-card pl-8 text-sm shadow-sm placeholder:text-muted-foreground/70"
                  aria-label="Search routes"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Filter routes by status"
                  className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border/80 bg-card p-0.5 shadow-sm"
                >
                  {filterOptions.map((opt) => {
                    const active = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setStatusFilter(opt.value)}
                        disabled={isLoading}
                        className={cn(
                          'inline-flex h-7 items-center rounded px-2.5 text-xs font-medium transition-colors',
                          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40',
                          active
                            ? 'bg-muted text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                          isLoading && 'opacity-60',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {filtersActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>

            {isLoading ? (
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardContent className="p-8">
                  <div className="h-40 animate-pulse rounded-lg bg-muted sm:h-48" />
                </CardContent>
              </Card>
            ) : routes.length > 0 ? (
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/15 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Your routes
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">{stats.total}</span>
                      <span>{stats.total === 1 ? 'route' : 'routes'}</span>
                      <span aria-hidden>·</span>
                      <span>Active</span>
                      <span className="font-medium tabular-nums text-foreground">{stats.active}</span>
                      <span aria-hidden>·</span>
                      <span>Paused</span>
                      <span className="font-medium tabular-nums text-foreground">{stats.paused}</span>
                      <span aria-hidden>·</span>
                      <span>Departures/day</span>
                      <span className="font-medium tabular-nums text-foreground">{stats.dailyDepartures}</span>
                      {stats.pendingHomeAds > 0 ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="text-primary">
                            Home ads pending{' '}
                            <span className="font-semibold tabular-nums">{stats.pendingHomeAds}</span>
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {filtersActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleClearFilters}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                    <span className="hidden text-xs text-muted-foreground sm:inline">Rows</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-7 w-[64px] text-xs" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-[min(100vw-2rem,8rem)]">
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardContent className="p-0">
                  {totalFiltered === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                      <p className="text-sm font-medium text-foreground">No routes match these filters</p>
                      <p className="text-xs text-muted-foreground">
                        Try clearing the search or status filter.
                      </p>
                      {filtersActive ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 h-8 gap-1.5 text-xs"
                          onClick={handleClearFilters}
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                          Clear filters
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {/* Mobile & tablet: compact route cards */}
                      <div className="divide-y divide-border/60 lg:hidden">
                        {pageSlice.map((route) => {
                          const st = statusStyles[route.status];
                          const ad = routeHomeAdBadge.get(route.id);
                          const wId = withdrawableHomeAdIdByRoute.get(route.id);
                          return (
                            <article
                              key={route.id}
                              className="bg-card p-3.5 transition-colors hover:bg-muted/30"
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                                    st.dot,
                                  )}
                                  aria-label={st.label}
                                  title={st.label}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold tracking-tight text-foreground">
                                      {route.routeCode}
                                    </span>
                                    <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {route.vehicleClass}
                                    </span>
                                    {ad ? (
                                      <span
                                        className={cn(
                                          'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                                          ad.status === 'pending_review' &&
                                            'bg-primary/10 text-primary',
                                          ad.status === 'draft' &&
                                            'bg-muted text-muted-foreground',
                                          ad.status === 'rejected' &&
                                            'bg-destructive/10 text-destructive',
                                        )}
                                      >
                                        {ad.status === 'pending_review'
                                          ? 'Ad pending'
                                          : ad.status === 'draft'
                                            ? 'Ad draft'
                                            : 'Ad rejected'}
                                      </span>
                                    ) : null}
                                    {wId ? (
                                      <button
                                        type="button"
                                        className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                                        disabled={withdrawAdBusy === wId}
                                        onClick={() => void withdrawHomeAd(wId)}
                                      >
                                        Withdraw
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                                    {route.origin}{' '}
                                    <span className="text-muted-foreground">→</span>{' '}
                                    {route.destination}
                                  </p>
                                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                    {formatDistance(route.distanceKm)}
                                    <span aria-hidden> · </span>
                                    {formatDuration(route.durationMinutes)}
                                    <span aria-hidden> · </span>
                                    {route.stops.length}{' '}
                                    {route.stops.length === 1 ? 'stop' : 'stops'}
                                    <span aria-hidden> · </span>
                                    {route.departures.length}{' '}
                                    {route.departures.length === 1 ? 'departure' : 'departures'}
                                  </p>
                                  {route.departures.length > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1">
                                      {route.departures
                                        .slice()
                                        .sort((a, b) =>
                                          a.departureTime.localeCompare(b.departureTime),
                                        )
                                        .slice(0, 3)
                                        .map((d, i) => (
                                          <span
                                            key={d.id ?? i}
                                            title={`${describeDays(d.daysOfWeek)}${d.vehicleRegistration ? ` · ${d.vehicleRegistration}` : ''}`}
                                            className={cn(
                                              'rounded-md px-1.5 py-0.5 font-mono text-[11px]',
                                              d.status === 'paused'
                                                ? 'bg-muted/60 text-muted-foreground'
                                                : 'bg-accent/10 text-accent',
                                            )}
                                          >
                                            {d.departureTime}
                                          </span>
                                        ))}
                                      {route.departures.length > 3 && (
                                        <span className="text-[11px] tabular-nums text-muted-foreground">
                                          +{route.departures.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border/60 pt-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-full touch-manipulation"
                                  asChild
                                >
                                  <Link
                                    href={`/transporter/routes/${route.id}`}
                                    aria-label={`View ${route.routeCode}`}
                                    title="View"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-full touch-manipulation"
                                  aria-label={`Edit ${route.routeCode}`}
                                  title="Edit"
                                  onClick={() => setEditRouteId(route.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-full touch-manipulation"
                                  aria-label={`Homepage ad for ${route.routeCode}`}
                                  title="Homepage ad"
                                  onClick={() => openHomeAd(route)}
                                >
                                  <Megaphone className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-full touch-manipulation text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete ${route.routeCode}`}
                                  title="Delete"
                                  onClick={() => setDeleteId(route.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {/* Large screens: compact data table */}
                      <div className="relative hidden max-h-[min(72vh,720px)] w-full overflow-auto lg:block">
                        <table className="w-full min-w-[920px] caption-bottom text-[13px]">
                          <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
                            <TableRow className="border-0 hover:bg-transparent">
                              <TableHead className="h-9 w-[140px] pl-4 lg:pl-6">
                                <SortButton column="routeCode">Code</SortButton>
                              </TableHead>
                              <TableHead className="h-9">
                                <SortButton column="origin">Origin → Destination</SortButton>
                              </TableHead>
                              <TableHead className="h-9 w-[112px] text-right">
                                <div className="flex justify-end">
                                  <SortButton column="distanceKm" className="justify-end">
                                    Distance
                                  </SortButton>
                                </div>
                              </TableHead>
                              <TableHead className="h-9 w-[120px] text-right">
                                <div className="flex justify-end">
                                  <SortButton column="durationMinutes" className="justify-end">
                                    Duration
                                  </SortButton>
                                </div>
                              </TableHead>
                              <TableHead className="h-9 w-[200px]">
                                <SortButton column="departures">Departures</SortButton>
                              </TableHead>
                              <TableHead className="h-9 w-[110px]">
                                <SortButton column="status">Status</SortButton>
                              </TableHead>
                              <TableHead className="h-9 w-[150px] pr-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:pr-6">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pageSlice.map((route) => {
                              const st = statusStyles[route.status];
                              const ad = routeHomeAdBadge.get(route.id);
                              const wId = withdrawableHomeAdIdByRoute.get(route.id);
                              const next = nextDeparture(route);
                              return (
                                <TableRow
                                  key={route.id}
                                  className="group border-border/50 transition-colors hover:bg-muted/30"
                                >
                                  <TableCell className="py-1.5 pl-4 align-top lg:pl-6">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono text-[13px] font-semibold leading-tight text-foreground">
                                        {route.routeCode}
                                      </span>
                                      {ad ? (
                                        <span
                                          className={cn(
                                            'inline-flex h-4 items-center rounded-md px-1 text-[10px] font-medium',
                                            ad.status === 'pending_review' &&
                                              'bg-primary/10 text-primary',
                                            ad.status === 'draft' &&
                                              'bg-muted text-muted-foreground',
                                            ad.status === 'rejected' &&
                                              'bg-destructive/10 text-destructive',
                                          )}
                                        >
                                          {ad.status === 'pending_review'
                                            ? 'Ad pending'
                                            : ad.status === 'draft'
                                              ? 'Ad draft'
                                              : 'Ad rejected'}
                                        </span>
                                      ) : null}
                                      {wId ? (
                                        <button
                                          type="button"
                                          className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                                          title="Withdraw homepage ad request"
                                          disabled={withdrawAdBusy === wId}
                                          onClick={() => void withdrawHomeAd(wId)}
                                        >
                                          Withdraw
                                        </button>
                                      ) : null}
                                    </div>
                                    <span className="mt-1 inline-flex items-center rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {route.vehicleClass}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5 align-top">
                                    <span className="block truncate text-[13px] font-medium text-foreground">
                                      {route.origin}{' '}
                                      <span className="text-muted-foreground">→</span>{' '}
                                      {route.destination}
                                    </span>
                                    {route.stops.length > 0 && (
                                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                        {route.stops.length}{' '}
                                        {route.stops.length === 1 ? 'stop' : 'stops'}:{' '}
                                        {route.stops
                                          .slice(0, 3)
                                          .map((s) => s.name)
                                          .join(', ')}
                                        {route.stops.length > 3 ? '…' : ''}
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1.5 text-right align-top text-[12.5px] tabular-nums text-muted-foreground">
                                    {formatDistance(route.distanceKm)}
                                  </TableCell>
                                  <TableCell className="py-1.5 text-right align-top text-[12.5px] tabular-nums text-muted-foreground">
                                    {formatDuration(route.durationMinutes)}
                                  </TableCell>
                                  <TableCell className="py-1.5 align-top">
                                    {route.departures.length === 0 ? (
                                      <span className="text-[11px] text-muted-foreground">
                                        No departures
                                      </span>
                                    ) : (
                                      <div className="flex min-w-0 flex-col gap-0.5">
                                        <div className="flex flex-wrap items-center gap-1">
                                          {route.departures
                                            .slice()
                                            .sort((a, b) =>
                                              a.departureTime.localeCompare(b.departureTime),
                                            )
                                            .slice(0, 3)
                                            .map((d, i) => (
                                              <span
                                                key={d.id ?? i}
                                                title={`${describeDays(d.daysOfWeek)}${d.vehicleRegistration ? ` · ${d.vehicleRegistration}` : ''}`}
                                                className={cn(
                                                  'rounded-md px-1.5 py-0.5 font-mono text-[11px]',
                                                  d.status === 'paused'
                                                    ? 'bg-muted/60 text-muted-foreground'
                                                    : 'bg-accent/10 text-accent',
                                                )}
                                              >
                                                {d.departureTime}
                                              </span>
                                            ))}
                                          {route.departures.length > 3 && (
                                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                              +{route.departures.length - 3}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] tabular-nums text-muted-foreground">
                                          Next at{' '}
                                          <strong className="font-medium text-foreground">
                                            {next ?? '—'}
                                          </strong>
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1.5 align-top">
                                    <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
                                      <span
                                        className={cn(
                                          'size-1.5 shrink-0 rounded-full',
                                          st.dot,
                                        )}
                                        aria-hidden
                                      />
                                      {st.label}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-1.5 pr-4 text-right align-top lg:pr-6">
                                    <div className="flex justify-end gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        asChild
                                      >
                                        <Link
                                          href={`/transporter/routes/${route.id}`}
                                          aria-label={`View ${route.routeCode}`}
                                          title="View"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Link>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        aria-label={`Edit ${route.routeCode}`}
                                        title="Edit"
                                        onClick={() => setEditRouteId(route.id)}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        aria-label={`Homepage ad for ${route.routeCode}`}
                                        title="Homepage ad"
                                        onClick={() => openHomeAd(route)}
                                      >
                                        <Megaphone className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Delete ${route.routeCode}`}
                                        title="Delete"
                                        onClick={() => setDeleteId(route.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
                {totalFiltered > 0 ? (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 sm:px-5">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {showingFrom}–{showingTo}
                      </span>{' '}
                      of <span className="font-medium text-foreground">{totalFiltered}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Previous page"
                        title="Previous page"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <span className="min-w-22 text-center text-xs tabular-nums text-muted-foreground">
                        Page <span className="font-medium text-foreground">{page}</span> of{' '}
                        {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Next page"
                        title="Next page"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : (
              <Empty className="border border-dashed border-border/80 bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RouteIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No routes yet</EmptyTitle>
                  <EmptyDescription>
                    Create your first route to put buses on the road. You can add multiple departures
                    so the same route runs at different times of the day.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    type="button"
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={openAdd}
                  >
                    <Plus className="h-4 w-4" />
                    Add route
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </>
        )}
      </div>

      <AddRouteDialog
        key={addNonce}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingCodes={existingCodes}
        vehicles={vehicles}
        onCreate={handleCreate}
      />

      <EditRouteDialog
        open={editRouteId !== null}
        onOpenChange={(o) => {
          if (!o) setEditRouteId(null);
        }}
        routeId={editRouteId}
        otherRouteCodes={editOtherCodes}
        vehicles={vehicles}
        onSaved={handleRouteSaved}
      />

      <RouteHomeAdDialog
        route={homeAdRoute}
        existingDraft={homeAdDialogContext.existingDraft}
        blockingPending={homeAdDialogContext.blockingPending}
        open={homeAdOpen}
        onOpenChange={(o) => {
          setHomeAdOpen(o);
          if (!o) setHomeAdRoute(null);
        }}
        onSubmitted={() => void reloadHomeAdApplications()}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this route?</AlertDialogTitle>
            <AlertDialogDescription>
              {routeToDelete
                ? `${routeToDelete.routeCode} (${routeToDelete.origin} → ${routeToDelete.destination}) will be removed along with its ${routeToDelete.departures.length} departure${routeToDelete.departures.length === 1 ? '' : 's'} and ${routeToDelete.stops.length} stop${routeToDelete.stops.length === 1 ? '' : 's'}. This cannot be undone.`
                : 'This route and its departures will be removed. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={() => void handleDelete()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete route'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
