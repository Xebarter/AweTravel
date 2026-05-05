'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  Bus,
  CalendarDays,
  Clock,
  Coins,
  FileText,
  Info,
  MapPin,
  Pencil,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DAYS_OF_WEEK,
  WEEKDAYS_MASK,
  WEEKEND_MASK,
  ALL_DAYS_MASK,
  decodeDays,
  describeDays,
} from '@/types/transporter-route';
import type { Route } from '@/types/transporter-route';
import type { Vehicle } from '@/types/transporter-vehicle';
import { APP_CURRENCY_CODE, formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const NO_VEHICLE = '__none__';

/** When set, updates the parent route (all departures on that route share these values). */
export type RouteFieldsPatch = {
  basePriceMinor: number;
  passengerSeatingCapacity: number;
};

export type DeparturePayload = {
  routeId: string;
  vehicleId: string | null;
  departureTime: string; // HH:MM
  daysOfWeek: number;
  status: 'active' | 'paused';
  priceOverrideMinor: number | null;
  notes: string | null;
};

export type ExistingDeparture = {
  id: string;
  routeId: string;
  vehicleId: string | null;
  departureTime: string;
  daysOfWeek: number;
  status: 'active' | 'paused';
  priceOverrideMinor: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  routeId: string;
  vehicleId: string;
  departureTime: string;
  daysOfWeek: number;
  status: 'active' | 'paused';
  priceOverrideMinor: string;
  notes: string;
};

function emptyForm(routeId?: string): FormState {
  return {
    routeId: routeId ?? '',
    vehicleId: '',
    departureTime: '08:00',
    daysOfWeek: WEEKDAYS_MASK,
    status: 'active',
    priceOverrideMinor: '',
    notes: '',
  };
}

function routeStatusBadgeClass(status: Route['status']): string {
  switch (status) {
    case 'active':
      return 'border-0 bg-success/15 text-success';
    case 'paused':
      return 'border-0 bg-amber-500/15 text-amber-800 dark:text-amber-200';
    default:
      return 'border-0 bg-muted text-muted-foreground';
  }
}

function formatTs(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

function DaysToggle({
  mask,
  onChange,
  idPrefix,
}: {
  mask: number;
  onChange: (mask: number) => void;
  idPrefix: string;
}) {
  const toggle = (bit: number) => onChange(mask ^ bit);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DAYS_OF_WEEK.map((d) => {
        const bit = 1 << d.index;
        const active = (mask & bit) !== 0;
        return (
          <button
            key={d.index}
            id={`${idPrefix}-day-${d.index}`}
            type="button"
            onClick={() => toggle(bit)}
            aria-pressed={active}
            className={cn(
              'h-9 min-w-11 rounded-md border px-2 text-xs font-semibold uppercase tracking-wide transition-colors',
              active
                ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground',
            )}
          >
            {d.short.slice(0, 1)}
          </button>
        );
      })}
      <div className="ml-1 flex flex-wrap gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange(WEEKDAYS_MASK)}>
          Weekdays
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange(WEEKEND_MASK)}>
          Weekends
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange(ALL_DAYS_MASK)}>
          Every day
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
      {children}
    </div>
  );
}

