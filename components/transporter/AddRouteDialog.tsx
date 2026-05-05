'use client';

import type { ChangeEvent, ComponentType, ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  Bus,
  CalendarDays,
  ClipboardList,
  Clock,
  Coins,
  FileText,
  Map as MapIcon,
  MapPin,
  Plus,
  Settings2,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_DAYS_MASK,
  DAYS_OF_WEEK,
  ROUTE_STATUS_OPTIONS,
  WEEKDAYS_MASK,
  WEEKEND_MASK,
  suggestRouteCode,
  type DepartureStatus,
  type Route,
  type RouteDeparture,
  type RouteStatus,
  type RouteStop,
} from '@/types/transporter-route';
import { VEHICLE_CLASS_OPTIONS, type Vehicle, type VehicleClass } from '@/types/transporter-vehicle';
import { APP_CURRENCY_CODE } from '@/lib/currency';
import { cn } from '@/lib/utils';

export type NewRoutePayload = Omit<Route, 'id' | 'createdAt' | 'updatedAt'>;

type StopRow = {
  key: string;
  name: string;
  etaOffsetMinutes: string;
};

type DepartureRow = {
  key: string;
  departureTime: string;
  daysOfWeek: number;
  vehicleId: string;
  status: DepartureStatus;
  priceOverride: string;
  notes: string;
};

type FormState = {
  routeCode: string;
  origin: string;
  destination: string;
  distanceKm: string;
  durationMinutes: string;
  vehicleClass: VehicleClass;
  basePrice: string;
  status: RouteStatus;
  notes: string;
  stops: StopRow[];
  departures: DepartureRow[];
};

