import type { RouteHomeAdApplication } from '@/types/route-home-ad';
import type { RouteHomeAdApplicationCreateInput } from '@/lib/route-home-ads/validate';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === 'string') return j.error;
    if (j.error !== undefined && typeof j.error === 'object') {
      return JSON.stringify(j.error);
    }
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export type RouteHomeAdApplicationWithRoute = RouteHomeAdApplication & {
  route: { id: string; route_code: string; origin: string; destination: string } | null;
};

export async function listRouteHomeAdApplications(): Promise<RouteHomeAdApplicationWithRoute[]> {
  const res = await fetch('/api/transporter/route-home-ad-applications');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { applications: RouteHomeAdApplicationWithRoute[] };
  return j.applications;
}

export async function createRouteHomeAdApplication(
  payload: RouteHomeAdApplicationCreateInput,
): Promise<RouteHomeAdApplicationWithRoute> {
  const res = await fetch('/api/transporter/route-home-ad-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { application: RouteHomeAdApplicationWithRoute };
  return j.application;
}

export async function patchRouteHomeAdApplication(
  id: string,
  patch: Record<string, unknown>,
): Promise<RouteHomeAdApplicationWithRoute> {
  const res = await fetch(`/api/transporter/route-home-ad-applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { application: RouteHomeAdApplicationWithRoute };
  return j.application;
}
