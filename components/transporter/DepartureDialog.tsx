'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Truck } from 'lucide-react';
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
import { DAYS_OF_WEEK, WEEKDAYS_MASK, WEEKEND_MASK, ALL_DAYS_MASK, decodeDays } from '@/types/transporter-route';
import type { Route } from '@/types/transporter-route';
import type { Vehicle } from '@/types/transporter-vehicle';
import { cn } from '@/lib/utils';

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

function SectionTitle({ icon: Icon, children }: { icon: any; children: ReactNode }) {
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
  onSubmit: (payload: DeparturePayload, id?: string) => void | Promise<void>;
}) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(() => emptyForm(initial?.routeId));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initial) {
      setForm(emptyForm());
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

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status !== 'inactive'), [vehicles]);
  const routeOptions = useMemo(() => routes.filter((r) => r.status !== 'archived'), [routes]);

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
      await onSubmit(payload, initial?.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initial ? 'Edit schedule' : 'Add schedule';
  const subtitle = initial
    ? 'Update departure time, operating days, and optional vehicle assignment.'
    : 'Create a new departure time for one of your routes.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(92vh,860px)] w-full max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-2xl',
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b bg-muted/25 px-5 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <SectionTitle icon={MapPin}>Route</SectionTitle>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-route`}>Route</Label>
                  <Select value={form.routeId} onValueChange={(v) => set('routeId')(v)}>
                    <SelectTrigger id={`${formId}-route`}>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routeOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.routeCode} — {r.origin} → {r.destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <SectionTitle icon={Clock}>Timing</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-time`}>Departure time</Label>
                    <Input id={`${formId}-time`} value={form.departureTime} onChange={set('departureTime')} placeholder="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => set('status')(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Days of week</Label>
                  <DaysToggle mask={form.daysOfWeek} onChange={(m) => setForm((f) => ({ ...f, daysOfWeek: m }))} idPrefix={formId} />
                  <p className="text-xs text-muted-foreground">
                    Runs on {decodeDays(form.daysOfWeek).length} day(s) per week.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <SectionTitle icon={Truck}>Vehicle & pricing</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vehicle (optional)</Label>
                    <Select value={form.vehicleId} onValueChange={(v) => set('vehicleId')(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No vehicle</SelectItem>
                        {activeVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registration} ({v.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-price`}>Price override (minor units)</Label>
                    <Input
                      id={`${formId}-price`}
                      value={form.priceOverrideMinor}
                      onChange={set('priceOverrideMinor')}
                      placeholder="Leave blank to use route base price"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-notes`}>Notes (optional)</Label>
                  <Textarea id={`${formId}-notes`} value={form.notes} onChange={set('notes')} placeholder="Any notes for ops…" />
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
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

