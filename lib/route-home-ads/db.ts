import type { HomeBanner, RouteHomeAdApplication, RouteHomeAdApplicationStatus } from '@/types/route-home-ad';

export type RouteHomeAdApplicationRow = {
  id: string;
  applicant_user_id: string;
  route_id: string;
  headline: string;
  subheadline: string | null;
  cta_label: string;
  target_url: string;
  image_url: string;
  status: RouteHomeAdApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type HomeBannerRow = {
  id: string;
  source_application_id: string | null;
  image_url: string;
  title: string;
  subtitle: string | null;
  cta_label: string;
  link_url: string;
  sponsored_label: string | null;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToRouteHomeAdApplication(row: RouteHomeAdApplicationRow): RouteHomeAdApplication {
  return {
    id: row.id,
    applicantUserId: row.applicant_user_id,
    routeId: row.route_id,
    headline: row.headline,
    subheadline: row.subheadline,
    ctaLabel: row.cta_label,
    targetUrl: row.target_url,
    imageUrl: row.image_url,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToHomeBanner(row: HomeBannerRow): HomeBanner {
  return {
    id: row.id,
    sourceApplicationId: row.source_application_id,
    imageUrl: row.image_url,
    title: row.title,
    subtitle: row.subtitle,
    ctaLabel: row.cta_label,
    linkUrl: row.link_url,
    sponsoredLabel: row.sponsored_label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function applicationInsertFromCreate(
  applicantUserId: string,
  input: {
    routeId: string;
    headline: string;
    subheadline?: string | null;
    ctaLabel: string;
    targetUrl: string;
    imageUrl: string;
    status: RouteHomeAdApplicationStatus;
  },
): Record<string, unknown> {
  return {
    applicant_user_id: applicantUserId,
    route_id: input.routeId,
    headline: input.headline,
    subheadline: input.subheadline ?? null,
    cta_label: input.ctaLabel,
    target_url: input.targetUrl,
    image_url: input.imageUrl,
    status: input.status,
  };
}
