'use client';

import type { ChangeEvent, ComponentType, ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Bus, ClipboardList, FileText, MapPin, Shield, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_CAPACITY_BY_CLASS,
  FUEL_TYPE_OPTIONS,
  type Vehicle,
  type VehicleClass,
  type VehicleStatus,
  VEHICLE_CLASS_OPTIONS,
} from '@/types/transporter-vehicle';

export type NewVehiclePayload = Omit<Vehicle, 'id'>;

type FormState = {
  registration: string;
  vin: string;
  /** Stored vehicle class label; may be a legacy/custom value not in `VEHICLE_CLASS_OPTIONS`. */
  type: string;
  capacity: string;
  status: VehicleStatus;
  mileage: string;
  lastMaintenance: string;
  acquisitionDate: string;
  nextInspectionDue: string;
  color: string;
  fuelType: string;
  insurer: string;
  policyExpires: string;
  notes: string;
  wheelchairAccessible: boolean;
  gpsTracked: boolean;
};

function vehicleToFormState(v: Vehicle): FormState {
  return {
    registration: v.registration,
    vin: v.vin ?? '',
    type: v.type,
    capacity: String(v.capacity),
    status: v.status,
    mileage: String(v.mileage),
    lastMaintenance: v.lastMaintenance,
    acquisitionDate: v.acquisitionDate,
    nextInspectionDue: v.nextInspectionDue ?? '',
    color: v.color ?? '',
    fuelType: v.fuelType ?? 'Diesel',
    insurer: v.insurer ?? '',
    policyExpires: v.policyExpires ?? '',
    notes: v.notes ?? '',
    wheelchairAccessible: Boolean(v.wheelchairAccessible),
    gpsTracked: v.gpsTracked !== false,
  };
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
      {children}
    </div>
  );
}

type EditVehicleFormProps = {
  vehicle: Vehicle;
  /** Other vehicles' plates (same list semantics as add dialog). Original plate may stay in this list; it is ignored for duplicate detection. */
  existingPlates: string[];
  onSave: (payload: NewVehiclePayload) => void | Promise<void>;
  onCancel: () => void;
};

