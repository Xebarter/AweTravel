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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Bus,
  CalendarDays,
  CircleX,
  Filter,
  HeartHandshake,
  MapPin,
  SlidersHorizontal,
  Sparkles,
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

function SearchFiltersBody({
  sortBy,
  onSortChange,
  priceBands,
  onTogglePriceBand,
  onReset,
  className,
}: {
  sortBy: SortKey;
  onSortChange: (v: SortKey) => void;
  priceBands: { low: boolean; mid: boolean; high: boolean };
  onTogglePriceBand: (band: keyof typeof priceBands) => void;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Refine results</h3>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={onReset}>
          <CircleX className="size-4" aria-hidden />
          Reset
        </Button>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-medium text-foreground">Sort by</h4>
        <RadioGroup
          value={sortBy}
          onValueChange={(v) => onSortChange(v as SortKey)}
          className="grid gap-2"
        >
          {SORT_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <RadioGroupItem value={opt.value} id={`sort-${opt.value}`} />
              <Label htmlFor={`sort-${opt.value}`} className="cursor-pointer font-normal text-muted-foreground">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h4 className="mb-3 text-sm font-medium text-foreground">Price range</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox id="pr-low" checked={priceBands.low} onCheckedChange={() => onTogglePriceBand('low')} />
            <Label htmlFor="pr-low" className="cursor-pointer font-normal text-muted-foreground">
              Below {formatCurrency(5000)}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pr-mid" checked={priceBands.mid} onCheckedChange={() => onTogglePriceBand('mid')} />
            <Label htmlFor="pr-mid" className="cursor-pointer font-normal text-muted-foreground">
              {formatCurrency(5000)} – {formatCurrency(10000)}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pr-high" checked={priceBands.high} onCheckedChange={() => onTogglePriceBand('high')} />
            <Label htmlFor="pr-high" className="cursor-pointer font-normal text-muted-foreground">
              Above {formatCurrency(10000)}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceBands, setPriceBands] = useState({ low: true, mid: true, high: true });

  const origin = searchParams.get('from') || '';
  const destination = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const passengers = searchParams.get('passengers') || '1';

  const hasSearchCriteria = Boolean(origin.trim() && destination.trim() && date);
  const formattedDate = formatTripDate(date);

  const mockRoutes: AvailableRoute[] = [
    {
      trip_id: '1',
      route: {
        id: '1',
        company_id: '1',
        route_code: 'LI-001',
        origin_city: origin || 'Lagos',
        destination_city: destination || 'Ibadan',
        distance_km: 125,
        estimated_duration_minutes: 180,
        route_type: 'bus',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      schedule: {
        id: '1',
        route_id: '1',
        departure_time: '08:00 AM',
        arrival_time: '11:00 AM',
        days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
      vehicle: {
        id: '1',
        company_id: '1',
        vehicle_registration: 'LG-2024-001',
        vehicle_type: 'bus',
        capacity: 50,
        current_status: 'active',
        created_at: new Date().toISOString(),
      },
      company: {
        id: '1',
        owner_user_id: '1',
        company_name: 'Premium Travel Ltd',
        registration_number: 'REG-2020-001',
        license_number: 'LIC-2020-001',
        verified: true,
        contact_email: 'info@premiumtravel.com',
        contact_phone: '+234 700 000 0001',
        headquarters_location: 'Lagos',
        created_at: new Date().toISOString(),
      },
      available_seats: Array.from({ length: 35 }, (_, i) => ({
        id: `seat-${i + 1}`,
        vehicle_id: '1',
        seat_number: `A${String(i + 1).padStart(2, '0')}`,
        seat_type: i < 5 ? 'premium' : i < 6 ? 'handicap' : 'regular',
        base_price: i < 5 ? 7500 : 5000,
        created_at: new Date().toISOString(),
      })),
      total_seats: 50,
      booked_seats: 15,
    },
    {
      trip_id: '2',
      route: {
        id: '2',
        company_id: '2',
        route_code: 'LI-002',
        origin_city: origin || 'Lagos',
        destination_city: destination || 'Ibadan',
        distance_km: 125,
        estimated_duration_minutes: 180,
        route_type: 'bus',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      schedule: {
        id: '2',
        route_id: '2',
        departure_time: '02:00 PM',
        arrival_time: '05:00 PM',
        days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
      vehicle: {
        id: '2',
        company_id: '2',
        vehicle_registration: 'LG-2024-002',
        vehicle_type: 'bus',
        capacity: 45,
        current_status: 'active',
        created_at: new Date().toISOString(),
      },
      company: {
        id: '2',
        owner_user_id: '2',
        company_name: 'Safe Journey Coaches',
        registration_number: 'REG-2021-002',
        license_number: 'LIC-2021-002',
        verified: true,
        contact_email: 'info@safejourneycoaches.com',
        contact_phone: '+234 700 000 0002',
        headquarters_location: 'Lagos',
        created_at: new Date().toISOString(),
      },
      available_seats: Array.from({ length: 28 }, (_, i) => ({
        id: `seat-${i + 1}`,
        vehicle_id: '2',
        seat_number: `B${String(i + 1).padStart(2, '0')}`,
        seat_type: i < 4 ? 'premium' : 'regular',
        base_price: i < 4 ? 6500 : 4500,
        created_at: new Date().toISOString(),
      })),
      total_seats: 45,
      booked_seats: 17,
    },
  ];

  useEffect(() => {
    // In this repo, routes are still mocked. Keep the UX realistic by
    // only showing results once the user provided criteria.
    setLoading(true);
    const t = setTimeout(() => {
      setResults(hasSearchCriteria ? mockRoutes : []);
      setLoading(false);
    }, hasSearchCriteria ? 450 : 0);
    return () => clearTimeout(t);
  }, [hasSearchCriteria, origin, destination, date]);

  const filteredResults = results.filter((r) => {
    if (r.available_seats.length === 0) return false;
    const minPrice = Math.min(...r.available_seats.map((s) => s.base_price));
    const isLow = minPrice < 5000;
    const isMid = minPrice >= 5000 && minPrice <= 10000;
    const isHigh = minPrice > 10000;
    return (priceBands.low && isLow) || (priceBands.mid && isMid) || (priceBands.high && isHigh);
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
  const activePriceLabels = [
    priceBands.low ? `Below ${formatCurrency(5000)}` : null,
    priceBands.mid ? `${formatCurrency(5000)}–${formatCurrency(10000)}` : null,
    priceBands.high ? `Above ${formatCurrency(10000)}` : null,
  ].filter(Boolean) as string[];

  const resetFilters = () => {
    setSortBy('price');
    setPriceBands({ low: true, mid: true, high: true });
  };

  return (
    <div className="min-h-0 pb-12">
      <div className="relative border-b border-border/80 bg-linear-to-b from-primary/6 via-background to-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5 shrink-0" aria-hidden />
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
        <div className="grid gap-8 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <Card className="sticky top-16 border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Filter className="size-4 text-primary" aria-hidden />
                  Filters
                </CardTitle>
                <CardDescription>Narrow results by price and amenities</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchFiltersBody
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  priceBands={priceBands}
                  onTogglePriceBand={(band) => setPriceBands((p) => ({ ...p, [band]: !p[band] }))}
                  onReset={resetFilters}
                />
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-9">
            <div className="mb-6 rounded-xl border border-border/70 bg-card/60 px-4 py-4 shadow-xs backdrop-blur sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="lg:hidden">
                        <SlidersHorizontal className="size-4" aria-hidden />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full gap-0 overflow-y-auto sm:max-w-md">
                      <SheetHeader className="text-left">
                        <SheetTitle>Refine trips</SheetTitle>
                        <SheetDescription>Sort and filter to find the best option</SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 px-1">
                        <SearchFiltersBody
                          sortBy={sortBy}
                          onSortChange={setSortBy}
                          priceBands={priceBands}
                          onTogglePriceBand={(band) => setPriceBands((p) => ({ ...p, [band]: !p[band] }))}
                          onReset={resetFilters}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {!loading ? (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{sortedResults.length}</span>{' '}
                      {sortedResults.length === 1 ? 'trip' : 'trips'} found
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Searching trips…</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger size="sm" className="min-w-[200px]">
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
                      {activePriceLabels.length === 3 ? 'Any price' : activePriceLabels.join(', ')}
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
                    Try a different date, or reset filters to widen the price range.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" variant="outline" className="font-semibold" onClick={resetFilters}>
                      Reset filters
                    </Button>
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
                    <RouteCard route={route} />
                  </li>
                ))}
              </ul>
            )}
          </div>
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
