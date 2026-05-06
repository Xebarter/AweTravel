'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeAdBanner } from '@/components/site/HomeAdBanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteCard } from '@/components/passenger/RouteCard';
import type { AvailableRoute } from '@/lib/types';
import { ArrowRight, Calendar, MapPin, Search, TrendingUp, Users } from 'lucide-react';

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

  return (
    <section
      id="book"
      className="border-b border-border/70 bg-linear-to-b from-primary/5 via-background to-background scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Find a trip
              </h2>
              <p className="text-sm text-muted-foreground">
                Origin, destination, and date.
              </p>
            </div>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error ? (
                  <Alert variant="destructive" className="border-destructive/40">
                    <AlertTitle>Could not search</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="home-from" className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      From
                    </Label>
                    <Input
                      id="home-from"
                      placeholder="Departure city"
                      value={form.from}
                      onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                      className="h-11"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home-to" className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      To
                    </Label>
                    <Input
                      id="home-to"
                      placeholder="Destination city"
                      value={form.to}
                      onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                      className="h-11"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="home-date" className="flex items-center gap-2">
                      <Calendar className="size-4 text-primary" aria-hidden />
                      Date
                    </Label>
                    <Input
                      id="home-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" className="h-11 w-full font-semibold shadow-sm sm:w-auto" onClick={() => void runSearch()} disabled={loading}>
                    <Search className="size-4" aria-hidden />
                    {loading ? 'Searching…' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Results</h3>
                <p className="text-sm text-muted-foreground">
                  {routes ? (
                    <>
                      <span className="font-medium text-foreground">{routes.length}</span>
                      {routes.length === 1 ? ' option' : ' options'}
                    </>
                  ) : (
                    'Loading…'
                  )}
                </p>
              </div>
              {isApprovedTransporter ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/transporter/routes">Routes</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/transporter/schedules">Schedules</Link>
                  </Button>
                </div>
              ) : null}
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : routes && routes.length === 0 ? (
              <Card className="border-dashed border-border/80 bg-muted/20">
                <CardContent className="flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">No results</p>
                    <p className="text-sm text-muted-foreground">Adjust route or date.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void showAllRoutes()}
                    className="w-full sm:w-auto"
                  >
                    Browse all
                  </Button>
                </CardContent>
              </Card>
            ) : routes ? (
              <ul className="space-y-4" aria-label="Available schedules">
                {routes.map((r) => (
                  <li key={`${r.trip_id}-${r.schedule.id}`}>
                    <RouteCard route={r} travelDate={form.date} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeBookingSectionFallback() {
  return (
    <section className="border-b border-border/70 bg-linear-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-xl lg:col-span-5" />
          <Skeleton className="h-96 rounded-xl lg:col-span-7" />
        </div>
      </div>
    </section>
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

      <section className="border-t border-border bg-secondary/30 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-lg font-semibold tracking-tight text-foreground mb-10">
            For travelers and operators
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <MapPin className="h-5 w-5 text-accent" />
              </div>
              <h4 className="font-semibold mb-1.5">Routes in one place</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Search and compare departures from participating operators.
              </p>
            </div>

            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <h4 className="font-semibold mb-1.5">Verified operators</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Book with approved transport companies on the platform.
              </p>
            </div>

            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <h4 className="font-semibold mb-1.5">Clear pricing</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See fares upfront before you confirm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {!isLoading && !user ? (
        <section className="bg-primary text-white py-14">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-white/90 mb-6">
              Save bookings and preferences with a free account.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent-dark">
                Sign up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
