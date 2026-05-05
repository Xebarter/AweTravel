'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ExternalLink,
  ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Inbox,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  createAdminHomeBanner,
  deleteAdminHomeBanner,
  listAdminHomeBanners,
  listAdminRouteHomeAdApplications,
  patchAdminHomeBanner,
  reviewRouteHomeAdApplication,
  type AdminRouteHomeAdApplication,
} from '@/lib/route-home-ads/admin-client';
import type { HomeBanner } from '@/types/route-home-ad';
import { cn } from '@/lib/utils';

type AppFilter = 'all' | 'pending_review' | 'draft' | 'approved' | 'rejected' | 'withdrawn';

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

function applicationStatusClass(status: AdminRouteHomeAdApplication['status']): string {
  switch (status) {
    case 'pending_review':
      return 'border-amber-500/25 bg-amber-500/[0.08] text-amber-900 dark:text-amber-200';
    case 'approved':
      return 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-200';
    case 'rejected':
      return 'border-destructive/25 bg-destructive/[0.06] text-destructive dark:text-red-300';
    case 'draft':
      return 'border-border bg-muted/60 text-muted-foreground';
    case 'withdrawn':
      return 'border-border bg-muted/40 text-muted-foreground';
    default:
      return 'border-border bg-muted/50';
  }
}

function bannerLifecycle(b: HomeBanner): 'live' | 'scheduled' | 'ended' | 'paused' {
  if (!b.isActive) return 'paused';
  const now = Date.now();
  const start = new Date(b.startsAt).getTime();
  const end = b.endsAt ? new Date(b.endsAt).getTime() : null;
  if (now < start) return 'scheduled';
  if (end !== null && now > end) return 'ended';
  return 'live';
}

function lifecycleBadgeClass(phase: ReturnType<typeof bannerLifecycle>): string {
  switch (phase) {
    case 'live':
      return 'border-emerald-500/30 bg-emerald-500/[0.1] text-emerald-800 dark:text-emerald-300';
    case 'scheduled':
      return 'border-sky-500/30 bg-sky-500/[0.08] text-sky-900 dark:text-sky-200';
    case 'ended':
      return 'border-border bg-muted text-muted-foreground';
    case 'paused':
      return 'border-amber-500/25 bg-amber-500/[0.08] text-amber-900 dark:text-amber-200';
    default:
      return '';
  }
}

function formatShortDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-24 shrink-0 sm:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function FormSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h3>
  );
}

type BannerFieldProps = {
  disabled: boolean;
  bfTitle: string;
  setBfTitle: (v: string) => void;
  bfSubtitle: string;
  setBfSubtitle: (v: string) => void;
  bfCta: string;
  setBfCta: (v: string) => void;
  bfLink: string;
  setBfLink: (v: string) => void;
  bfImage: string;
  setBfImage: (v: string) => void;
  bfSponsored: string;
  setBfSponsored: (v: string) => void;
  bfStarts: string;
  setBfStarts: (v: string) => void;
  bfEnds: string;
  setBfEnds: (v: string) => void;
  bfSort: string;
  setBfSort: (v: string) => void;
  bfActive: boolean;
  setBfActive: (v: boolean) => void;
  showPreview?: boolean;
};