export function EditVehicleForm({ vehicle, existingPlates, onSave, onCancel }: EditVehicleFormProps) {
  const formId = useId();
  const originalPlate = useMemo(() => vehicle.registration.trim().toUpperCase(), [vehicle.registration]);
  const [form, setForm] = useState<FormState>(() => vehicleToFormState(vehicle));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(vehicleToFormState(vehicle));
  }, [vehicle]);

  const plateSet = useMemo(
    () =>
      new Set(
        existingPlates
          .map((p) => p.trim().toUpperCase())
          .filter(Boolean)
          .filter((p) => p !== originalPlate),
      ),
    [existingPlates, originalPlate],
  );

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K] | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (value && typeof value === 'object' && 'target' in value) {
        const t = value.target;
        setForm((f) => ({ ...f, [key]: t.value as FormState[K] }));
      } else {
        setForm((f) => ({ ...f, [key]: value as FormState[K] }));
      }
    };

  const handleTypeChange = (value: string) => {
    const cap =
      (VEHICLE_CLASS_OPTIONS as readonly string[]).includes(value) && value in DEFAULT_CAPACITY_BY_CLASS
        ? DEFAULT_CAPACITY_BY_CLASS[value as VehicleClass]
        : Number.parseInt(form.capacity, 10) || 1;
    setForm((f) => ({
      ...f,
      type: value,
      capacity: String(cap),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const registration = form.registration.trim().toUpperCase();
    if (!registration) {
      setSubmitError('Enter a registration or plate number.');
      return;
    }
    if (plateSet.has(registration)) {
      setSubmitError('That plate is already in your fleet.');
      return;
    }

    const capacity = Number.parseInt(form.capacity, 10);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 200) {
      setSubmitError('Seat capacity must be between 1 and 200.');
      return;
    }

    const mileage = Number.parseInt(form.mileage, 10);
    if (!Number.isFinite(mileage) || mileage < 0) {
      setSubmitError('Odometer reading must be zero or greater.');
      return;
    }

    const iso = (d: string) => (d.length === 10 ? d : '');
    if (!iso(form.lastMaintenance)) {
      setSubmitError('Choose a valid last service date.');
      return;
    }
    if (!iso(form.acquisitionDate)) {
      setSubmitError('Choose a valid in-service date.');
      return;
    }

    const payload: NewVehiclePayload = {
      registration,
      type: form.type.trim(),
      capacity,
      status: form.status,
      lastMaintenance: form.lastMaintenance,
      mileage,
      acquisitionDate: form.acquisitionDate,
      vin: form.vin.trim() || undefined,
      color: form.color.trim() || undefined,
      fuelType: form.fuelType || undefined,
      insurer: form.insurer.trim() || undefined,
      policyExpires: form.policyExpires.trim() || undefined,
      nextInspectionDue: form.nextInspectionDue.trim() || undefined,
      notes: form.notes.trim() || undefined,
      wheelchairAccessible: form.wheelchairAccessible || undefined,
      gpsTracked: form.gpsTracked,
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save vehicle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <SectionTitle icon={ClipboardList}>Identity</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-reg`}>
                Registration / plate <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${formId}-reg`}
                required
                autoComplete="off"
                placeholder="e.g. ABC-123-LG"
                className="font-mono uppercase"
                value={form.registration}
                onChange={(e) => setForm((f) => ({ ...f, registration: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-vin`}>VIN (optional)</Label>
              <Input
                id={`${formId}-vin`}
                autoComplete="off"
                placeholder="17-character chassis number"
                maxLength={32}
                value={form.vin}
                onChange={set('vin')}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionTitle icon={Bus}>Classification</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-type`}>Vehicle class</Label>
              <Select value={form.type} onValueChange={(v) => handleTypeChange(v)}>
                <SelectTrigger id={`${formId}-type`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                  {(VEHICLE_CLASS_OPTIONS as readonly string[]).includes(form.type) ? null : (
                    <SelectItem value={form.type}>{form.type}</SelectItem>
                  )}
                  {VEHICLE_CLASS_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-cap`}>
                Seat capacity <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${formId}-cap`}
                inputMode="numeric"
                type="number"
                min={1}
                max={200}
                required
                value={form.capacity}
                onChange={set('capacity')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-fuel`}>Fuel / powertrain</Label>
              <Select value={form.fuelType} onValueChange={(v) => setForm((f) => ({ ...f, fuelType: v }))}>
                <SelectTrigger id={`${formId}-fuel`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                  {FUEL_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-color`}>Exterior color</Label>
              <Input id={`${formId}-color`} placeholder="e.g. White" value={form.color} onChange={set('color')} />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3 sm:col-span-2">
              <Checkbox
                id={`${formId}-wc`}
                checked={form.wheelchairAccessible}
                onCheckedChange={(c) => setForm((f) => ({ ...f, wheelchairAccessible: c === true }))}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor={`${formId}-wc`} className="cursor-pointer font-medium">
                  Wheelchair accessible
                </Label>
                <p className="text-xs font-normal text-muted-foreground">
                  Shown to dispatchers when assigning accessible bookings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionTitle icon={Wrench}>Operations</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-status`}>Fleet status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as VehicleStatus }))}
              >
                <SelectTrigger id={`${formId}-status`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-mile`}>
                Odometer (km) <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${formId}-mile`}
                inputMode="numeric"
                type="number"
                min={0}
                required
                value={form.mileage}
                onChange={set('mileage')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-lm`}>
                Last service <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${formId}-lm`}
                type="date"
                required
                value={form.lastMaintenance}
                onChange={set('lastMaintenance')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ni`}>Next inspection due</Label>
              <Input id={`${formId}-ni`} type="date" value={form.nextInspectionDue} onChange={set('nextInspectionDue')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ad`}>
                In service since <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${formId}-ad`}
                type="date"
                required
                value={form.acquisitionDate}
                onChange={set('acquisitionDate')}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionTitle icon={Shield}>Insurance</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-ins`}>Insurer</Label>
              <Input
                id={`${formId}-ins`}
                placeholder="Insurance company name"
                value={form.insurer}
                onChange={set('insurer')}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-pol`}>Policy renewal date</Label>
              <Input id={`${formId}-pol`} type="date" value={form.policyExpires} onChange={set('policyExpires')} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SectionTitle icon={MapPin}>Tracking</SectionTitle>
          <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
            <Checkbox
              id={`${formId}-gps`}
              checked={form.gpsTracked}
              onCheckedChange={(c) => setForm((f) => ({ ...f, gpsTracked: c === true }))}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={`${formId}-gps`} className="cursor-pointer font-medium">
                GPS / telematics onboard
              </Label>
              <p className="text-xs font-normal text-muted-foreground">
                Used for live fleet maps and delay alerts when integrated.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5 opacity-80" aria-hidden />
            Internal notes
          </div>
          <Textarea
            id={`${formId}-notes`}
            placeholder="Garage location, spare keys, livery notes, driver preferences…"
            rows={3}
            className="resize-y"
            value={form.notes}
            onChange={set('notes')}
          />
        </div>
      </div>

      {submitError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
