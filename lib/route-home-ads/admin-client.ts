import type { HomeBanner, RouteHomeAdApplication } from '@/types/route-home-ad';
import type {
  HomeBannerCreateInput,
  HomeBannerUpdateInput,
  RouteHomeAdApplicationAdminReviewInput,
} from '@/lib/route-home-ads/validate';

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

export type AdminRouteHomeAdApplication = RouteHomeAdApplication & {
  route: { id: string; route_code: string; origin: string; destination: string } | null;
  applicant: { id: string; full_name: string; email: string } | null;
};

export async function listAdminRouteHomeAdApplications(
  status?: string,
): Promise<AdminRouteHomeAdApplication[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`/api/admin/route-home-ad-applications${q}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { applications: AdminRouteHomeAdApplication[] };
  return j.applications;
}

export async function reviewRouteHomeAdApplication(
  id: string,
  body: RouteHomeAdApplicationAdminReviewInput,
): Promise<AdminRouteHomeAdApplication> {
  const res = await fetch(`/api/admin/route-home-ad-applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { application: AdminRouteHomeAdApplication };
  return j.application;
}

export async function listAdminHomeBanners(): Promise<HomeBanner[]> {
  const res = await fetch('/api/admin/home-banners');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { banners: HomeBanner[] };
  return j.banners;
}

export async function createAdminHomeBanner(payload: HomeBannerCreateInput): Promise<HomeBanner> {
  const res = await fetch('/api/admin/home-banners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { banner: HomeBanner };
  return j.banner;
}

export async function patchAdminHomeBanner(
  id: string,
  patch: HomeBannerUpdateInput,
): Promise<HomeBanner> {
  const res = await fetch(`/api/admin/home-banners/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { banner: HomeBanner };
  return j.banner;
}

export async function deleteAdminHomeBanner(id: string): Promise<void> {
  const res = await fetch(`/api/admin/home-banners/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}