function HomeBannerFormFields({
  disabled,
  bfTitle,
  setBfTitle,
  bfSubtitle,
  setBfSubtitle,
  bfCta,
  setBfCta,
  bfLink,
  setBfLink,
  bfImage,
  setBfImage,
  bfSponsored,
  setBfSponsored,
  bfStarts,
  setBfStarts,
  bfEnds,
  setBfEnds,
  bfSort,
  setBfSort,
  bfActive,
  setBfActive,
  showPreview,
}: BannerFieldProps) {
  const inputClass = 'h-10 border-border/80 bg-background shadow-sm transition-shadow focus-visible:ring-primary/20';
  const canPreview = Boolean(showPreview && bfImage.trim() && /^https?:\/\//i.test(bfImage.trim()));

  return (
    <div className="grid gap-8 py-1">
      <div className="space-y-4">
        <FormSectionTitle>Creative</FormSectionTitle>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Title</Label>
            <Input
              value={bfTitle}
              onChange={(e) => setBfTitle(e.target.value)}
              disabled={disabled}
              className={inputClass}
              placeholder="Headline shown on the home hero"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Subtitle</Label>
            <Textarea
              value={bfSubtitle}
              onChange={(e) => setBfSubtitle(e.target.value)}
              rows={2}
              disabled={disabled}
              className={cn(inputClass, 'min-h-18 resize-none')}
              placeholder="Supporting line (optional)"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">CTA label</Label>
              <Input
                value={bfCta}
                onChange={(e) => setBfCta(e.target.value)}
                disabled={disabled}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Sponsored label</Label>
              <Input
                value={bfSponsored}
                onChange={(e) => setBfSponsored(e.target.value)}
                disabled={disabled}
                className={inputClass}
                placeholder="e.g. Ad · Partner"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Destination URL</Label>
            <Input
              value={bfLink}
              onChange={(e) => setBfLink(e.target.value)}
              disabled={disabled}
              className={cn(inputClass, 'font-mono text-xs')}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Image URL</Label>
            <Input
              value={bfImage}
              onChange={(e) => setBfImage(e.target.value)}
              disabled={disabled}
              className={cn(inputClass, 'font-mono text-xs')}
              placeholder="https://…"
            />
            {canPreview ? (
              <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bfImage.trim()}
                  alt=""
                  className="aspect-21/9 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-4">
        <FormSectionTitle>Schedule & placement</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Starts</Label>
            <Input
              type="datetime-local"
              value={bfStarts}
              onChange={(e) => setBfStarts(e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Ends (optional)</Label>
            <Input
              type="datetime-local"
              value={bfEnds}
              onChange={(e) => setBfEnds(e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Sort order</Label>
          <Input
            type="number"
            value={bfSort}
            onChange={(e) => setBfSort(e.target.value)}
            disabled={disabled}
            className={cn(inputClass, 'max-w-32 tabular-nums')}
          />
          <p className="text-xs text-muted-foreground">Lower numbers surface first when multiple banners qualify.</p>
        </div>
      </div>

      <Separator className="bg-border/60" />

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
        <div>
          <Label htmlFor="bf-act-switch" className="cursor-pointer text-foreground">
            Active on site
          </Label>
          <p className="text-xs text-muted-foreground">Inactive banners never render, regardless of schedule.</p>
        </div>
        <Switch
          id="bf-act-switch"
          checked={bfActive}
          onCheckedChange={setBfActive}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

const APP_FILTER_TABS: { id: AppFilter; label: string }[] = [
  { id: 'pending_review', label: 'Pending' },
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

export default function AdminHomeAdsPage() {
  const [tab, setTab] = useState('applications');
  const [appFilter, setAppFilter] = useState<AppFilter>('pending_review');
  const [appSearch, setAppSearch] = useState('');
  const [bannerSearch, setBannerSearch] = useState('');
  const [allApplications, setAllApplications] = useState<AdminRouteHomeAdApplication[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectApp, setRejectApp] = useState<AdminRouteHomeAdApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);
  const [bannerApp, setBannerApp] = useState<AdminRouteHomeAdApplication | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [editBanner, setEditBanner] = useState<HomeBanner | null>(null);
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [bfTitle, setBfTitle] = useState('');
  const [bfSubtitle, setBfSubtitle] = useState('');
  const [bfCta, setBfCta] = useState('');
  const [bfLink, setBfLink] = useState('');
  const [bfImage, setBfImage] = useState('');
  const [bfSponsored, setBfSponsored] = useState('Ad');
  const [bfStarts, setBfStarts] = useState('');
  const [bfEnds, setBfEnds] = useState('');
  const [bfSort, setBfSort] = useState('0');
  const [bfActive, setBfActive] = useState(true);

  const reloadBanners = useCallback(async () => {
    const list = await listAdminHomeBanners();
    setBanners(list);
  }, []);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [apps, bns] = await Promise.all([
        listAdminRouteHomeAdApplications(undefined),
        listAdminHomeBanners(),
      ]);
      setAllApplications(apps);
      setBanners(bns);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const applicationCounts = useMemo(
    () => ({
      all: allApplications.length,
      pending_review: allApplications.filter((a) => a.status === 'pending_review').length,
      draft: allApplications.filter((a) => a.status === 'draft').length,
      approved: allApplications.filter((a) => a.status === 'approved').length,
      rejected: allApplications.filter((a) => a.status === 'rejected').length,
      withdrawn: allApplications.filter((a) => a.status === 'withdrawn').length,
    }),
    [allApplications],
  );

  const applications = useMemo(() => {
    const rows =
      appFilter === 'all'
        ? allApplications
        : allApplications.filter((a) => a.status === appFilter);
    const q = appSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => {
      const name = a.applicant?.full_name?.toLowerCase() ?? '';
      const email = a.applicant?.email?.toLowerCase() ?? '';
      const code = a.route?.route_code?.toLowerCase() ?? '';
      const routeStr = `${a.route?.origin ?? ''} ${a.route?.destination ?? ''}`.toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        code.includes(q) ||
        routeStr.includes(q) ||
        a.headline.toLowerCase().includes(q) ||
        (a.subheadline?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allApplications, appFilter, appSearch]);

  const filteredBanners = useMemo(() => {
    const q = bannerSearch.trim().toLowerCase();
    if (!q) return banners;
    return banners.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.subtitle?.toLowerCase().includes(q) ?? false) ||
        b.linkUrl.toLowerCase().includes(q),
    );
  }, [banners, bannerSearch]);

  const stats = useMemo(() => {
    const liveBanners = banners.filter((b) => bannerLifecycle(b) === 'live').length;
    return {
      pendingQueue: applicationCounts.pending_review,
      applicationsTotal: allApplications.length,
      bannersTotal: banners.length,
      liveBanners,
    };
  }, [applicationCounts, allApplications.length, banners]);

  const bannerIdsBySourceApplication = useMemo(() => {
    const s = new Set<string>();
    for (const b of banners) {
      if (b.sourceApplicationId) s.add(b.sourceApplicationId);
    }
    return s;
  }, [banners]);

  const openBannerDialog = (app: AdminRouteHomeAdApplication) => {
    setActionError(null);
    setBannerApp(app);
    setBfTitle(app.headline);
    setBfSubtitle(app.subheadline ?? '');
    setBfCta(app.ctaLabel);
    setBfLink(app.targetUrl);
    setBfImage(app.imageUrl);
    setBfSponsored('Ad');
    setBfStarts(toLocalInput(new Date().toISOString()));
    setBfEnds('');
    setBfSort('0');
    setBfActive(true);
  };

  const openEditBanner = (b: HomeBanner) => {
    setActionError(null);
    setEditBanner(b);
    setBfTitle(b.title);
    setBfSubtitle(b.subtitle ?? '');
    setBfCta(b.ctaLabel);
    setBfLink(b.linkUrl);
    setBfImage(b.imageUrl);
    setBfSponsored(b.sponsoredLabel ?? 'Ad');
    setBfStarts(toLocalInput(b.startsAt));
    setBfEnds(b.endsAt ? toLocalInput(b.endsAt) : '');
    setBfSort(String(b.sortOrder));
    setBfActive(b.isActive);
  };

  const submitBannerFromApplication = async () => {
    if (!bannerApp) return;
    setBannerBusy(true);
    setActionError(null);
    try {
      if (bannerApp.status === 'pending_review') {
        await reviewRouteHomeAdApplication(bannerApp.id, { decision: 'approve' });
      } else if (bannerApp.status !== 'approved') {
        throw new Error('Only pending or approved applications can be published to the homepage');
      }
      await createAdminHomeBanner({
        sourceApplicationId: bannerApp.id,
        imageUrl: bfImage.trim(),
        title: bfTitle.trim(),
        subtitle: bfSubtitle.trim() || null,
        ctaLabel: bfCta.trim(),
        linkUrl: bfLink.trim(),
        sponsoredLabel: bfSponsored.trim() || null,
        startsAt: fromLocalInput(bfStarts),
        endsAt: bfEnds.trim() ? fromLocalInput(bfEnds) : null,
        sortOrder: Number.parseInt(bfSort, 10) || 0,
        isActive: bfActive,
      });
      setBannerApp(null);
      await reloadAll();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not publish banner');
    } finally {
      setBannerBusy(false);
    }
  };

  const submitEditBanner = async () => {
    if (!editBanner) return;
    setBannerBusy(true);
    setActionError(null);
    try {
      await patchAdminHomeBanner(editBanner.id, {
        imageUrl: bfImage.trim(),
        title: bfTitle.trim(),
        subtitle: bfSubtitle.trim() || null,
        ctaLabel: bfCta.trim(),
        linkUrl: bfLink.trim(),
        sponsoredLabel: bfSponsored.trim() || null,
        startsAt: fromLocalInput(bfStarts),
        endsAt: bfEnds.trim() ? fromLocalInput(bfEnds) : null,
        sortOrder: Number.parseInt(bfSort, 10) || 0,
        isActive: bfActive,
      });
      setEditBanner(null);
      await reloadBanners();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not update banner');
    } finally {
      setBannerBusy(false);
    }
  };

  const submitReject = async () => {
    if (!rejectApp || !rejectReason.trim()) return;
    setRejectBusy(true);
    setActionError(null);
    try {
      await reviewRouteHomeAdApplication(rejectApp.id, {
        decision: 'reject',
        rejectionReason: rejectReason.trim(),
      });
      setRejectApp(null);
      setRejectReason('');
      await reloadAll();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not reject');
    } finally {
      setRejectBusy(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await deleteAdminHomeBanner(deleteBannerId);
      setDeleteBannerId(null);
      await reloadBanners();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleBannerActive = async (b: HomeBanner, next: boolean) => {
    if (next === b.isActive) return;
    setActionError(null);
    try {
      await patchAdminHomeBanner(b.id, { isActive: next });
      await reloadBanners();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Could not update');
    }
  };

  const bannerFieldProps: BannerFieldProps = {
    disabled: bannerBusy,
    bfTitle,
    setBfTitle,
    bfSubtitle,
    setBfSubtitle,
    bfCta,
    setBfCta,
    bfLink,
    setBfLink,
    bfImage,
    setBfImage,
    bfSponsored,
    setBfSponsored,
    bfStarts,
    setBfStarts,
    bfEnds,
    setBfEnds,
    bfSort,
    setBfSort,
    bfActive,
    setBfActive,
  };

  const kpiItems = [
    { key: 'pending', label: 'Pending review', value: stats.pendingQueue },
    { key: 'apps', label: 'Applications', value: stats.applicationsTotal },
    { key: 'live', label: 'Live banners', value: stats.liveBanners },
    { key: 'slots', label: 'Banner slots', value: stats.bannersTotal },
  ] as const;

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Homepage promotions
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                Home ads
              </h1>
              <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
                Review route promotion applications and manage published homepage banners. Operator accounts are under{' '}
                <Link href="/admin/transporters" className="font-medium text-primary underline-offset-4 hover:underline">
                  Transporters
                </Link>
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs font-medium"
              disabled={isLoading}
              onClick={() => void reloadAll()}
            >
              <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} aria-hidden />
              Refresh data
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loadError ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Could not load data</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void reloadAll()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!loadError && actionError ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {kpiItems.map((item) => (
              <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="h-5 w-10" />
                  ) : (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="gap-0">
          <TabsList className="mb-6 h-auto w-full justify-start gap-0 rounded-lg border border-border bg-background p-1 shadow-sm sm:inline-flex sm:w-auto">
            <TabsTrigger
              value="applications"
              className="gap-1.5 rounded-md px-3 py-2 text-xs font-medium data-[state=active]:shadow-sm sm:text-sm"
            >
              <Megaphone className="size-3.5 sm:size-4" aria-hidden />
              Applications
            </TabsTrigger>
            <TabsTrigger
              value="banners"
              className="gap-1.5 rounded-md px-3 py-2 text-xs font-medium data-[state=active]:shadow-sm sm:text-sm"
            >
              <ImageIcon className="size-3.5 sm:size-4" aria-hidden />
              Live banners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="mt-0 outline-none focus-visible:ring-0">
            <Card className="border-border shadow-sm">
              <CardHeader className="space-y-0 border-b border-border bg-background px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Application queue</CardTitle>
                    <CardDescription className="text-xs">
                      Filter by status, then search transporters, routes, or creative copy
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:min-w-[220px] lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email, route, headline…"
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="h-8 border-border bg-background pl-8 text-sm shadow-none"
                      disabled={isLoading}
                      aria-label="Search applications"
                    />
                  </div>
                </div>
                <nav
                  className="mt-4 flex gap-0 overflow-x-auto border-b border-border -mb-px pb-px"
                  role="tablist"
                  aria-label="Application status"
                >
                  {APP_FILTER_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={appFilter === t.id}
                      className={cn(
                        'relative shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                        appFilter === t.id
                          ? 'border-foreground text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setAppFilter(t.id)}
                    >
                      <span>{t.label}</span>
                      {!isLoading ? (
                        <span
                          className={cn(
                            'ml-1.5 tabular-nums text-xs font-normal text-muted-foreground',
                            appFilter === t.id && 'text-foreground/80',
                          )}
                        >
                          {applicationCounts[t.id]}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </nav>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <TableSkeleton rows={5} />
                ) : applications.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-14 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
                      <Inbox className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">No records in this view</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Change the status filter above or adjust your search.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-sm">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/30 text-left">
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Transporter
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Route
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Creative
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Submitted
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Status
                          </th>
                          <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {applications.map((a) => (
                          <tr key={a.id} className="bg-card transition-colors hover:bg-muted/40">
                            <td className="px-6 py-4 align-top">
                              <p className="font-medium text-foreground">{a.applicant?.full_name ?? '—'}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{a.applicant?.email}</p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <p className="font-mono text-xs text-foreground">{a.route?.route_code ?? '—'}</p>
                              <p className="mt-1 text-muted-foreground">
                                {a.route?.origin} <span className="text-border">→</span> {a.route?.destination}
                              </p>
                            </td>
                            <td className="max-w-[280px] px-6 py-4 align-top">
                              <p className="truncate font-medium text-foreground">{a.headline}</p>
                              {a.subheadline ? (
                                <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">{a.subheadline}</p>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 align-top text-muted-foreground tabular-nums">
                              {formatShortDate(a.createdAt)}
                            </td>
                            <td className="px-6 py-4 align-top">
                              <Badge
                                variant="outline"
                                className={cn('border font-medium capitalize shadow-none', applicationStatusClass(a.status))}
                              >
                                {a.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 align-top text-right">
                              {a.status === 'pending_review' ? (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 border-border/80 shadow-sm"
                                    onClick={() => setRejectApp(a)}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-9 gap-1.5 bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                                    onClick={() => openBannerDialog(a)}
                                  >
                                    <Plus className="size-3.5" aria-hidden />
                                    Publish
                                  </Button>
                                </div>
                              ) : a.status === 'approved' && !bannerIdsBySourceApplication.has(a.id) ? (
                                <Button
                                  size="sm"
                                  className="h-9 gap-1.5 bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                                  onClick={() => openBannerDialog(a)}
                                >
                                  <Plus className="size-3.5" aria-hidden />
                                  Finish publish
                                </Button>
                              ) : a.status === 'approved' && bannerIdsBySourceApplication.has(a.id) ? (
                                <span className="text-xs font-medium text-muted-foreground">On homepage</span>
                              ) : (
                                <span className="text-xs tabular-nums text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners" className="mt-0 outline-none focus-visible:ring-0">
            <Card className="border-border shadow-sm">
              <CardHeader className="space-y-4 border-b border-border bg-background px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Published homepage banners</CardTitle>
                    <CardDescription className="text-xs">
                      Slots in their window are eligible for the public carousel. Order by sort order, then creation
                      time.
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:min-w-[220px] lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search title, subtitle, link…"
                      value={bannerSearch}
                      onChange={(e) => setBannerSearch(e.target.value)}
                      className="h-8 border-border bg-background pl-8 text-sm shadow-none"
                      disabled={isLoading}
                      aria-label="Search banners"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <TableSkeleton rows={4} />
                ) : banners.length === 0 ? (
                  <EmptyState
                    icon={ImageIcon}
                    title="No banners in inventory"
                    description="When you approve an application, the banner appears here for scheduling and lifecycle control."
                  />
                ) : filteredBanners.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-14 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
                      <Inbox className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">No banners match search</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">Clear the search box to see all slots.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/30 text-left">
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Placement
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Window
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Order
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            State
                          </th>
                          <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            On air
                          </th>
                          <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Manage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredBanners.map((b) => {
                          const phase = bannerLifecycle(b);
                          return (
                            <tr key={b.id} className="bg-card transition-colors hover:bg-muted/40">
                              <td className="px-6 py-4 align-top">
                                <div className="flex gap-3">
                                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/40">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={b.imageUrl}
                                      alt=""
                                      className="size-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.opacity = '0.15';
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground">{b.title}</p>
                                    {b.subtitle ? (
                                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{b.subtitle}</p>
                                    ) : null}
                                    <a
                                      href={b.linkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                    >
                                      <ExternalLink className="size-3" aria-hidden />
                                      Open target
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 align-top text-muted-foreground">
                                <div className="flex items-start gap-2">
                                  <CalendarClock className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden />
                                  <div className="leading-relaxed">
                                    <p className="tabular-nums text-foreground">{formatShortDate(b.startsAt)}</p>
                                    <p className="text-xs">
                                      {b.endsAt ? formatShortDate(b.endsAt) : 'No end date'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-top tabular-nums text-foreground">{b.sortOrder}</td>
                              <td className="px-6 py-4 align-top">
                                <Badge
                                  variant="outline"
                                  className={cn('border font-medium capitalize shadow-none', lifecycleBadgeClass(phase))}
                                >
                                  {phase}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 align-top">
                                <Switch
                                  checked={b.isActive}
                                  onCheckedChange={(on) => void toggleBannerActive(b, on)}
                                  aria-label={`Toggle ${b.title}`}
                                />
                              </td>
                              <td className="px-6 py-4 align-top text-right">
                                <div className="inline-flex gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-9 text-muted-foreground hover:text-foreground"
                                    title="Edit"
                                    onClick={() => openEditBanner(b)}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-9 text-muted-foreground hover:text-destructive"
                                    title="Delete"
                                    onClick={() => setDeleteBannerId(b.id)}
                                  >
                                    <Trash2 className="size-4" aria-hidden />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!bannerApp} onOpenChange={(o) => !o && setBannerApp(null)}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto border-border/80 p-0 sm:max-w-lg">
          <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-5">
            <DialogTitle className="text-xl font-semibold tracking-tight">Publish homepage banner</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {bannerApp?.status === 'approved'
                ? 'This application is already approved. Create the homepage slot below (for example if a previous publish attempt failed).'
                : 'Fine-tune copy and scheduling. Approving attaches this creative to the live homepage and closes the transporter application.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <HomeBannerFormFields {...bannerFieldProps} showPreview />
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" className="border-border/80" onClick={() => setBannerApp(null)} disabled={bannerBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-36 font-semibold shadow-sm"
              disabled={bannerBusy}
              onClick={() => void submitBannerFromApplication()}
            >
              {bannerBusy
                ? 'Publishing…'
                : bannerApp?.status === 'approved'
                  ? 'Publish to homepage'
                  : 'Publish & approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBanner} onOpenChange={(o) => !o && setEditBanner(null)}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto border-border/80 p-0 sm:max-w-lg">
          <DialogHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-5">
            <DialogTitle className="text-xl font-semibold tracking-tight">Edit banner</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Changes apply on save. Use the toggle in the table for fast on/off without editing the slot.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <HomeBannerFormFields {...bannerFieldProps} showPreview />
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" className="border-border/80" onClick={() => setEditBanner(null)} disabled={bannerBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-32 font-semibold shadow-sm"
              disabled={bannerBusy}
              onClick={() => void submitEditBanner()}
            >
              {bannerBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectApp} onOpenChange={(o) => !o && setRejectApp(null)}>
        <DialogContent className="border-border/80 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Reject application</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Provide a clear reason. Transporters may reference this message when revising and resubmitting.
            </DialogDescription>
          </DialogHeader>
          {rejectApp ? (
            <div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Creative</p>
              <p className="mt-1 font-medium text-foreground">{rejectApp.headline}</p>
              {rejectApp.subheadline ? (
                <p className="mt-1 text-xs text-muted-foreground">{rejectApp.subheadline}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="rej" className="text-foreground">
              Reason for rejection
            </Label>
            <Textarea
              id="rej"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              disabled={rejectBusy}
              className="min-h-28 resize-none border-border/80 shadow-sm"
              placeholder="Policy reference, missing assets, brand guidelines…"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="border-border/80" onClick={() => setRejectApp(null)} disabled={rejectBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="font-semibold"
              disabled={rejectBusy || !rejectReason.trim()}
              onClick={() => void submitReject()}
            >
              {rejectBusy ? 'Rejecting…' : 'Reject application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteBannerId !== null} onOpenChange={(o) => !o && setDeleteBannerId(null)}>
        <AlertDialogContent className="border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Remove this banner?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              It will stop rendering on the public homepage immediately. Historical reporting may still reference the
              slot identifier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy} className="border-border/80">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="font-semibold"
              disabled={deleteBusy}
              onClick={() => void handleDeleteBanner()}
            >
              {deleteBusy ? 'Removing…' : 'Remove banner'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
