'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DepartureDialog, type DeparturePayload, type ExistingDeparture } from '@/components/transporter/DepartureDialog';
import { listTransporterRoutes } from '@/lib/transporter-routes/client';
import { listTransporterVehicles } from '@/lib/transporter-vehicles/client';
import type { Route } from '@/types/transporter-route';
import type { Vehicle } from '@/types/transporter-vehicle';

type DepartureRow = {
  id: string;
  route_id: string;
  departure_time: string;
  days_of_week: number;
  status: 'active' | 'paused';
  vehicle_id: string | null;
  route?: { route_code: string; origin: string; destination: string };
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<DepartureRow[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExistingDeparture | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [depsRes, rts, vhs] = await Promise.all([
        fetch('/api/transporter/departures'),
        listTransporterRoutes().catch(() => [] as Route[]),
        listTransporterVehicles().catch(() => [] as Vehicle[]),
      ]);
      const res = depsRes;
      if (!res.ok) throw new Error(await readError(res));
      const j = (await res.json()) as { departures: DepartureRow[] };
      setSchedules(j.departures ?? []);
      setRoutes(rts);
      setVehicles(vhs);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredSchedules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return schedules.filter((s) => {
      if (!q) return true;
      const routeLabel = `${s.route?.origin ?? ''} ${s.route?.destination ?? ''}`.toLowerCase();
      const code = (s.route?.route_code ?? '').toLowerCase();
      return routeLabel.includes(q) || code.includes(q) || s.departure_time.toLowerCase().includes(q);
    });
  }, [schedules, searchTerm]);

  const handleDelete = (id: string) => {
    void (async () => {
      try {
        const res = await fetch(`/api/transporter/departures/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await readError(res));
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        console.error(e);
      } finally {
        setShowDeleteConfirm(null);
      }
    })();
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: DepartureRow) => {
    setEditing({
      id: row.id,
      routeId: row.route_id,
      vehicleId: row.vehicle_id ?? null,
      departureTime: row.departure_time,
      daysOfWeek: row.days_of_week,
      status: row.status,
      priceOverrideMinor: null,
      notes: null,
    });
    setDialogOpen(true);
  };

  const submitDeparture = async (payload: DeparturePayload, id?: string) => {
    const body = id
      ? {
          vehicleId: payload.vehicleId,
          departureTime: payload.departureTime,
          daysOfWeek: payload.daysOfWeek,
          status: payload.status,
          priceOverrideMinor: payload.priceOverrideMinor,
          notes: payload.notes,
        }
      : payload;
    const res = await fetch(id ? `/api/transporter/departures/${id}` : '/api/transporter/departures', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readError(res));
    await reload();
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-linear-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Schedule Management</h1>
            <p className="text-white/80 mt-1">Manage trip schedules and frequencies</p>
          </div>
          <Button className="bg-accent hover:bg-accent-dark gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {loadError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}{' '}
            <button className="underline" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : null}

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search by route name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        {/* Schedules List */}
        {loading ? (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center text-muted-foreground">Loading schedules…</CardContent>
          </Card>
        ) : filteredSchedules.length > 0 ? (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <Card key={schedule.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - Schedule Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          schedule.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {schedule.status === 'active' ? 'Active' : 'Paused'}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{schedule.route?.route_code ?? '—'}</p>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-medium">
                          {schedule.days_of_week}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {schedule.route ? `${schedule.route.origin} - ${schedule.route.destination}` : '—'}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Departure</p>
                          <p className="font-medium text-foreground">{schedule.departure_time}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Arrival</p>
                          <p className="font-medium text-foreground">—</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Days</p>
                          <p className="font-medium text-foreground text-xs">{schedule.days_of_week}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => openEdit(schedule)}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === schedule.id && (
                    <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive mb-3">
                        Are you sure you want to delete this schedule?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No schedules found</p>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first schedule to start operations'}
              </p>
              <Button className="bg-accent hover:bg-accent-dark gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <DepartureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        routes={routes}
        vehicles={vehicles}
        initial={editing}
        onSubmit={submitDeparture}
      />
    </div>
  );
}
