import type { Route } from '@/types/transporter-route';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export type RouteCreatePayload = Omit<Route, 'id' | 'createdAt' | 'updatedAt'>;
/** PATCH accepts clearing `notes` with `null` (see `routePayloadToUpdate`). */
export type RouteUpdatePayload = Partial<Omit<RouteCreatePayload, 'notes'>> & {
  notes?: string | null;
};

export async function listTransporterRoutes(): Promise<Route[]> {
  const res = await fetch('/api/transporter/routes');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { routes: Route[] };
  return j.routes;
}

export async function getTransporterRoute(id: string): Promise<Route> {
  const res = await fetch(`/api/transporter/routes/${id}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { route: Route };
  return j.route;
}

export async function createTransporterRoute(payload: RouteCreatePayload): Promise<Route> {
  const res = await fetch('/api/transporter/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { route: Route };
  return j.route;
}

export async function updateTransporterRoute(
  id: string,
  patch: RouteUpdatePayload,
): Promise<Route> {
  const res = await fetch(`/api/transporter/routes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { route: Route };
  return j.route;
}

export async function deleteTransporterRoute(id: string): Promise<void> {
  const res = await fetch(`/api/transporter/routes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}
