'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Bus,
  Car,
  Truck,
  Van,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Wrench,
  CircleCheck,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CalendarClock,
  Gauge,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AddVehicleDialog } from '@/components/transporter/AddVehicleDialog';
import type { Vehicle, VehicleStatus } from '@/types/transporter-vehicle';
import {
  createTransporterVehicle,
  deleteTransporterVehicle,
  listTransporterVehicles,
} from '@/lib/transporter-vehicles/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SortKey =
  | 'registration'
  | 'type'
  | 'status'
  | 'capacity'
  | 'mileage'
  | 'lastMaintenance'
  | 'acquisitionDate';

function formatDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusStyles: Record<VehicleStatus, { badge: string; label: string }> = {
  active: {
    badge: 'border-0 bg-success/15 text-success hover:bg-success/20',
    label: 'Active',
  },
  maintenance: {
    badge: 'border-0 bg-warning/15 text-warning hover:bg-warning/20',
    label: 'Maintenance',
  },
  inactive: {
    badge: 'border-0 bg-muted text-muted-foreground',
    label: 'Inactive',
  },
};

const statusOrder: Record<VehicleStatus, number> = {
  active: 0,
  maintenance: 1,
  inactive: 2,
};

const statusAccent: Record<VehicleStatus, string> = {
  active: 'border-l-success',
  maintenance: 'border-l-warning',
  inactive: 'border-l-muted-foreground/40',
};

