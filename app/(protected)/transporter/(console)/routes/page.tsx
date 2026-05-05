'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bus,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Edit,
  Eye,
  MapPin,
  PauseCircle,
  Plus,
  Route as RouteIcon,
  Megaphone,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

const statusStyles: Record<RouteStatus, { badge: string; label: string; accent: string }> = {
  active: {
    badge: 'border-0 bg-success/15 text-success hover:bg-success/20',
    label: 'Active',
    accent: 'border-l-success',
  },
  paused: {
    badge: 'border-0 bg-warning/15 text-warning hover:bg-warning/20',
    label: 'Paused',
    accent: 'border-l-warning',
  },
  archived: {
    badge: 'border-0 bg-muted text-muted-foreground',
    label: 'Archived',
    accent: 'border-l-muted-foreground/40',
  },
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
    const dailyDepartures = active.reduce((sum, r) => sum + dailyDeparturesEstimate(r), 0);
    const totalDistance = active.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
    const avgDistance = active.length > 0 ? totalDistance / active.length : 0;
    return {
      total: routes.length,
      active: active.length,
      dailyDepartures: Math.round(dailyDepartures * 10) / 10,
      avgDistance: Math.round(avgDistance),
    };
  }, [routes]);

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

  const handleCreate = async (payload: Parameters<typeof createTransporterRoute>[0]) => {
    setActionError(null);
    const created = await createTransporterRoute(payload);
    setRoutes((prev) => [created, ...prev]);
    setPage(1);
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
        className={cn('-ml-2 h-8 gap-1 px-2 font-medium hover:bg-muted/70', className)}
        onClick={() => toggleSort(column)}
      >
        {children}
        {active ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-4 w-4 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-40" aria-hidden />
        )}
      </Button>
    );
  };

  const filterOptions: { value: typeof statusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="min-h-screen pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:pb-12">
      <div className="relative overflow-hidden bg-linear-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <RouteIcon className="h-3.5 w-3.5" aria-hidden />
              Routes
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Manage routes
            </h1>
            <p className="max-w-xl text-sm text-primary-foreground/80 sm:text-base">
              Each route can have many buses moving at different times of the day. Define the path,
              add stops, then schedule departures to put buses on the road.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full shrink-0 gap-2 bg-accent text-accent-foreground shadow-md hover:bg-accent/90 sm:h-10 md:w-auto"
            onClick={openAdd}
            disabled={isLoading || !!loadError}
          >
            <Plus className="h-4 w-4" />
            Add route
          </Button>
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
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-border/80 shadow-sm">
                    <CardContent className="flex items-start gap-4 pt-6">
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <RouteIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total routes</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
                        {stats.total}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                      <CircleCheck className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-success">
                        {stats.active}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Bus className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Daily departures</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-warning">
                        {stats.dailyDepartures.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <MapPin className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg distance</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-accent">
                        {stats.avgDistance.toLocaleString()} km
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full min-w-0 max-w-lg flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  placeholder="Search by code, origin, or destination…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 border-border/80 bg-card pl-10 shadow-sm"
                  aria-label="Search routes"
                  disabled={isLoading}
                />
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-muted-foreground lg:hidden">Status</p>
                <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden lg:gap-2">
                  {filterOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={statusFilter === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'shrink-0 snap-start touch-manipulation rounded-full px-4',
                        statusFilter === opt.value && 'shadow-sm',
                      )}
                      onClick={() => setStatusFilter(opt.value)}
                      disabled={isLoading}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {isLoading ? (
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardContent className="p-8">
                  <div className="h-40 animate-pulse rounded-lg bg-muted sm:h-48" />
                </CardContent>
              </Card>
            ) : totalFiltered > 0 ? (
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-6">
                  <div className="min-w-0">
                    <CardTitle className="text-lg tracking-tight">Your routes</CardTitle>
                    <CardDescription className="mt-1.5">
                      {totalFiltered} route{totalFiltered === 1 ? '' : 's'}
                      {searchTerm.trim() || statusFilter !== 'all'
                        ? ' match your filters'
                        : ' configured'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-sm text-muted-foreground">Rows per page</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-11 w-full sm:h-9 sm:w-[88px]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-[min(100vw-2rem,12rem)]">
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Mobile & tablet: route cards */}
                  <div className="space-y-3 bg-muted/25 p-4 sm:space-y-4 sm:p-6 lg:hidden">
                    {pageSlice.map((route) => {
                      const st = statusStyles[route.status];
                      const next = nextDeparture(route);
                      return (
                        <article
                          key={route.id}
                          className={cn(
                            'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md',
                            'border-l-4',
                            st.accent,
                          )}
                        >
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn('shrink-0 capitalize', st.badge)}>
                                {st.label}
                              </Badge>
                              <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                                {route.routeCode}
                              </span>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {route.vehicleClass}
                              </span>
                              {routeHomeAdBadge.has(route.id) ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'shrink-0 border text-[11px] font-medium',
                                    routeHomeAdBadge.get(route.id)?.status === 'pending_review' &&
                                      'border-primary/40 bg-primary/10 text-primary',
                                    routeHomeAdBadge.get(route.id)?.status === 'draft' &&
                                      'border-border bg-muted text-muted-foreground',
                                    routeHomeAdBadge.get(route.id)?.status === 'rejected' &&
                                      'border-destructive/40 bg-destructive/10 text-destructive',
                                  )}
                                >
                                  {routeHomeAdBadge.get(route.id)?.status === 'pending_review'
                                    ? 'Home ad pending'
                                    : routeHomeAdBadge.get(route.id)?.status === 'draft'
                                      ? 'Home ad draft'
                                      : 'Home ad rejected'}
                                </Badge>
                              ) : null}
                              {withdrawableHomeAdIdByRoute.has(route.id) ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
                                  disabled={withdrawAdBusy === withdrawableHomeAdIdByRoute.get(route.id)}
                                  onClick={() =>
                                    void withdrawHomeAd(withdrawableHomeAdIdByRoute.get(route.id)!)
                                  }
                                >
                                  Withdraw
                                </Button>
                              ) : null}
                            </div>
                            <h3 className="mt-3 flex items-center gap-2 text-base font-semibold leading-snug">
                              <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                              <span className="min-w-0 truncate">
                                {route.origin}{' '}
                                <span className="text-muted-foreground">→</span>{' '}
                                {route.destination}
                              </span>
                            </h3>
                            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 sm:grid-cols-4">
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Distance
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums text-foreground">
                                  {formatDistance(route.distanceKm)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Duration
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums text-foreground">
                                  {formatDuration(route.durationMinutes)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Departures
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums text-foreground">
                                  {route.departures.length}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Stops
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums text-foreground">
                                  {route.stops.length}
                                </dd>
                              </div>
                            </dl>
                            {route.departures.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" aria-hidden />
                                  Next at <strong className="text-foreground">{next ?? '—'}</strong>
                                </span>
                                {route.departures.slice(0, 4).map((d, i) => (
                                  <span
                                    key={d.id ?? i}
                                    className={cn(
                                      'rounded-full border px-2 py-0.5 font-mono',
                                      d.status === 'paused'
                                        ? 'border-border/80 bg-muted/40 text-muted-foreground'
                                        : 'border-accent/30 bg-accent/10 text-accent',
                                    )}
                                    title={`${describeDays(d.daysOfWeek)}${d.vehicleRegistration ? ` · ${d.vehicleRegistration}` : ''}`}
                                  >
                                    {d.departureTime}
                                  </span>
                                ))}
                                {route.departures.length > 4 && (
                                  <span className="text-muted-foreground">
                                    +{route.departures.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="min-h-11 min-w-0 flex-1 touch-manipulation shadow-sm sm:min-h-10 sm:flex-1"
                                asChild
                              >
                                <Link
                                  href={`/transporter/routes/${route.id}`}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4 shrink-0" />
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-11 min-w-0 flex-1 touch-manipulation sm:min-h-10 sm:flex-1"
                                asChild
                              >
                                <Link
                                  href={`/transporter/routes/${route.id}/edit`}
                                  className="gap-2"
                                >
                                  <Edit className="h-4 w-4 shrink-0" />
                                  Edit
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-11 min-w-0 flex-1 touch-manipulation gap-2 sm:min-h-10"
                                onClick={() => openHomeAd(route)}
                              >
                                <Megaphone className="h-4 w-4 shrink-0" />
                                Home ad
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-11 min-w-11 shrink-0 touch-manipulation sm:min-h-10 sm:min-w-10"
                                aria-label={`Delete ${route.routeCode}`}
                                onClick={() => setDeleteId(route.id)}
                              >
                                <Trash2 className="mx-auto h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Large screens: data table */}
                  <div className="relative hidden max-h-[min(72vh,720px)] w-full overflow-auto lg:block">
                    <table className="w-full min-w-[920px] caption-bottom text-sm">
                      <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableHead className="h-11 w-[140px] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pl-6">
                            <SortButton column="routeCode">Code</SortButton>
                          </TableHead>
                          <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <SortButton column="origin">Origin → Destination</SortButton>
                          </TableHead>
                          <TableHead className="h-11 w-[112px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <div className="flex justify-end">
                              <SortButton column="distanceKm" className="justify-end">
                                Distance
                              </SortButton>
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[120px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <div className="flex justify-end">
                              <SortButton column="durationMinutes" className="justify-end">
                                Duration
                              </SortButton>
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <SortButton column="departures">Departures</SortButton>
                          </TableHead>
                          <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <SortButton column="status">Status</SortButton>
                          </TableHead>
                          <TableHead className="h-11 w-[180px] pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pr-6">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageSlice.map((route, rowIndex) => {
                          const st = statusStyles[route.status];
                          const next = nextDeparture(route);
                          return (
                            <TableRow
                              key={route.id}
                              className={cn(
                                'group border-border/60 transition-colors',
                                rowIndex % 2 === 1 && 'bg-muted/25',
                                'hover:bg-muted/50',
                              )}
                            >
                              <TableCell className="py-3.5 pl-4 lg:pl-6">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-mono text-sm font-semibold leading-tight tracking-tight">
                                    {route.routeCode}
                                  </p>
                                  {routeHomeAdBadge.has(route.id) ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'h-5 border px-1.5 py-0 text-[10px] font-medium',
                                        routeHomeAdBadge.get(route.id)?.status === 'pending_review' &&
                                          'border-primary/40 bg-primary/10 text-primary',
                                        routeHomeAdBadge.get(route.id)?.status === 'draft' &&
                                          'border-border bg-muted text-muted-foreground',
                                        routeHomeAdBadge.get(route.id)?.status === 'rejected' &&
                                          'border-destructive/40 bg-destructive/10 text-destructive',
                                      )}
                                    >
                                      {routeHomeAdBadge.get(route.id)?.status === 'pending_review'
                                        ? 'Ad pending'
                                        : routeHomeAdBadge.get(route.id)?.status === 'draft'
                                          ? 'Ad draft'
                                          : 'Ad rejected'}
                                    </Badge>
                                  ) : null}
                                  {withdrawableHomeAdIdByRoute.has(route.id) ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 shrink-0 px-1.5 text-[10px] text-muted-foreground"
                                      title="Withdraw homepage ad request"
                                      disabled={
                                        withdrawAdBusy === withdrawableHomeAdIdByRoute.get(route.id)
                                      }
                                      onClick={() =>
                                        void withdrawHomeAd(withdrawableHomeAdIdByRoute.get(route.id)!)
                                      }
                                    >
                                      Withdraw
                                    </Button>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {route.vehicleClass}
                                </p>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                                  <span className="min-w-0 truncate font-medium">
                                    {route.origin}{' '}
                                    <span className="text-muted-foreground">→</span>{' '}
                                    {route.destination}
                                  </span>
                                </div>
                                {route.stops.length > 0 && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {route.stops.length} stop
                                    {route.stops.length === 1 ? '' : 's'}:{' '}
                                    {route.stops
                                      .slice(0, 3)
                                      .map((s) => s.name)
                                      .join(', ')}
                                    {route.stops.length > 3 ? '…' : ''}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 text-right tabular-nums text-muted-foreground">
                                {formatDistance(route.distanceKm)}
                              </TableCell>
                              <TableCell className="py-3.5 text-right tabular-nums text-muted-foreground">
                                {formatDuration(route.durationMinutes)}
                              </TableCell>
                              <TableCell className="py-3.5">
                                {route.departures.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    No departures
                                  </span>
                                ) : (
                                  <div className="flex min-w-0 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {route.departures
                                        .slice()
                                        .sort((a, b) =>
                                          a.departureTime.localeCompare(b.departureTime),
                                        )
                                        .slice(0, 4)
                                        .map((d, i) => (
                                          <span
                                            key={d.id ?? i}
                                            title={`${describeDays(d.daysOfWeek)}${d.vehicleRegistration ? ` · ${d.vehicleRegistration}` : ''}`}
                                            className={cn(
                                              'rounded-full border px-2 py-0.5 font-mono text-[11px]',
                                              d.status === 'paused'
                                                ? 'border-border/80 bg-muted/40 text-muted-foreground'
                                                : 'border-accent/30 bg-accent/10 text-accent',
                                            )}
                                          >
                                            {d.departureTime}
                                          </span>
                                        ))}
                                      {route.departures.length > 4 && (
                                        <span className="text-[11px] text-muted-foreground">
                                          +{route.departures.length - 4}
                                        </span>
                                      )}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <CalendarDays className="h-3 w-3" aria-hidden />
                                      Next at{' '}
                                      <strong className="text-foreground">{next ?? '—'}</strong>
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <Badge className={cn('capitalize shadow-none', st.badge)}>
                                  {route.status === 'paused' ? (
                                    <PauseCircle className="mr-1 h-3 w-3" aria-hidden />
                                  ) : null}
                                  {st.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5 pr-4 text-right lg:pr-6">
                                <div className="flex justify-end gap-0.5 opacity-100 sm:gap-1 lg:opacity-90 lg:group-hover:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 touch-manipulation lg:h-8 lg:w-8"
                                    asChild
                                  >
                                    <Link
                                      href={`/transporter/routes/${route.id}`}
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 touch-manipulation lg:h-8 lg:w-8"
                                    asChild
                                  >
                                    <Link
                                      href={`/transporter/routes/${route.id}/edit`}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 touch-manipulation lg:h-8 lg:w-8"
                                    title="Homepage ad"
                                    onClick={() => openHomeAd(route)}
                                  >
                                    <Megaphone className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 touch-manipulation text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-8 lg:w-8"
                                    title="Delete"
                                    onClick={() => setDeleteId(route.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </table>
                  </div>
                </CardContent>
                <div className="flex flex-col gap-4 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-center text-sm text-muted-foreground sm:text-left">
                    Showing{' '}
                    <span className="font-medium text-foreground">
                      {showingFrom}–{showingTo}
                    </span>{' '}
                    of <span className="font-medium text-foreground">{totalFiltered}</span>
                  </p>
                  <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1 touch-manipulation sm:min-h-9 sm:flex-none"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="flex min-h-11 min-w-0 flex-1 items-center justify-center self-center text-sm text-muted-foreground sm:min-h-9 sm:min-w-20 sm:flex-none">
                      <span className="truncate">
                        Page {page} / {totalPages}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 flex-1 touch-manipulation sm:min-h-9 sm:flex-none"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Empty className="border border-dashed border-border/80 bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RouteIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {routes.length === 0 ? 'No routes yet' : 'No routes match'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {routes.length === 0
                      ? 'Create your first route to put buses on the road. You can add multiple departures so the same route runs at different times of the day.'
                      : searchTerm || statusFilter !== 'all'
                        ? 'Try another search term or clear the status filter.'
                        : 'Create your first route to put buses on the road.'}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {routes.length > 0 && (searchTerm || statusFilter !== 'all') && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
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
