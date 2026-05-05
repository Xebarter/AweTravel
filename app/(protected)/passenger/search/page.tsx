'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';
import { PassengerQuickSearch } from '@/components/passenger/PassengerQuickSearch';
import { RouteCard } from '@/components/passenger/RouteCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Bus,
  CalendarDays,
  Compass,
  Filter,
  HeartHandshake,
  MapPin,
} from 'lucide-react';

type SortKey = 'price' | 'duration' | 'departure';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'price', label: 'Lowest price' },
  { value: 'duration', label: 'Shortest trip' },
  { value: 'departure', label: 'Earliest departure' },
];

function formatTripDate(dateStr: string) {
  if (!dateStr.trim()) return null;
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (!isValid(d)) return dateStr;
  return format(d, 'EEEE, MMM d, yyyy');
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      {[1, 2].map((i) => (
        <Card key={i} className="border-border/80 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-10 w-24 shrink-0 sm:self-start" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-y border-border/60 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="mt-4 h-14 w-full rounded-lg" />
            <Skeleton className="mt-4 h-11 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<AvailableRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('price');
  const [companyId, setCompanyId] = useState<string>('all');

  const origin = searchParams.get('from') || '';
  const destination = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const passengers = searchParams.get('passengers') || '1';

  const hasSearchCriteria = Boolean(origin.trim() && destination.trim() && date);
  const formattedDate = formatTripDate(date);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasSearchCriteria) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const qs = new URLSearchParams({ from: origin.trim(), to: destination.trim(), date }).toString();
        const res = await fetch(`/api/passenger/search?${qs}`, { cache: 'no-store' });
        const json = (await res.json()) as {
          success?: boolean;
          data?: AvailableRoute[];
          error?: string;
        };
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to search trips');
        if (cancelled) return;
        setResults(json.data ?? []);
      } catch {
        if (cancelled) return;
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [hasSearchCriteria, origin, destination, date]);

  const companyOptions = (() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const r of results) {
      const id = r.company?.owner_user_id || r.company?.id;
      const name = r.company?.company_name?.trim();
      if (!id || !name) continue;
      if (!byId.has(id)) byId.set(id, { id, name });
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // If the selected company disappears (new search), reset to "all".
  useEffect(() => {
    if (companyId === 'all') return;
    const stillExists = companyOptions.some((c) => c.id === companyId);
    if (!stillExists) setCompanyId('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, results]);

  const filteredResults = results.filter((r) => {
    if (companyId === 'all') return true;
    const id = r.company?.owner_user_id || r.company?.id;
    return id === companyId;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'price') {
      const aPrice = Math.min(...a.available_seats.map((s) => s.base_price));
      const bPrice = Math.min(...b.available_seats.map((s) => s.base_price));
      return aPrice - bPrice;
    }
    if (sortBy === 'duration') {
      return a.route.estimated_duration_minutes - b.route.estimated_duration_minutes;
    }
    return a.schedule.departure_time.localeCompare(b.schedule.departure_time);
  });

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort';

  return (
    <div className="min-h-0 pb-12">
      <div className="relative border-b border-border/80 bg-linear-to-b from-primary/6 via-background to-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Compass className="size-5 shrink-0" aria-hidden />
                <span className="text-sm font-medium tracking-wide">Find your ride</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Search trips</h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Compare operators, times, and fares. Adjust your search anytime below.
              </p>
            </div>
          </div>

          <PassengerQuickSearch
            compact
            className="border-border/80 shadow-md"
            initialFrom={origin}
            initialTo={destination}
            initialDate={date}
            initialPassengers={passengers}
          />

          {hasSearchCriteria ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-normal">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="font-medium text-foreground">{origin}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="font-medium text-foreground">{destination}</span>
              </Badge>
              {formattedDate ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 font-normal">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {formattedDate}
                </Badge>
              ) : null}
              {passengers && passengers !== '1' ? (
                <Badge variant="outline" className="px-3 py-1 font-normal tabular-nums">
                  {passengers} passengers
                </Badge>
              ) : null}
              <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 px-3 py-1 font-normal">
                <Filter className="size-3.5 text-muted-foreground" aria-hidden />
                {sortLabel}
              </Badge>
            </div>
          ) : (
            <Card className="border-border/80 bg-card/60 shadow-xs">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                    <HeartHandshake className="size-6" aria-hidden />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Ready when you are</p>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      Enter a <span className="font-medium text-foreground">From</span>, <span className="font-medium text-foreground">To</span>, and a travel{' '}
                      <span className="font-medium text-foreground">date</span> to see trips.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/passenger/dashboard">Back to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <div className="sticky top-0 z-20 -mx-4 mb-6 rounded-none border-b border-border/70 bg-background/85 px-4 py-4 shadow-xs backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-card/60 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {!loading ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{sortedResults.length}</span>{' '}
                    {sortedResults.length === 1 ? 'trip' : 'trips'} found
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Searching trips…</p>
                )}
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Select value={companyId} onValueChange={setCompanyId} disabled={!hasSearchCriteria || loading}>
                  <SelectTrigger size="sm" className="w-full sm:min-w-[220px] sm:w-auto">
                    <SelectValue placeholder="Travel company">
                      {companyId === 'all' ? 'All companies' : companyOptions.find((c) => c.id === companyId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companyOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger size="sm" className="w-full sm:min-w-[200px] sm:w-auto">
                    <SelectValue placeholder="Sort by">{sortLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasSearchCriteria ? (
                  <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 font-normal">
                    <Filter className="size-3.5 text-muted-foreground" aria-hidden />
                    {companyId === 'all' ? 'All companies' : companyOptions.find((c) => c.id === companyId)?.name ?? 'Company'}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          {loading ? (
            <ResultsSkeleton />
          ) : !hasSearchCriteria ? (
            <Card className="border-border/80 border-dashed">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <MapPin className="size-7" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Start with a quick search</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Enter your origin, destination, and date above. We’ll show the best departures and prices for your day.
                </p>
              </CardContent>
            </Card>
          ) : sortedResults.length === 0 ? (
            <Card className="border-border/80 border-dashed">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Bus className="size-7" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-foreground">No trips match this search</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Try a different date, or select a different travel company.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {companyId !== 'all' ? (
                    <Button type="button" variant="outline" className="font-semibold" onClick={() => setCompanyId('all')}>
                      Clear company filter
                    </Button>
                  ) : null}
                  <Button asChild variant="default" className="font-semibold shadow-sm">
                    <Link href="/passenger/dashboard">Back to dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-4" aria-label="Available trips">
              {sortedResults.map((route) => (
                <li key={route.trip_id}>
                  <RouteCard route={route} travelDate={date} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchPageFallback() {
  return (
    <div className="min-h-[50vh] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <ResultsSkeleton />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchContent />
    </Suspense>
  );
}