function vehicleVisuals(type: string): { Icon: LucideIcon; ring: string } {
  const t = type.toLowerCase();
  if (t.includes('sedan')) {
    return { Icon: Car, ring: 'bg-sky-500/12 text-sky-700 dark:text-sky-300' };
  }
  if (t.includes('minibus')) {
    return { Icon: Van, ring: 'bg-amber-500/12 text-amber-800 dark:text-amber-300' };
  }
  if (t.includes('sprinter')) {
    return { Icon: Van, ring: 'bg-orange-500/12 text-orange-800 dark:text-orange-300' };
  }
  if (t.includes('coach')) {
    return { Icon: Bus, ring: 'bg-violet-500/12 text-violet-800 dark:text-violet-300' };
  }
  if (t.includes('bus')) {
    return { Icon: Bus, ring: 'bg-primary/14 text-primary' };
  }
  return { Icon: Truck, ring: 'bg-muted text-muted-foreground' };
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  /** Remount dialog when opening so Radix + form state stay in sync (avoids open no-op with React 19). */
  const [addVehicleNonce, setAddVehicleNonce] = useState(0);
  const openAddVehicleDialog = () => {
    setAddVehicleNonce((n) => n + 1);
    setAddVehicleOpen(true);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('registration');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listTransporterVehicles();
      setVehicles(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load vehicles.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const active = vehicles.filter((v) => v.status === 'active').length;
    const maintenance = vehicles.filter((v) => v.status === 'maintenance').length;
    const totalSeats = vehicles.reduce((sum, v) => sum + v.capacity, 0);
    return {
      total: vehicles.length,
      active,
      maintenance,
      totalSeats,
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !q ||
        vehicle.registration.toLowerCase().includes(q) ||
        vehicle.type.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const sortedVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'registration':
        case 'type':
        case 'lastMaintenance':
        case 'acquisitionDate':
          cmp = a[sortKey].localeCompare(b[sortKey], undefined, { sensitivity: 'base' });
          break;
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          if (cmp === 0) cmp = a.registration.localeCompare(b.registration);
          break;
        case 'capacity':
        case 'mileage':
          cmp = a[sortKey] - b[sortKey];
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredVehicles, sortKey, sortDir]);

  const totalFiltered = sortedVehicles.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedVehicles.slice(start, start + pageSize);
  }, [sortedVehicles, page, pageSize]);

  const showingFrom = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalFiltered);

  const vehicleToDelete = deleteId ? vehicles.find((v) => v.id === deleteId) : undefined;
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteTransporterVehicle(deleteId);
      setVehicles((prev) => prev.filter((v) => v.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not remove vehicle.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const existingPlates = useMemo(() => vehicles.map((v) => v.registration), [vehicles]);

  const handleCreateVehicle = async (payload: Omit<Vehicle, 'id'>) => {
    setActionError(null);
    const created = await createTransporterVehicle(payload);
    setVehicles((prev) => [created, ...prev]);
    setPage(1);
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
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <div className="min-h-screen pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:pb-12">
      <div className="relative overflow-hidden bg-linear-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Truck className="h-3.5 w-3.5" aria-hidden />
              Fleet
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Fleet management</h1>
            <p className="max-w-xl text-sm text-primary-foreground/80 sm:text-base">
              Search and filter your fleet, sort columns, and page through large lists. Cards on small
              screens; full table on desktop.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full shrink-0 gap-2 bg-accent text-accent-foreground shadow-md hover:bg-accent/90 sm:h-10 md:w-auto"
            onClick={openAddVehicleDialog}
            disabled={isLoading || !!loadError}
          >
            <Plus className="h-4 w-4" />
            Add vehicle
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:px-8">
        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>Could not load fleet</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" className="w-fit shrink-0" onClick={() => void reload()}>
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
                      <Truck className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total vehicles</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">{stats.total}</p>
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
                      <Wrench className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">In maintenance</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-warning">
                        {stats.maintenance}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Users className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total seats</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-accent">
                        {stats.totalSeats}
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
                  placeholder="Search by plate or vehicle type…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 border-border/80 bg-card pl-10 shadow-sm"
                  aria-label="Search vehicles"
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
                        'shrink-0 snap-start rounded-full px-4 touch-manipulation',
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
                <CardTitle className="text-lg tracking-tight">Your vehicles</CardTitle>
                <CardDescription className="mt-1.5">
                  {totalFiltered} vehicle{totalFiltered === 1 ? '' : 's'}
                  {searchTerm.trim() || statusFilter !== 'all' ? ' match your filters' : ' in the fleet'}
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
              {/* Mobile & tablet: vehicle cards */}
              <div className="space-y-3 bg-muted/25 p-4 sm:space-y-4 sm:p-6 lg:hidden">
                {pageSlice.map((vehicle) => {
                  const st = statusStyles[vehicle.status];
                  const { Icon, ring } = vehicleVisuals(vehicle.type);
                  return (
                    <article
                      key={vehicle.id}
                      className={cn(
                        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md',
                        'border-l-4',
                        statusAccent[vehicle.status],
                      )}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex gap-3 sm:gap-4">
                          <div
                            className={cn(
                              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14',
                              ring,
                            )}
                            aria-hidden
                          >
                            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                              <p className="font-mono text-base font-bold tracking-tight text-foreground sm:text-lg">
                                {vehicle.registration}
                              </p>
                              <Badge className={cn('shrink-0 capitalize', st.badge)}>{st.label}</Badge>
                            </div>
                            <p className="mt-1 text-sm font-medium leading-snug text-muted-foreground">
                              {vehicle.type}
                            </p>
                          </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 sm:grid-cols-4 sm:gap-2 sm:p-4">
                          <div className="flex flex-col gap-0.5">
                            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              <Users className="h-3 w-3 opacity-70" aria-hidden />
                              Seats
                            </dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">{vehicle.capacity}</dd>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              <Gauge className="h-3 w-3 opacity-70" aria-hidden />
                              Mileage
                            </dt>
                            <dd className="text-sm font-semibold tabular-nums text-foreground">
                              {vehicle.mileage.toLocaleString()} km
                            </dd>
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              <Wrench className="h-3 w-3 opacity-70" aria-hidden />
                              Service
                            </dt>
                            <dd className="truncate text-sm font-medium text-foreground">
                              {formatDate(vehicle.lastMaintenance)}
                            </dd>
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              <CalendarClock className="h-3 w-3 opacity-70" aria-hidden />
                              Since
                            </dt>
                            <dd className="truncate text-sm font-medium text-foreground">
                              {formatDate(vehicle.acquisitionDate)}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="min-h-11 flex-1 touch-manipulation shadow-sm sm:min-h-10"
                            asChild
                          >
                            <Link href={`/transporter/vehicles/${vehicle.id}`} className="gap-2">
                              <Eye className="h-4 w-4 shrink-0" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11 flex-1 touch-manipulation sm:min-h-10"
                            asChild
                          >
                            <Link href={`/transporter/vehicles/${vehicle.id}/edit`} className="gap-2">
                              <Edit className="h-4 w-4 shrink-0" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 min-w-11 shrink-0 touch-manipulation sm:min-h-10 sm:min-w-10"
                            aria-label={`Remove ${vehicle.registration}`}
                            onClick={() => setDeleteId(vehicle.id)}
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
              <div className="relative hidden max-h-[min(70vh,680px)] w-full overflow-auto lg:block">
                <table className="w-full min-w-[760px] caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead className="h-11 w-[220px] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pl-6">
                        <SortButton column="registration">Vehicle</SortButton>
                      </TableHead>
                      <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortButton column="type">Type</SortButton>
                      </TableHead>
                      <TableHead className="h-11 w-[124px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortButton column="status">Status</SortButton>
                      </TableHead>
                      <TableHead className="h-11 w-[88px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <div className="flex justify-end">
                          <SortButton column="capacity" className="justify-end">
                            Seats
                          </SortButton>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[108px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:w-[120px]">
                        <div className="flex justify-end">
                          <SortButton column="mileage" className="justify-end">
                            <span className="xl:hidden">Miles</span>
                            <span className="hidden xl:inline">Mileage</span>
                          </SortButton>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[128px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortButton column="lastMaintenance">Service</SortButton>
                      </TableHead>
                      <TableHead className="h-11 w-[128px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <SortButton column="acquisitionDate">Since</SortButton>
                      </TableHead>
                      <TableHead className="h-11 w-[132px] pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageSlice.map((vehicle, rowIndex) => {
                      const st = statusStyles[vehicle.status];
                      const { Icon, ring } = vehicleVisuals(vehicle.type);
                      return (
                        <TableRow
                          key={vehicle.id}
                          className={cn(
                            'group border-border/60 transition-colors',
                            rowIndex % 2 === 1 && 'bg-muted/25',
                            'hover:bg-muted/50',
                          )}
                        >
                          <TableCell className="py-3.5 pl-4 lg:pl-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                  ring,
                                )}
                                aria-hidden
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <p className="min-w-0 truncate font-mono text-sm font-semibold leading-tight tracking-tight">
                                {vehicle.registration}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-40 py-3.5">
                            <span className="block truncate font-medium leading-snug" title={vehicle.type}>
                              {vehicle.type}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge className={cn('capitalize shadow-none', st.badge)}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="py-3.5 text-right text-sm font-medium tabular-nums">
                            {vehicle.capacity}
                          </TableCell>
                          <TableCell className="py-3.5 text-right text-sm tabular-nums text-muted-foreground">
                            <span className="xl:hidden">{(vehicle.mileage / 1000).toFixed(0)}k km</span>
                            <span className="hidden xl:inline">{vehicle.mileage.toLocaleString()} km</span>
                          </TableCell>
                          <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                            {formatDate(vehicle.lastMaintenance)}
                          </TableCell>
                          <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                            {formatDate(vehicle.acquisitionDate)}
                          </TableCell>
                          <TableCell className="py-3.5 pr-4 text-right lg:pr-6">
                            <div className="flex justify-end gap-0.5 opacity-100 sm:gap-1 lg:opacity-90 lg:group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 touch-manipulation lg:h-8 lg:w-8"
                                asChild
                              >
                                <Link href={`/transporter/vehicles/${vehicle.id}`} title="View">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 touch-manipulation lg:h-8 lg:w-8"
                                asChild
                              >
                                <Link href={`/transporter/vehicles/${vehicle.id}/edit`} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 touch-manipulation text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-8 lg:w-8"
                                title="Remove"
                                onClick={() => setDeleteId(vehicle.id)}
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
                <Truck className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>{vehicles.length === 0 ? 'No vehicles yet' : 'No vehicles match'}</EmptyTitle>
              <EmptyDescription>
                {vehicles.length === 0
                  ? 'Register your first vehicle to start assigning routes and schedules.'
                  : searchTerm || statusFilter !== 'all'
                    ? 'Try another search term or clear the status filter.'
                    : 'Register your first vehicle to start assigning routes and schedules.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {vehicles.length > 0 && (searchTerm || statusFilter !== 'all') && (
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
                onClick={openAddVehicleDialog}
              >
                <Plus className="h-4 w-4" />
                Register vehicle
              </Button>
            </EmptyContent>
          </Empty>
        )}
          </>
        )}
      </div>

      <AddVehicleDialog
        key={addVehicleNonce}
        open={addVehicleOpen}
        onOpenChange={setAddVehicleOpen}
        existingPlates={existingPlates}
        onCreate={handleCreateVehicle}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              {vehicleToDelete
                ? `${vehicleToDelete.type} (${vehicleToDelete.registration}) will be removed from your fleet. This cannot be undone.`
                : 'This vehicle will be removed from your fleet. This cannot be undone.'}
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
              {deleteBusy ? 'Removing…' : 'Remove vehicle'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