let rowCounter = 0;
const newKey = (prefix: string) => {
  rowCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${rowCounter}`;
};

const newDeparture = (): DepartureRow => ({
  key: newKey('dep'),
  departureTime: '08:00',
  daysOfWeek: WEEKDAYS_MASK,
  vehicleId: '',
  status: 'active',
  priceOverride: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  routeCode: '',
  origin: '',
  destination: '',
  distanceKm: '',
  durationMinutes: '',
  vehicleClass: 'Bus',
  basePrice: '',
  status: 'active',
  notes: '',
  stops: [],
  departures: [newDeparture()],
});

function SectionTitle({
  icon: Icon,
  children,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
        {children}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(WEEKDAYS_MASK)}
        >
          Weekdays
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(WEEKEND_MASK)}
        >
          Weekends
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(ALL_DAYS_MASK)}
        >
          Every day
        </Button>
      </div>
    </div>
  );
}

type AddRouteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCodes: string[];
  vehicles: Vehicle[];
  onCreate: (route: NewRoutePayload) => void | Promise<void>;
};

export function AddRouteDialog({
  open,
  onOpenChange,
  existingCodes,
  vehicles,
  onCreate,
}: AddRouteDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  const codeSet = useMemo(
    () => new Set(existingCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)),
    [existingCodes],
  );

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== 'inactive'),
    [vehicles],
  );

  // Auto-suggest a route code from origin/destination until the user types one.
  useEffect(() => {
    if (codeTouched) return;
    const suggested = suggestRouteCode(form.origin, form.destination, codeSet.size + 1);
    setForm((f) => (f.routeCode === suggested ? f : { ...f, routeCode: suggested }));
  }, [form.origin, form.destination, codeSet.size, codeTouched]);

  const setField =
    <K extends keyof FormState>(key: K) =>
    (
      value:
        | FormState[K]
        | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (value && typeof value === 'object' && 'target' in value) {
        const t = value.target;
        setForm((f) => ({ ...f, [key]: t.value as FormState[K] }));
      } else {
        setForm((f) => ({ ...f, [key]: value as FormState[K] }));
      }
    };

  const addStop = () =>
    setForm((f) => ({
      ...f,
      stops: [
        ...f.stops,
        { key: newKey('stop'), name: '', etaOffsetMinutes: '' },
      ],
    }));

  const removeStop = (key: string) =>
    setForm((f) => ({ ...f, stops: f.stops.filter((s) => s.key !== key) }));

  const updateStop = (key: string, patch: Partial<StopRow>) =>
    setForm((f) => ({
      ...f,
      stops: f.stops.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));

  const addDeparture = () =>
    setForm((f) => ({ ...f, departures: [...f.departures, newDeparture()] }));

  const removeDeparture = (key: string) =>
    setForm((f) => ({
      ...f,
      departures: f.departures.filter((d) => d.key !== key),
    }));

  const updateDeparture = (key: string, patch: Partial<DepartureRow>) =>
    setForm((f) => ({
      ...f,
      departures: f.departures.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const routeCode = form.routeCode.trim().toUpperCase();
    if (!routeCode || routeCode.length < 2) {
      setSubmitError('Enter a route code (at least 2 characters).');
      return;
    }
    if (codeSet.has(routeCode)) {
      setSubmitError('A route with that code already exists in your fleet.');
      return;
    }
    const origin = form.origin.trim();
    const destination = form.destination.trim();
    if (!origin) return setSubmitError('Origin is required.');
    if (!destination) return setSubmitError('Destination is required.');
    if (origin.toLowerCase() === destination.toLowerCase()) {
      return setSubmitError('Origin and destination must be different.');
    }

    const distanceKm = Number.parseFloat(form.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      return setSubmitError('Enter a valid distance greater than zero.');
    }
    const durationMinutes = Number.parseInt(form.durationMinutes, 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return setSubmitError('Enter a valid duration in minutes.');
    }
    const basePrice = form.basePrice.trim() === '' ? 0 : Number.parseInt(form.basePrice, 10);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return setSubmitError('Base price must be zero or greater.');
    }

    if (form.departures.length === 0) {
      return setSubmitError('Add at least one departure so the route can run.');
    }

    const stops: RouteStop[] = [];
    for (let i = 0; i < form.stops.length; i += 1) {
      const s = form.stops[i];
      const name = s.name.trim();
      if (!name) {
        return setSubmitError(`Stop ${i + 1} needs a name (or remove it).`);
      }
      const eta = s.etaOffsetMinutes.trim() === '' ? undefined : Number.parseInt(s.etaOffsetMinutes, 10);
      if (eta !== undefined && (!Number.isFinite(eta) || eta < 0)) {
        return setSubmitError(`Stop ${i + 1} has an invalid ETA offset.`);
      }
      stops.push({ position: i, name, etaOffsetMinutes: eta });
    }

    const departures: RouteDeparture[] = [];
    for (let i = 0; i < form.departures.length; i += 1) {
      const d = form.departures[i];
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.departureTime)) {
        return setSubmitError(`Departure ${i + 1}: enter a valid time (HH:MM).`);
      }
      if (!d.daysOfWeek || d.daysOfWeek < 1 || d.daysOfWeek > 127) {
        return setSubmitError(`Departure ${i + 1}: pick at least one day of the week.`);
      }
      const priceOverride = d.priceOverride.trim();
      let priceOverrideMinor: number | null | undefined = undefined;
      if (priceOverride !== '') {
        const v = Number.parseInt(priceOverride, 10);
        if (!Number.isFinite(v) || v < 0) {
          return setSubmitError(`Departure ${i + 1}: price override is invalid.`);
        }
        priceOverrideMinor = v;
      }
      departures.push({
        departureTime: d.departureTime,
        daysOfWeek: d.daysOfWeek,
        vehicleId: d.vehicleId || null,
        status: d.status,
        priceOverrideMinor,
        notes: d.notes.trim() || undefined,
      });
    }

    const payload: NewRoutePayload = {
      routeCode,
      origin,
      destination,
      distanceKm,
      durationMinutes,
      vehicleClass: form.vehicleClass,
      basePriceMinor: basePrice,
      currency: APP_CURRENCY_CODE,
      status: form.status,
      notes: form.notes.trim() || undefined,
      stops,
      departures,
    };

    setIsSubmitting(true);
    try {
      await onCreate(payload);
      onOpenChange(false);
      setForm(emptyForm());
      setCodeTouched(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(94vh,920px)] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-3xl',
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b bg-muted/25 px-5 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="text-xl font-semibold tracking-tight">Add route</DialogTitle>
          <DialogDescription>
            Define the path and add the buses that move on it. A route can have many departures
            running at different times of the day.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="max-h-[min(58vh,560px)] min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:max-h-[min(62vh,600px)] sm:px-6 sm:py-6">
            <div className="space-y-6">
              {/* Identity */}
              <div className="space-y-4">
                <SectionTitle icon={ClipboardList}>Identity</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${formId}-code`}>
                      Route code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formId}-code`}
                      required
                      autoComplete="off"
                      placeholder="e.g. KAJI-001"
                      className="font-mono uppercase"
                      value={form.routeCode}
                      onChange={(e) => {
                        setCodeTouched(true);
                        setForm((f) => ({ ...f, routeCode: e.target.value }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-suggested from origin/destination. Edit to use your own code.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-origin`}>
                      Origin <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formId}-origin`}
                      required
                      autoComplete="off"
                      placeholder="e.g. Kampala"
                      value={form.origin}
                      onChange={setField('origin')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-dest`}>
                      Destination <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formId}-dest`}
                      required
                      autoComplete="off"
                      placeholder="e.g. Jinja"
                      value={form.destination}
                      onChange={setField('destination')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Path */}
              <div className="space-y-4">
                <SectionTitle icon={MapIcon}>Path & pricing</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-class`}>Vehicle class</Label>
                    <Select
                      value={form.vehicleClass}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, vehicleClass: v as VehicleClass }))
                      }
                    >
                      <SelectTrigger id={`${formId}-class`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                        {VEHICLE_CLASS_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-status`}>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as RouteStatus }))}
                    >
                      <SelectTrigger id={`${formId}-status`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                        {ROUTE_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-distance`}>
                      Distance (km) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formId}-distance`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      required
                      placeholder="e.g. 82"
                      value={form.distanceKm}
                      onChange={setField('distanceKm')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-duration`}>
                      Duration (minutes) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formId}-duration`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      required
                      placeholder="e.g. 120"
                      value={form.durationMinutes}
                      onChange={setField('durationMinutes')}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${formId}-price`}>
                      Base fare ({APP_CURRENCY_CODE})
                    </Label>
                    <div className="relative">
                      <Coins
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id={`${formId}-price`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="pl-9"
                        placeholder="e.g. 25000"
                        value={form.basePrice}
                        onChange={setField('basePrice')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Default fare passengers see. Each departure can override this if needed.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stops */}
              <div className="space-y-4">
                <SectionTitle icon={MapPin} hint="Optional intermediate stops in order">
                  Stops along the way
                </SectionTitle>
                {form.stops.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    No intermediate stops. Buses go straight from{' '}
                    <span className="font-medium text-foreground">{form.origin || 'origin'}</span>{' '}
                    to{' '}
                    <span className="font-medium text-foreground">
                      {form.destination || 'destination'}
                    </span>
                    .
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {form.stops.map((s, i) => (
                      <li
                        key={s.key}
                        className="grid grid-cols-[auto_1fr_minmax(0,7rem)_auto] items-end gap-3 rounded-lg border border-border/80 bg-card px-3 py-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {i + 1}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <Label className="text-xs">Stop name</Label>
                          <Input
                            value={s.name}
                            placeholder="e.g. Lugazi town"
                            onChange={(e) => updateStop(s.key, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ETA (min)</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="e.g. 45"
                            value={s.etaOffsetMinutes}
                            onChange={(e) => updateStop(s.key, { etaOffsetMinutes: e.target.value })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove stop ${i + 1}`}
                          className="h-9 w-9 self-end text-destructive hover:bg-destructive/10"
                          onClick={() => removeStop(s.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addStop}
                >
                  <Plus className="h-4 w-4" />
                  Add stop
                </Button>
              </div>

              <Separator />

              {/* Departures */}
              <div className="space-y-4">
                <SectionTitle
                  icon={Clock}
                  hint="Each departure is a bus running at a specific time"
                >
                  Departures
                </SectionTitle>
                {activeVehicles.length === 0 && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                    You don&apos;t have any active vehicles in your fleet yet. You can still
                    define departure times — assign a vehicle later from the Vehicles page.
                  </div>
                )}
                <ul className="space-y-3">
                  {form.departures.map((d, i) => (
                    <li
                      key={d.key}
                      className="space-y-3 rounded-lg border border-border/80 bg-card px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Bus className="h-4 w-4 text-accent" aria-hidden />
                          Departure {i + 1}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove departure ${i + 1}`}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={form.departures.length === 1}
                          onClick={() => removeDeparture(d.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Departure time <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="time"
                            required
                            value={d.departureTime}
                            onChange={(e) =>
                              updateDeparture(d.key, { departureTime: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Assigned bus</Label>
                          <Select
                            value={d.vehicleId || 'none'}
                            onValueChange={(v) =>
                              updateDeparture(d.key, { vehicleId: v === 'none' ? '' : v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pick a vehicle" />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              className="w-(--radix-select-trigger-width)"
                            >
                              <SelectItem value="none">Unassigned</SelectItem>
                              {activeVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  <span className="font-mono">{v.registration}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    · {v.type} · {v.capacity} seats
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <CalendarDays className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          Days of the week <span className="text-destructive">*</span>
                        </Label>
                        <DaysToggle
                          mask={d.daysOfWeek}
                          onChange={(m) => updateDeparture(d.key, { daysOfWeek: m })}
                          idPrefix={`${formId}-${d.key}`}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-xs">
                            <Settings2 className="h-3.5 w-3.5 opacity-70" aria-hidden />
                            Status
                          </Label>
                          <Select
                            value={d.status}
                            onValueChange={(v) =>
                              updateDeparture(d.key, { status: v as DepartureStatus })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              className="w-(--radix-select-trigger-width)"
                            >
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Fare override ({APP_CURRENCY_CODE})
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="Use route base fare"
                            value={d.priceOverride}
                            onChange={(e) =>
                              updateDeparture(d.key, { priceOverride: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addDeparture}
                >
                  <Plus className="h-4 w-4" />
                  Add another departure
                </Button>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <SectionTitle icon={FileText}>Internal notes</SectionTitle>
                <Textarea
                  id={`${formId}-notes`}
                  placeholder="Driver briefings, stopover details, livery notes…"
                  rows={3}
                  className="resize-y"
                  value={form.notes}
                  onChange={setField('notes')}
                />
              </div>
            </div>
          </div>

          {submitError && (
            <p className="shrink-0 border-t border-destructive/30 bg-destructive/10 px-5 py-2 text-sm text-destructive sm:px-6">
              {submitError}
            </p>
          )}
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t bg-card px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? 'Saving…' : 'Create route'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
