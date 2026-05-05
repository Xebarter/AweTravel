'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HomeAdBanner } from '@/components/site/HomeAdBanner';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  passengers: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function HomeBookingSection() {
  const router = useRouter();
  const { profile } = useAuth();

  const [form, setForm] = useState<HomeSearchState>({
    from: '',
    to: '',
    date: todayISO(),
    passengers: '1',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [routes, setRoutes] = useState<AvailableRoute[] | null>(null);

  const canSearch = Boolean(form.from.trim() && form.to.trim() && form.date);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [form.date]);

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
    <section className="border-b border-border/70 bg-linear-to-b from-primary/5 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Book a trip</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Search routes and book in minutes
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Compare schedules across multiple transport companies and pick the time that works for you.
              </p>
            </div>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Trip details</CardTitle>
                <CardDescription>Enter your route and travel date to see schedules.</CardDescription>
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="home-passengers" className="flex items-center gap-2">
                      <Users className="size-4 text-primary" aria-hidden />
                      Passengers
                    </Label>
                    <Input
                      id="home-passengers"
                      type="number"
                      min={1}
                      max={20}
                      value={form.passengers}
                      onChange={(e) => setForm((p) => ({ ...p, passengers: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" className="h-11 w-full font-semibold shadow-sm sm:w-auto" onClick={() => void runSearch()} disabled={loading}>
                    <Search className="size-4" aria-hidden />
                    {loading ? 'Searching…' : 'Search schedules'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full sm:w-auto"
                    onClick={() => {
                      const params = new URLSearchParams({
                        from: form.from.trim(),
                        to: form.to.trim(),
                        date: form.date,
                      });
                      const url = `/passenger/search?${params.toString()}`;
                      router.prefetch(url);
                      router.push(url);
                    }}
                    disabled={!canSearch}
                  >
                    See full results
                    <ArrowRight className="ml-2 size-4" aria-hidden />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Schedules below come from operator data in the database. You can book without an account; sign in to manage all your trips in one place.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Routes & schedules</h3>
                <p className="text-sm text-muted-foreground">
                  {routes ? (
                    <>
                      Showing <span className="font-medium text-foreground">{routes.length}</span> option{routes.length === 1 ? '' : 's'}.
                    </>
                  ) : (
                    'Loading schedules from the database…'
                  )}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                {isApprovedTransporter ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/transporter/routes">Manage routes</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/transporter/schedules">Manage schedules</Link>
                    </Button>
                  </div>
                ) : null}
                <Badge variant="secondary" className="w-fit font-normal bg-primary/10 text-primary">
                  Database
                </Badge>
              </div>
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
                    <p className="text-base font-semibold text-foreground">No schedules found</p>
                    <p className="text-sm text-muted-foreground">Try different cities or another date.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void showAllRoutes()}
                    className="w-full sm:w-auto"
                  >
                    Show all routes
                  </Button>
                </CardContent>
              </Card>
            ) : routes ? (
              <ul className="space-y-4" aria-label="Available schedules">
                {routes.map((r) => (
                  <li key={`${r.trip_id}-${r.schedule.id}`}>
                    <RouteCard route={r} />
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

export default function HomePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (user && router.prefetch) {
      router.prefetch(getHomePathForProfile(profile));
    }
  }, [user, profile, router]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <HomeAdBanner />

      <HomeBookingSection />

      {/* Features Section */}
      <section className="bg-secondary/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose AweTravel?</h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Find Routes</h4>
              <p className="text-muted-foreground">
                Search from hundreds of routes and compare prices across multiple transport companies instantly.
              </p>
            </div>

            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Trusted Partners</h4>
              <p className="text-muted-foreground">
                Book with verified transport companies and enjoy secure, reliable travel experiences.
              </p>
            </div>

            <div className="bg-background rounded-lg p-8 border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Best Prices</h4>
              <p className="text-muted-foreground">
                Get the best rates and enjoy transparent pricing with no hidden charges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Book Your Next Trip?</h3>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers and transport operators who trust AweTravel for safe, convenient, and affordable travel.
          </p>
          {!isLoading && !user && (
            <Link href="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent-dark">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
