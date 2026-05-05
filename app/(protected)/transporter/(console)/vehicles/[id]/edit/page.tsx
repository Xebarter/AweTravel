'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EditVehicleForm } from '@/components/transporter/EditVehicleForm';
import {
  getTransporterVehicle,
  listTransporterVehicles,
  updateTransporterVehicle,
} from '@/lib/transporter-vehicles/client';
import type { Vehicle } from '@/types/transporter-vehicle';

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [plates, setPlates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [v, all] = await Promise.all([getTransporterVehicle(id), listTransporterVehicles()]);
      setVehicle(v);
      setPlates(all.map((x) => x.registration));
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
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        <Card className="animate-pulse border-border/80">
          <CardContent className="h-96 p-6" />
        </Card>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Button type="button" variant="ghost" className="gap-2" asChild>
        <Link href={`/transporter/vehicles/${vehicle.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to vehicle
        </Link>
      </Button>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xl tracking-tight">Edit vehicle</CardTitle>
          <CardDescription>
            Update registration, operations data, insurance, and notes. Changes are saved to your fleet database.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <EditVehicleForm
            vehicle={vehicle}
            existingPlates={plates}
            onCancel={() => router.push(`/transporter/vehicles/${vehicle.id}`)}
            onSave={async (payload) => {
              const updated = await updateTransporterVehicle(vehicle.id, payload);
              setVehicle(updated);
              router.push(`/transporter/vehicles/${vehicle.id}`);
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
