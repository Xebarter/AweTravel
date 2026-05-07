'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeAdBanner } from '@/components/site/HomeAdBanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteCard } from '@/components/passenger/RouteCard';
import type { AvailableRoute } from '@/lib/types';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock3,
  Compass,
  MapPin,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

type HomeSearchState = {
  from: string;
  to: string;
  date: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function HomeBookingSection() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const qFrom = searchParams.get('from');
  const qTo = searchParams.get('to');
  const qDate = searchParams.get('date');

  const [form, setForm] = useState<HomeSearchState>(() => {
    const from = searchParams.get('from')?.trim() ?? '';
    const to = searchParams.get('to')?.trim() ?? '';
    const raw = searchParams.get('date')?.trim() ?? '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayISO();
    return { from, to, date };
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [routes, setRoutes] = useState<AvailableRoute[] | null>(null);

  const canSearch = Boolean(form.from.trim() && form.to.trim() && form.date);

  useEffect(() => {
    const from = qFrom?.trim() ?? '';
    const to = qTo?.trim() ?? '';
    const date = qDate?.trim() ?? '';
    if (!from || !to) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setForm((p) => {
      if (p.from === from && p.to === to && p.date === date) return p;
      return { ...p, from, to, date };
    });
  }, [qFrom, qTo, qDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      setLoading(true);
      try {
        const params = new URLSearchParams({
          date: form.date,
          routeLimit: '40',
          tripLimit: '80',
          maxDeparturesPerRoute: '8',
          sort: 'departure',
        });
        if (form.from.trim() && form.to.trim()) {
          params.set('from', form.from.trim());
          params.set('to', form.to.trim());
        }
        const res = await fetch(`/api/home/discover?${params.toString()}`, { cache: 'no-store' });
        const json = (await res.json()) as { success?: boolean; data?: AvailableRoute[]; error?: string };
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load schedules');
        if (!cancelled) setRoutes(json.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load schedules');
          setRoutes(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.date, form.from, form.to]);

  async function runSearch() {
    if (!canSearch) {
      setError('Enter origin, destination, and date to search.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: form.date,
        routeLimit: '40',
        tripLimit: '80',
        maxDeparturesPerRoute: '8',
        sort: 'departure',
        from: form.from.trim(),
        to: form.to.trim(),
      });
      const res = await fetch(`/api/home/discover?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as { success?: boolean; data?: AvailableRoute[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load schedules');
      setRoutes(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules');
      setRoutes(null);
    } finally {
      setLoading(false);
    }
  }

  async function showAllRoutes() {
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: form.date,
        routeLimit: '30',
        tripLimit: '60',
        maxDeparturesPerRoute: '4',
        sort: 'departure',
      });
      const res = await fetch(`/api/home/discover?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as { success?: boolean; data?: AvailableRoute[]; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load schedules');
      setRoutes(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules');
      setRoutes(null);
    } finally {
      setLoading(false);
    }
  }

  const isApprovedTransporter =
    profile?.user_type === 'transporter' && profile.transporter_approval_status === 'approved';

  const popularPairs = useMemo(() => {
    if (!routes || routes.length === 0) return [] as { from: string; to: string }[];
    const seen = new Set<string>();
    const pairs: { from: string; to: string }[] = [];
    for (const r of routes) {
      const key = `${r.route.origin_city}::${r.route.destination_city}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ from: r.route.origin_city, to: r.route.destination_city });
      if (pairs.length >= 6) break;
    }
    return pairs;
  }, [routes]);

  const formatTravelDate = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  };

  const swapCities = () => {
    setForm((p) => ({ ...p, from: p.to, to: p.from }));
  };

  const applyPair = (from: string, to: string) => {
    setForm((p) => ({ ...p, from, to }));
  };

  return (
    <>
      {/* Hero with search panel */}
      <section
        id="book"
        className="scroll-mt-20 border-b border-border/70 bg-secondary/35"
      >
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8 lg:pb-12 lg:pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Book trips <span className="text-accent">fast</span>
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
              Compare departures and reserve your seat in seconds.
            </p>
          </div>

          {/* Search panel */}
          <div className="relative mx-auto mt-6 max-w-5xl sm:mt-8">
            <Card className="border-border/60 bg-card/95 shadow-xl shadow-primary/5 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-5">
                {error ? (
                  <Alert variant="destructive" className="mb-4 border-destructive/40">
                    <AlertTitle>Could not search</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] lg:items-end lg:gap-2.5">
                  {/* From */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="home-from"
                      className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      From
                    </Label>
                    <div className="flex h-12 items-center gap-2 rounded-lg border border-border/80 bg-background pl-3 pr-2 transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                      <Input
                        id="home-from"
                        placeholder="Departure city"
                        value={form.from}
                        onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                        className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* To */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="home-to"
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        To
                      </Label>
                      <button
                        type="button"
                        onClick={swapCities}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Swap origin and destination"
                      >
                        <ArrowLeftRight className="size-3" aria-hidden />
                        Swap
                      </button>
                    </div>
                    <div className="flex h-12 items-center gap-2 rounded-lg border border-border/80 bg-background pl-3 pr-2 transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                      <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
                      <Input
                        id="home-to"
                        placeholder="Destination city"
                        value={form.to}
                        onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                        className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="home-date"
                      className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Date
                    </Label>
                    <div className="flex h-12 items-center gap-2 rounded-lg border border-border/80 bg-background pl-3 pr-2 transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                      <Calendar className="size-4 shrink-0 text-primary" aria-hidden />
                      <Input
                        id="home-date"
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                        className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <Button
                      type="button"
                      className="h-12 w-full gap-2 px-6 text-sm font-semibold shadow-sm sm:px-8"
                      onClick={() => void runSearch()}
                      disabled={loading}
                    >
                      <Search className="size-4" aria-hidden />
                      {loading ? 'Searching…' : 'Search trips'}
                    </Button>
                  </div>
                </div>

                {popularPairs.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Compass className="size-3.5 text-primary" aria-hidden />
                      Popular today
                    </span>
                    {popularPairs.map((p) => (
                      <button
                        key={`${p.from}-${p.to}`}
                        type="button"
                        onClick={() => applyPair(p.from, p.to)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
                      >
                        <span className="truncate">{p.from}</span>
                        <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                        <span className="truncate">{p.to}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="border-b border-border/70 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Available departures
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  'Loading the latest schedules…'
                ) : routes ? (
                  <>
                    <span className="font-medium text-foreground">{routes.length}</span>
                    {routes.length === 1 ? ' option' : ' options'}
                    {form.from.trim() && form.to.trim() ? (
                      <>
                        {' for '}
                        <span className="font-medium text-foreground">{form.from}</span>
                        <span className="px-1 text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">{form.to}</span>
                      </>
                    ) : (
                      ' across all routes'
                    )}
                    <span className="px-1 text-muted-foreground">·</span>
                    <span className="font-medium text-foreground">{formatTravelDate(form.date)}</span>
                  </>
                ) : (
                  ''
                )}
              </p>
            </div>
            {isApprovedTransporter ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/transporter/routes">My routes</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/transporter/schedules">My schedules</Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 sm:mt-8">
            {loading ? (
              <div className="grid gap-4 sm:gap-5">
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
              </div>
            ) : routes && routes.length === 0 ? (
              <Card className="border-dashed border-border/80 bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="size-5" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">No matching trips</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Try a different city pair or pick another travel date. We&rsquo;ll show every
                      available departure.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => void showAllRoutes()}>
                    Browse all departures
                  </Button>
                </CardContent>
              </Card>
            ) : routes ? (
              <ul
                className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start"
                aria-label="Available schedules"
              >
                {routes.map((r) => (
                  <li key={`${r.trip_id}-${r.schedule.id}`}>
                    <RouteCard route={r} travelDate={form.date} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function HomeBookingSectionFallback() {
  return (
    <>
      <section className="border-b border-border/70 bg-secondary/35">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-14 lg:pt-20">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <Skeleton className="mx-auto h-6 w-56 rounded-full" />
            <Skeleton className="mx-auto h-10 w-full max-w-xl" />
            <Skeleton className="mx-auto h-4 w-full max-w-md" />
          </div>
          <div className="mx-auto mt-8 max-w-5xl sm:mt-10">
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        </div>
      </section>
      <section className="border-b border-border/70 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Skeleton className="h-7 w-64" />
          <div className="mt-6 grid gap-4 sm:gap-5">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (user && router.prefetch) {
      router.prefetch(getHomePathForProfile(profile, user));
    }
  }, [user, profile, router]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <HomeAdBanner />

      <Suspense fallback={<HomeBookingSectionFallback />}>
        <HomeBookingSection />
      </Suspense>

      <section className="border-b border-border bg-secondary/40 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Why AweTravel
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              A booking experience built around trust
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              From comparing operators to confirming a seat, every step is designed to be quick,
              clear, and reliable.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                <MapPin className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">Routes in one place</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Search and compare departures from participating operators across major cities.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 transition group-hover:bg-accent/15">
                <BadgeCheck className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">Verified operators</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Travel with approved transport companies that meet our verification standards.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                <Wallet className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">Clear pricing</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                See fares upfront with no hidden fees before you confirm your seat.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 transition group-hover:bg-accent/15">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">Secure checkout</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Pay with confidence — encrypted transactions and instant booking confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {!isLoading && !user ? (
        <section className="bg-primary py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Badge
              variant="outline"
              className="mx-auto inline-flex border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:text-xs"
            >
              Free account · Faster checkout
            </Badge>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Travel made simple from search to seat
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-white/80 sm:text-base">
              Create a free account to save trips, manage upcoming bookings, and check in faster
              every time you travel.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-accent px-6 font-semibold text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
                >
                  Create your account
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link
                href="#book"
                className="text-sm font-medium text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Browse trips first
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
