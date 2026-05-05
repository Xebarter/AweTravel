import type { Vehicle } from '@/types/transporter-vehicle';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listTransporterVehicles(): Promise<Vehicle[]> {
  const res = await fetch('/api/transporter/vehicles');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { vehicles: Vehicle[] };
  return j.vehicles;
}

export async function createTransporterVehicle(payload: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const res = await fetch('/api/transporter/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { vehicle: Vehicle };
  return j.vehicle;
}

export async function getTransporterVehicle(id: string): Promise<Vehicle> {
  const res = await fetch(`/api/transporter/vehicles/${id}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { vehicle: Vehicle };
  return j.vehicle;
}

export async function updateTransporterVehicle(
  id: string,
  patch: Partial<Omit<Vehicle, 'id'>>,
): Promise<Vehicle> {
  const res = await fetch(`/api/transporter/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { vehicle: Vehicle };
  return j.vehicle;
}

export async function deleteTransporterVehicle(id: string): Promise<void> {
  const res = await fetch(`/api/transporter/vehicles/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}