export function DepartureDialog({
  open,
  onOpenChange,
  routes,
  vehicles,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: Route[];
  vehicles: Vehicle[];
  initial?: ExistingDeparture | null;
  onSubmit: (
    payload: DeparturePayload,
    id?: string,
    routePatch?: RouteFieldsPatch | null,
  ) => void | Promise<void>;
}) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(() => emptyForm(initial?.routeId));
  const [routeBasePriceInput, setRouteBasePriceInput] = useState('');
  const [routePassengerSeatsInput, setRoutePassengerSeatsInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initial) {
      setForm(emptyForm());
      setRouteBasePriceInput('');
      setRoutePassengerSeatsInput('');
      setSubmitError(null);
      return;
    }
    setForm({
      routeId: initial.routeId,
      vehicleId: initial.vehicleId ?? '',
      departureTime: initial.departureTime,
      daysOfWeek: initial.daysOfWeek,
      status: initial.status,
      priceOverrideMinor: initial.priceOverrideMinor == null ? '' : String(initial.priceOverrideMinor),
      notes: initial.notes ?? '',
    });
    setSubmitError(null);
  }, [open, initial]);

  /**
   * Edit: keep route fare/seats in sync with the selected route (initial route, or a new route if the user retargets).
   * Uses `initial.routeId` when `form.routeId` is not yet committed on first paint.
   */
  useEffect(() => {
    if (!open || !initial) return;
    const routeId = form.routeId || initial.routeId;
    const r = routes.find((x) => x.id === routeId && x.status !== 'archived');
    if (r) {
      setRouteBasePriceInput(String(r.basePriceMinor));
      setRoutePassengerSeatsInput(String(r.passengerSeatingCapacity));
    } else {
      setRouteBasePriceInput('');
      setRoutePassengerSeatsInput('');
    }
  }, [open, initial, form.routeId, routes]);

  /** Create: when the user picks a route, load its fare and seat defaults. */
  useEffect(() => {
    if (!open || initial) return;
    if (!form.routeId) {
      setRouteBasePriceInput('');
      setRoutePassengerSeatsInput('');
      return;
    }
    const r = routes.find((x) => x.id === form.routeId && x.status !== 'archived');
    if (!r) return;
    setRouteBasePriceInput(String(r.basePriceMinor));
    setRoutePassengerSeatsInput(String(r.passengerSeatingCapacity));
  }, [open, initial, form.routeId, routes]);

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status !== 'inactive'), [vehicles]);
  const routeOptions = useMemo(() => routes.filter((r) => r.status !== 'archived'), [routes]);

  const selectedRoute = useMemo(
    () => routeOptions.find((r) => r.id === form.routeId),
    [routeOptions, form.routeId],
  );

  const selectedVehicle = useMemo(
    () => activeVehicles.find((v) => v.id === form.vehicleId),
    [activeVehicles, form.vehicleId],
  );

  const priceOverrideParsed =
    form.priceOverrideMinor.trim() === '' ? null : Number.parseInt(form.priceOverrideMinor, 10);
  const routeBaseParsed = Number.parseInt(routeBasePriceInput, 10);
  const routeBaseForPreview =
    Number.isFinite(routeBaseParsed) && routeBaseParsed >= 0
      ? routeBaseParsed
      : (selectedRoute?.basePriceMinor ?? 0);
  const effectiveFareMinor =
    priceOverrideParsed != null && Number.isFinite(priceOverrideParsed)
      ? priceOverrideParsed
      : routeBaseForPreview;

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K] | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (value && typeof value === 'object' && 'target' in value) {
        const t = value.target;
        setForm((f) => ({ ...f, [key]: t.value as FormState[K] }));
      } else {
        setForm((f) => ({ ...f, [key]: value as FormState[K] }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.routeId) {
      setSubmitError('Choose a route.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.departureTime)) {
      setSubmitError('Departure time must be HH:MM (24-hour).');
      return;
    }
    if (!Number.isFinite(form.daysOfWeek) || form.daysOfWeek < 1 || form.daysOfWeek > 127) {
      setSubmitError('Pick at least one day.');
      return;
    }
    const priceOverrideMinor =
      form.priceOverrideMinor.trim() === '' ? null : Number.parseInt(form.priceOverrideMinor, 10);
    if (priceOverrideMinor !== null && (!Number.isFinite(priceOverrideMinor) || priceOverrideMinor < 0)) {
      setSubmitError('Price override must be a non-negative number.');
      return;
    }

    const routeBaseMinor = Number.parseInt(routeBasePriceInput, 10);
    if (!Number.isFinite(routeBaseMinor) || routeBaseMinor < 0) {
      setSubmitError('Route base fare must be zero or a positive whole number (minor units).');
      return;
    }
    const routePassengerSeats = Number.parseInt(routePassengerSeatsInput, 10);
    if (!Number.isFinite(routePassengerSeats) || routePassengerSeats < 1 || routePassengerSeats > 120) {
      setSubmitError('Passenger seats on the route must be between 1 and 120.');
      return;
    }

    const routePatch: RouteFieldsPatch | null =
      selectedRoute &&
      (routeBaseMinor !== selectedRoute.basePriceMinor ||
        routePassengerSeats !== selectedRoute.passengerSeatingCapacity)
        ? { basePriceMinor: routeBaseMinor, passengerSeatingCapacity: routePassengerSeats }
        : null;

    const payload: DeparturePayload = {
      routeId: form.routeId,
      vehicleId: form.vehicleId.trim() ? form.vehicleId.trim() : null,
      departureTime: form.departureTime,
      daysOfWeek: form.daysOfWeek,
      status: form.status,
      priceOverrideMinor,
      notes: form.notes.trim() ? form.notes.trim() : null,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload, initial?.id, routePatch);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = Boolean(initial);
  const title = isEdit ? 'Edit schedule' : 'Add schedule';
  const subtitle = isEdit
    ? 'Adjust route fare and seat count (shared by all departures on that route), timing, vehicle, and optional per-departure override.'
    : 'Pick a route, set its base fare and seats if needed, then configure this departure.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(94vh,920px)] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-2xl',
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b bg-muted/25 px-5 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            {isEdit ? (
              <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background shadow-sm">
                <Pencil className="size-4 text-accent" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="mt-1.5">{subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              {isEdit && initial ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] text-foreground">ID {initial.id.slice(0, 8)}…</span>
                  {formatTs(initial.updatedAt) ? (
                    <span className="border-l border-border pl-2">Updated {formatTs(initial.updatedAt)}</span>
                  ) : null}
                  {formatTs(initial.createdAt) && !initial.updatedAt ? (
                    <span className="border-l border-border pl-2">Created {formatTs(initial.createdAt)}</span>
                  ) : null}
                </div>
              ) : null}

              {/* Route */}
              <div className="space-y-3">
                <SectionTitle icon={MapPin}>Route</SectionTitle>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-route`}>
                    Route <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.routeId} onValueChange={(v) => set('routeId')(v)}>
                    <SelectTrigger id={`${formId}-route`} className="w-full">
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[min(60vh,320px)] w-[var(--radix-select-trigger-width)]">
                      {routeOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="font-mono text-xs">{r.routeCode}</span>
                          <span className="text-muted-foreground"> — </span>
                          {r.origin} → {r.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRoute ? (
                  <Card className="border-border/80 bg-card/80 shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {selectedRoute.origin} → {selectedRoute.destination}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedRoute.routeCode}</p>
                        </div>
                        <Badge className={cn('shrink-0 capitalize', routeStatusBadgeClass(selectedRoute.status))}>
                          Route {selectedRoute.status}
                        </Badge>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${formId}-route-base-fare`}>
                            Route base fare ({selectedRoute.currency}, minor units)
                          </Label>
                          <Input
                            id={`${formId}-route-base-fare`}
                            className="font-mono"
                            inputMode="numeric"
                            min={0}
                            value={routeBasePriceInput}
                            onChange={(e) => setRouteBasePriceInput(e.target.value)}
                          />
                          <p className="text-xs tabular-nums text-muted-foreground">
                            Preview: {formatCurrency(routeBaseForPreview)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${formId}-route-seats`}>Passenger seats (route)</Label>
                          <Input
                            id={`${formId}-route-seats`}
                            className="font-mono"
                            inputMode="numeric"
                            min={1}
                            max={120}
                            value={routePassengerSeatsInput}
                            onChange={(e) => setRoutePassengerSeatsInput(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Booking seat map uses min(this, assigned vehicle capacity).
                          </p>
                        </div>
                        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 sm:col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Distance · duration
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {selectedRoute.distanceKm} km · {selectedRoute.durationMinutes} min
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Fare and seats apply to the{' '}
                            <span className="font-medium text-foreground">whole route</span> (every departure). Edit corridor or
                            stops under Routes.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a route to see corridor and pricing context.</p>
                )}
              </div>

              <Separator />

              {/* Timing */}
              <div className="space-y-3">
                <SectionTitle icon={Clock}>Timing & availability</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-time`}>Departure time</Label>
                    <Input
                      id={`${formId}-time`}
                      value={form.departureTime}
                      onChange={set('departureTime')}
                      placeholder="08:00"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">24-hour clock (local operator time).</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule status</Label>
                    <Select value={form.status} onValueChange={(v) => set('status')(v as FormState['status'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active — shown to passengers</SelectItem>
                        <SelectItem value="paused">Paused — hidden from new bookings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Operating days</Label>
                    <Badge variant="outline" className="font-normal">
                      <CalendarDays className="mr-1 size-3" aria-hidden />
                      {describeDays(form.daysOfWeek)}
                    </Badge>
                  </div>
                  <DaysToggle
                    mask={form.daysOfWeek}
                    onChange={(m) => setForm((f) => ({ ...f, daysOfWeek: m }))}
                    idPrefix={formId}
                  />
                  <p className="text-xs text-muted-foreground">
                    {decodeDays(form.daysOfWeek).length} day(s) selected per week.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Vehicle & pricing */}
              <div className="space-y-3">
                <SectionTitle icon={Truck}>Vehicle & pricing</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Assigned vehicle</Label>
                    <Select
                      value={form.vehicleId ? form.vehicleId : NO_VEHICLE}
                      onValueChange={(v) => set('vehicleId')(v === NO_VEHICLE ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No vehicle" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[min(50vh,280px)]">
                        <SelectItem value={NO_VEHICLE}>No vehicle assigned</SelectItem>
                        {activeVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="font-medium">{v.registration}</span>
                            <span className="text-muted-foreground"> · {v.type}</span>
                            <span className="text-xs text-muted-foreground"> · {v.capacity} seats</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedVehicle ? (
                    <Card className="border-border/80 bg-muted/15 shadow-none sm:col-span-2">
                      <CardContent className="flex flex-wrap items-center gap-3 p-3 sm:gap-4">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          <Bus className="size-5 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{selectedVehicle.registration}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedVehicle.type} · {selectedVehicle.capacity} seats
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 capitalize">
                          {selectedVehicle.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex gap-2 rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
                      <Info className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
                      <p>
                        Without a vehicle, passengers may still see the timetable; assign a vehicle so capacity checks match
                        your fleet. Seat map size uses the smaller of route passenger seats and vehicle capacity.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${formId}-price`}>Fare override ({APP_CURRENCY_CODE}, minor units)</Label>
                    <div className="relative">
                      <Coins className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id={`${formId}-price`}
                        className="pl-9 font-mono"
                        value={form.priceOverrideMinor}
                        onChange={set('priceOverrideMinor')}
                        placeholder={`Leave blank for route base (${formatCurrency(routeBaseForPreview)})`}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Effective fare (preview)</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(effectiveFareMinor)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {priceOverrideParsed != null && Number.isFinite(priceOverrideParsed)
                          ? 'Using departure override.'
                          : 'Using route base fare until an override is set.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-notes`} className="flex items-center gap-1.5">
                    <FileText className="size-3.5 opacity-70" aria-hidden />
                    Internal notes
                  </Label>
                  <Textarea
                    id={`${formId}-notes`}
                    value={form.notes}
                    onChange={set('notes')}
                    placeholder="Driver handover, gate details, or ops reminders (not shown to passengers)."
                    className="min-h-[88px] resize-y"
                  />
                </div>
              </div>

              {submitError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
