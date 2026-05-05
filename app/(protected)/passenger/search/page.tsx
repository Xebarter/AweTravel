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
  Filter,
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
  className,
}: {
  sortBy: SortKey;
  onSortChange: (v: SortKey) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
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
            <Checkbox id="pr-low" defaultChecked />
            <Label htmlFor="pr-low" className="cursor-pointer font-normal text-muted-foreground">
              Below {formatCurrency(5000)}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pr-mid" defaultChecked />
            <Label htmlFor="pr-mid" className="cursor-pointer font-normal text-muted-foreground">
              {formatCurrency(5000)} – {formatCurrency(10000)}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="pr-high" defaultChecked />
            <Label htmlFor="pr-high" className="cursor-pointer font-normal text-muted-foreground">
              Above {formatCurrency(10000)}
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="mb-3 text-sm font-medium text-foreground">Amenities</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox id="am-wifi" />
            <Label htmlFor="am-wifi" className="cursor-pointer font-normal text-muted-foreground">
              Wi‑Fi
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="am-ac" />
            <Label htmlFor="am-ac" className="cursor-pointer font-normal text-muted-foreground">
              Air conditioning
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="am-toilet" />
            <Label htmlFor="am-toilet" className="cursor-pointer font-normal text-muted-foreground">
              Onboard restroom
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
    setLoading(false);
    setResults(mockRoutes);
  }, []);

  const sortedResults = [...results].sort((a, b) => {
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter origin, destination, and date above to see sample results for this preview.
            </p>
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
                <SearchFiltersBody sortBy={sortBy} onSortChange={setSortBy} />
              </CardContent>
            </Card>
          </aside>

          <div className="lg:col-span-9">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="size-4" aria-hidden />
                      Filters & sort
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full gap-0 overflow-y-auto sm:max-w-md">
                    <SheetHeader className="text-left">
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>Sort and refine your trip list</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 px-1">
                      <SearchFiltersBody sortBy={sortBy} onSortChange={setSortBy} />
                    </div>
                  </SheetContent>
                </Sheet>

                {!loading && sortedResults.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{sortedResults.length}</span>{' '}
                    {sortedResults.length === 1 ? 'option' : 'options'} available
                  </p>
                ) : null}
              </div>
            </div>

            {loading ? (
              <ResultsSkeleton />
            ) : sortedResults.length === 0 ? (
              <Card className="border-border/80 border-dashed">
                <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Bus className="size-7" aria-hidden />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">No trips match this search</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Try different cities or another travel date. You can also start again from your dashboard.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
