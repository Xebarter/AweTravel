export type RouteHomeAdApplicationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type RouteHomeAdApplication = {
  id: string;
  applicantUserId: string;
  routeId: string;
  headline: string;
  subheadline: string | null;
  ctaLabel: string;
  targetUrl: string;
  imageUrl: string;
  status: RouteHomeAdApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeBanner = {
  id: string;
  sourceApplicationId: string | null;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  linkUrl: string;
  sponsoredLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
