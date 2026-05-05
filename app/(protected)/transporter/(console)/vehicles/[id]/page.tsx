'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bus, Car, Edit, Truck, Van } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getTransporterVehicle } from '@/lib/transporter-vehicles/client';
import type { Vehicle, VehicleStatus } from '@/types/transporter-vehicle';
import { cn } from '@/lib/utils';

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

function formatDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

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

export default function VehicleDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const v = await getTransporterVehicle(id);
      setVehicle(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load vehicle.');
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        <Card className="animate-pulse border-border/80">
          <CardContent className="h-64 p-6" />
        </Card>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <Button type="button" variant="ghost" className="gap-2" asChild>
          <Link href="/transporter/vehicles">
            <ArrowLeft className="h-4 w-4" />
            Back to fleet
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Unable to load vehicle</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error ?? 'Not found.'}</span>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const st = statusStyles[vehicle.status];
  const { Icon, ring } = vehicleVisuals(vehicle.type);

  const rows: { label: string; value: string }[] = [
    { label: 'Registration', value: vehicle.registration },
    { label: 'Class / type', value: vehicle.type },
    { label: 'Seats', value: String(vehicle.capacity) },
    { label: 'Status', value: st.label },
    { label: 'Odometer', value: `${vehicle.mileage.toLocaleString()} km` },
    { label: 'Last service', value: formatDate(vehicle.lastMaintenance) },
    { label: 'In service since', value: formatDate(vehicle.acquisitionDate) },
  ];

  if (vehicle.vin) rows.push({ label: 'VIN', value: vehicle.vin });
  if (vehicle.color) rows.push({ label: 'Color', value: vehicle.color });
  if (vehicle.fuelType) rows.push({ label: 'Fuel / powertrain', value: vehicle.fuelType });
  if (vehicle.nextInspectionDue) rows.push({ label: 'Next inspection', value: formatDate(vehicle.nextInspectionDue) });
  if (vehicle.insurer) rows.push({ label: 'Insurer', value: vehicle.insurer });
  if (vehicle.policyExpires) rows.push({ label: 'Policy renewal', value: formatDate(vehicle.policyExpires) });
  rows.push({ label: 'Wheelchair accessible', value: vehicle.wheelchairAccessible ? 'Yes' : 'No' });
  rows.push({ label: 'GPS / telematics', value: vehicle.gpsTracked !== false ? 'Yes' : 'No' });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" className="w-fit gap-2" asChild>
          <Link href="/transporter/vehicles">
            <ArrowLeft className="h-4 w-4" />
            Back to fleet
          </Link>
        </Button>
        <Button type="button" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={`/transporter/vehicles/${vehicle.id}/edit`}>
            <Edit className="h-4 w-4" />
            Edit vehicle
          </Link>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex flex-wrap items-start gap-4">
            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', ring)} aria-hidden>
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-mono text-2xl tracking-tight">{vehicle.registration}</CardTitle>
                <Badge className={cn('capitalize', st.badge)}>{st.label}</Badge>
              </div>
              <CardDescription className="text-base font-medium text-foreground/80">{vehicle.type}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <dl className="divide-y divide-border/60">
            {rows.map((r) => (
              <div key={r.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[minmax(0,200px)_1fr] sm:gap-8">
                <dt className="text-sm font-medium text-muted-foreground">{r.label}</dt>
                <dd className="text-sm font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
          {vehicle.notes ? (
            <>
              <Separator />
              <div className="px-6 py-4">
                <p className="text-sm font-medium text-muted-foreground">Internal notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{vehicle.notes}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
