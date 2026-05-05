'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  Bus,
  CalendarDays,
  ClipboardList,
  Clock,
  Coins,
  FileText,
  Loader2,
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
  ROUTE_STATUS_OPTIONS,
  type DepartureStatus,
  type Route,
  type RouteDeparture,
  type RouteStatus,
  type RouteStop,
} from '@/types/transporter-route';
import {
  DEFAULT_CAPACITY_BY_CLASS,
  VEHICLE_CLASS_OPTIONS,
  type Vehicle,
  type VehicleClass,
} from '@/types/transporter-vehicle';
import { APP_CURRENCY_CODE } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  getTransporterRoute,
  updateTransporterRoute,
  type RouteUpdatePayload,
} from '@/lib/transporter-routes/client';
import {
  newDepartureRow,
  newRouteFormKey,
  RouteDialogDaysToggle,
  RouteDialogSectionTitle,
  type DepartureRow,
  type StopRow,
} from '@/components/transporter/route-dialog-shared';

type FormState = {
  routeCode: string;
  origin: string;
  destination: string;
  distanceKm: string;
  durationMinutes: string;
  vehicleClass: VehicleClass;
  passengerSeatingCapacity: string;
  basePrice: string;
  status: RouteStatus;
  notes: string;
  stops: StopRow[];
  departures: DepartureRow[];
};

const emptyForm = (): FormState => ({
  routeCode: '',
  origin: '',
  destination: '',
  distanceKm: '',
  durationMinutes: '',
  vehicleClass: 'Bus',
  passengerSeatingCapacity: String(DEFAULT_CAPACITY_BY_CLASS.Bus),
  basePrice: '',
  status: 'active',
  notes: '',
  stops: [],
  departures: [newDepartureRow()],
});

function routeToForm(r: Route): FormState {
  const stops = [...r.stops].sort((a, b) => a.position - b.position);
  const departures =
    r.departures.length > 0
      ? r.departures.map((d) => ({
          key: newRouteFormKey('dep'),
          departureTime: d.departureTime,
          daysOfWeek: d.daysOfWeek,
          vehicleId: d.vehicleId ?? '',
          status: d.status,
          priceOverride:
            d.priceOverrideMinor != null ? String(d.priceOverrideMinor) : '',
          notes: d.notes ?? '',
        }))
      : [newDepartureRow()];

  return {
    routeCode: r.routeCode,
    origin: r.origin,
    destination: r.destination,
    distanceKm: String(r.distanceKm),
    durationMinutes: String(r.durationMinutes / 60),
    vehicleClass: r.vehicleClass,
    passengerSeatingCapacity: String(r.passengerSeatingCapacity),
    basePrice: String(r.basePriceMinor),
    status: r.status,
    notes: r.notes ?? '',
    stops: stops.map((s) => ({
      key: newRouteFormKey('stop'),
      name: s.name,
      etaOffsetMinutes:
        s.etaOffsetMinutes != null ? String(s.etaOffsetMinutes) : '',
    })),
    departures,
  };
}

export type EditRouteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Route id to load when the dialog opens */
  routeId: string | null;
  /** Codes of other routes (for duplicate code check). Exclude the route being edited. */
  otherRouteCodes: string[];
  vehicles: Vehicle[];
  onSaved: (route: Route) => void | Promise<void>;
};

export function EditRouteDialog({
  open,
  onOpenChange,
  routeId,
  otherRouteCodes,
  vehicles,
  onSaved,
}: EditRouteDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [remoteRoute, setRemoteRoute] = useState<Route | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [durationTouched, setDurationTouched] = useState(false);

  const codeSet = useMemo(
    () =>
      new Set(otherRouteCodes.map((c) => c.trim().toUpperCase()).filter(Boolean)),
    [otherRouteCodes],
  );

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== 'inactive'),
    [vehicles],
  );

  const distanceAutoFillEnabled = useMemo(() => {
    return !distanceTouched && form.distanceKm.trim() === '';
  }, [distanceTouched, form.distanceKm]);

  const durationAutoFillEnabled = useMemo(() => {
    return !durationTouched && form.durationMinutes.trim() === '';
  }, [durationTouched, form.durationMinutes]);

  const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c;
  };

  const geocodePlace = async (name: string, signal?: AbortSignal) => {
    const q = name.trim();
    if (!q) return null;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> };
    const hit = j.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude };
  };

  useEffect(() => {
    if (!open || !routeId) {
      setRemoteRoute(null);
      setLoadError(null);
      setIsLoading(false);
      setForm(emptyForm());
      setDistanceTouched(false);
      setDurationTouched(false);
      setSubmitError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setRemoteRoute(null);

    void getTransporterRoute(routeId)
      .then((r) => {
        if (!cancelled) {
          setRemoteRoute(r);
          setForm(routeToForm(r));
          setDistanceTouched(false);
          setDurationTouched(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load route.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, routeId]);

  useEffect(() => {
    if (!open) return;
    if (!distanceAutoFillEnabled) return;
    const origin = form.origin.trim();
    const destination = form.destination.trim();
    if (!origin || !destination) return;
    if (origin.toLowerCase() === destination.toLowerCase()) return;

    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const [a, b] = await Promise.all([
            geocodePlace(origin, controller.signal),
            geocodePlace(destination, controller.signal),
          ]);
          if (!a || !b) return;
          const km = haversineKm(a, b);
          if (!Number.isFinite(km) || km <= 0) return;
          const rounded = Math.round(km * 10) / 10;
          setForm((f) => (f.distanceKm.trim() === '' ? { ...f, distanceKm: String(rounded) } : f));
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      })();
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [open, form.origin, form.destination, distanceAutoFillEnabled]);

  useEffect(() => {
    if (!open) return;
    if (!durationAutoFillEnabled) return;
    const km = Number.parseFloat(form.distanceKm);
    if (!Number.isFinite(km) || km <= 0) return;
    const assumedKmPerHour = 60;
    const rawHours = km / assumedKmPerHour;
    if (!Number.isFinite(rawHours) || rawHours <= 0) return;
    const rounded = Math.max(0.25, Math.round(rawHours * 4) / 4);
    setForm((f) =>
      f.durationMinutes.trim() === '' ? { ...f, durationMinutes: String(rounded) } : f,
    );
  }, [open, form.distanceKm, durationAutoFillEnabled]);

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
        { key: newRouteFormKey('stop'), name: '', etaOffsetMinutes: '' },
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
    setForm((f) => ({ ...f, departures: [...f.departures, newDepartureRow()] }));

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
    if (!routeId || !remoteRoute) {
      setSubmitError('Route is not loaded yet.');
      return;
    }

    const routeCode = form.routeCode.trim().toUpperCase();
    if (!routeCode || routeCode.length < 2) {
      setSubmitError('Route code must be at least 2 characters.');
      return;
    }
    if (codeSet.has(routeCode)) {
      setSubmitError('Another route already uses that code.');
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
    const durationHours = Number.parseFloat(form.durationMinutes);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return setSubmitError('Enter a valid duration in hours.');
    }
    const durationMinutes = Math.round(durationHours * 60);
    const basePrice = form.basePrice.trim() === '' ? 0 : Number.parseInt(form.basePrice, 10);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return setSubmitError('Base price must be zero or greater.');
    }

    const passengerSeatingCapacity = Number.parseInt(form.passengerSeatingCapacity, 10);
    if (
      !Number.isFinite(passengerSeatingCapacity) ||
      passengerSeatingCapacity < 1 ||
      passengerSeatingCapacity > 120
    ) {
      return setSubmitError('Passenger seats must be a whole number from 1 to 120.');
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

    const payload: RouteUpdatePayload = {
      routeCode,
      origin,
      destination,
      distanceKm,
      durationMinutes,
      vehicleClass: form.vehicleClass,
      passengerSeatingCapacity,
      basePriceMinor: basePrice,
      currency: remoteRoute.currency || APP_CURRENCY_CODE,
      status: form.status,
      notes: form.notes.trim() || null,
      stops,
      departures,
    };

    setIsSubmitting(true);
    try {
      const updated = await updateTransporterRoute(routeId, payload);
      await onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleCode = remoteRoute?.routeCode ?? '…';
  const subtitle =
    remoteRoute != null
      ? `${remoteRoute.origin} → ${remoteRoute.destination}`
      : routeId
        ? 'Loading route…'
        : '';

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
          <DialogTitle className="text-xl font-semibold tracking-tight">Edit route</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold text-foreground">{titleCode}</span>
            {subtitle ? (
              <>
                <span aria-hidden> · </span>
                {subtitle}
              </>
            ) : null}
            . Saving updates this route for all linked schedules. Stops and departures you list here
            replace the current set on the server.
          </DialogDescription>
        </DialogHeader>

        {loadError && !isLoading && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-4 sm:px-6">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (!routeId) return;
                setLoadError(null);
                setIsLoading(true);
                void getTransporterRoute(routeId)
                  .then((r) => {
                    setRemoteRoute(r);
                    setForm(routeToForm(r));
                    setDistanceTouched(false);
                    setDurationTouched(false);
                  })
                  .catch((e: unknown) => {
                    setLoadError(e instanceof Error ? e.message : 'Could not load route.');
                  })
                  .finally(() => setIsLoading(false));
              }}
            >
              Try again
            </Button>
          </div>
        )}

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="max-h-[min(58vh,560px)] min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:max-h-[min(62vh,600px)] sm:px-6 sm:py-6">
            {isLoading || (!loadError && !remoteRoute) ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <p className="text-sm">Loading route…</p>
              </div>
            ) : loadError ? null : (
              <div className="space-y-6">
                <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Changes to <strong className="text-foreground">stops</strong> or{' '}
                  <strong className="text-foreground">departures</strong> replace the existing rows for
                  this route (same as re-importing the schedule). Other fields update the route record
                  only.
                </div>

                <div className="space-y-4">
                  <RouteDialogSectionTitle icon={ClipboardList}>Identity</RouteDialogSectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
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

                <div className="space-y-4">
                  <RouteDialogSectionTitle icon={MapIcon}>Path & pricing</RouteDialogSectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-class`}>Vehicle class</Label>
                      <Select
                        value={form.vehicleClass}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            vehicleClass: v as VehicleClass,
                            passengerSeatingCapacity: String(
                              DEFAULT_CAPACITY_BY_CLASS[v as VehicleClass],
                            ),
                          }))
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
                      <Label htmlFor={`${formId}-passenger-seats`}>
                        Passenger seats <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`${formId}-passenger-seats`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={120}
                        required
                        value={form.passengerSeatingCapacity}
                        onChange={setField('passengerSeatingCapacity')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Sellable seats on the passenger booking map (capped by each departure
                        vehicle&apos;s capacity).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-status`}>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, status: v as RouteStatus }))
                        }
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
                        onChange={(e) => {
                          setDistanceTouched(true);
                          setField('distanceKm')(e);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        You can clear and re-enter origin/destination to auto-estimate distance.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-duration`}>
                        Duration (hours) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`${formId}-duration`}
                        type="number"
                        inputMode="decimal"
                        min={0.25}
                        step="0.25"
                        required
                        placeholder="e.g. 2.5"
                        value={form.durationMinutes}
                        onChange={(e) => {
                          setDurationTouched(true);
                          setField('durationMinutes')(e);
                        }}
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
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <RouteDialogSectionTitle icon={ClipboardList} hint="Unique in your fleet">
                    Route code
                  </RouteDialogSectionTitle>
                  <Label htmlFor={`${formId}-code`}>
                    Route code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`${formId}-code`}
                    required
                    autoComplete="off"
                    className="font-mono uppercase"
                    value={form.routeCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, routeCode: e.target.value.toUpperCase() }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <RouteDialogSectionTitle icon={MapPin} hint="Optional intermediate stops in order">
                    Stops along the way
                  </RouteDialogSectionTitle>
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
                              onChange={(e) =>
                                updateStop(s.key, { etaOffsetMinutes: e.target.value })
                              }
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
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addStop}>
                    <Plus className="h-4 w-4" />
                    Add stop
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <RouteDialogSectionTitle
                    icon={Clock}
                    hint="Each departure is a bus running at a specific time"
                  >
                    Departures
                  </RouteDialogSectionTitle>
                  {activeVehicles.length === 0 && (
                    <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                      No active vehicles in your fleet. You can still set times and assign buses
                      later.
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
                          <RouteDialogDaysToggle
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

                <div className="space-y-2">
                  <RouteDialogSectionTitle icon={FileText}>Internal notes</RouteDialogSectionTitle>
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
            )}
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
            disabled={isSubmitting || isLoading || !!loadError || !remoteRoute}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
