'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
  Star,
  Timer,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { AvailableRoute } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function format12Hour(time: string) {
  if (!time) return '';
  const [h, m = '00'] = time.split(':');
  const hour = Number(h);
  const minute = Number(m);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m.padStart(2, '0')} ${ampm}`;
}

function formatDateLabel(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDaysOfWeek(days: string[]) {
  if (!days?.length) return '';
  if (days.length === 7) return 'Every day';
  const shortNames = days.map((d) => d.slice(0, 3));
  return shortNames.join(', ');
}

function operatorTheme(companyId: string) {
  const themes = [
    { avatar: 'bg-sky-600 text-white', ring: 'ring-sky-500/25', accent: 'text-sky-700 dark:text-sky-200' },
    { avatar: 'bg-emerald-600 text-white', ring: 'ring-emerald-500/25', accent: 'text-emerald-700 dark:text-emerald-200' },
    { avatar: 'bg-violet-600 text-white', ring: 'ring-violet-500/25', accent: 'text-violet-700 dark:text-violet-200' },
    { avatar: 'bg-rose-600 text-white', ring: 'ring-rose-500/25', accent: 'text-rose-700 dark:text-rose-200' },
    { avatar: 'bg-teal-600 text-white', ring: 'ring-teal-500/25', accent: 'text-teal-700 dark:text-teal-200' },
    { avatar: 'bg-indigo-600 text-white', ring: 'ring-indigo-500/25', accent: 'text-indigo-700 dark:text-indigo-200' },
    { avatar: 'bg-cyan-700 text-white', ring: 'ring-cyan-500/25', accent: 'text-cyan-700 dark:text-cyan-200' },
    { avatar: 'bg-fuchsia-600 text-white', ring: 'ring-fuchsia-500/25', accent: 'text-fuchsia-700 dark:text-fuchsia-200' },
    { avatar: 'bg-amber-600 text-white', ring: 'ring-amber-500/25', accent: 'text-amber-800 dark:text-amber-200' },
    { avatar: 'bg-lime-700 text-white', ring: 'ring-lime-500/25', accent: 'text-lime-800 dark:text-lime-200' },
  ];
  let h = 0;
  for (let i = 0; i < (companyId || 'unknown').length; i++) {
    h = ((h << 5) - h + companyId.charCodeAt(i)) | 0;
  }
  return themes[Math.abs(h) % themes.length]!;
}

function operatorInitials(name: string) {
  if (!name) return '?';
  const tokens = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !/^(ltd|llc|inc|co|company|limited|corp|plc|sa|gmbh)\.?$/i.test(t));
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return (tokens[0]![0]! + tokens[1]![0]!).toUpperCase();
}

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const tripId = typeof params.tripId === 'string' ? params.tripId : '';
  const travelDateRaw = searchParams.get('date');
  const travelDate =
    travelDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(travelDateRaw) ? travelDateRaw : todayISO();

  const [route, setRoute] = useState<AvailableRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setError('Missing trip.');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/passenger/departures/${tripId}?date=${encodeURIComponent(travelDate)}`,
          { cache: 'no-store' },
        );
        const json = (await res.json()) as {
          success?: boolean;
          data?: AvailableRoute;
          error?: string;
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Failed to load trip');
        }
        if (!cancelled) setRoute(json.data);
      } catch (e) {
        if (!cancelled) {
          setRoute(null);
          setError(e instanceof Error ? e.message : 'Failed to load trip');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, travelDate]);

  const bookingHref = `/passenger/booking/${tripId}?date=${encodeURIComponent(travelDate)}`;
  const dateLabel = formatDateLabel(travelDate);

  const theme = useMemo(() => (route ? operatorTheme(route.company.id) : null), [route]);
  const initials = useMemo(() => (route ? operatorInitials(route.company.company_name) : ''), [route]);

  const durationH = route ? Math.floor(route.route.estimated_duration_minutes / 60) : 0;
  const durationM = route ? route.route.estimated_duration_minutes % 60 : 0;
  const durationLabel = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM} min`;

  const seatsAvailable = route
    ? route.total_seats > 0
      ? Math.max(0, route.total_seats - route.booked_seats)
      : route.available_seats.length
    : 0;

  const minPrice = route?.available_seats.length
    ? Math.min(...route.available_seats.map((s) => s.base_price))
    : 0;

  const maxPrice = route?.available_seats.length
    ? Math.max(...route.available_seats.map((s) => s.base_price))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-12 bg-linear-to-br from-background to-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="min-h-screen pb-12 bg-linear-to-br from-background to-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg">Trip not found</CardTitle>
              <CardDescription>{error || 'This trip may no longer be available.'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/passenger/search">Search trips</Link>
              </Button>
              <Button asChild>
                <Link href="/">Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-linear-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back navigation */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>

        {/* Hero card */}
        <Card className="mb-6 overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Left: route summary */}
              <div className="flex-1 p-5 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs font-medium uppercase tracking-wide">
                    {route.route.route_type === 'bus' ? 'Bus' : route.route.route_type}
                  </Badge>
                  {seatsAvailable <= 6 && seatsAvailable > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900/50"
                    >
                      Only {seatsAvailable} left
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                  <span>{route.route.origin_city}</span>
                  <ArrowRight className="inline-block mx-2 size-5 text-muted-foreground" aria-hidden />
                  <span>{route.route.destination_city}</span>
                </h1>

                <p className="text-sm text-muted-foreground mb-6">
                  {dateLabel} · Departs {format12Hour(route.schedule.departure_time)} · {durationLabel} journey
                </p>

                {/* Operator */}
                <div className="flex items-center gap-3">
                  {theme && (
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-offset-2 ring-offset-background',
                        theme.avatar,
                        theme.ring,
                      )}
                      aria-hidden
                    >
                      {initials}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{route.company.company_name}</p>
                    <p className="text-xs text-muted-foreground">Licensed operator</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Verified
                  </div>
                </div>
              </div>

              {/* Right: price + CTA */}
              <div className="border-t sm:border-t-0 sm:border-l border-border/60 bg-muted/30 dark:bg-muted/15 p-5 sm:p-8 sm:w-72 flex flex-col justify-center gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    From
                  </p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {formatCurrency(minPrice)}
                  </p>
                  {maxPrice > minPrice && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Up to {formatCurrency(maxPrice)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button asChild size="lg" className="w-full h-12 text-base font-semibold shadow-sm">
                    <Link href={bookingHref}>Book trip</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {seatsAvailable} seats available
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Departure */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                <Clock className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departure</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {format12Hour(route.schedule.departure_time)}
                </p>
                <p className="text-sm text-muted-foreground">{dateLabel}</p>
              </div>
            </CardContent>
          </Card>

          {/* Arrival */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Navigation className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Arrival</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {format12Hour(route.schedule.arrival_time)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Est. {durationLabel} travel time
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-500/10 dark:bg-violet-950/30 dark:text-violet-300">
                <Calendar className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
                <p className="text-sm font-medium text-foreground">{formatDaysOfWeek(route.schedule.days_of_week)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Route code: {route.route.route_code}</p>
              </div>
            </CardContent>
          </Card>

          {/* Distance */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-500/10 dark:bg-sky-950/30 dark:text-sky-300">
                <MapPin className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distance</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{route.route.distance_km} km</p>
                <p className="text-sm text-muted-foreground">{route.route.origin_city} to {route.route.destination_city}</p>
              </div>
            </CardContent>
          </Card>

          {/* Duration */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/10 dark:bg-amber-950/30 dark:text-amber-300">
                <Timer className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</p>
                <p className="text-lg font-bold text-foreground">{durationLabel}</p>
                <p className="text-sm text-muted-foreground">Estimated travel time</p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card className="border-border/60">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-500/10 dark:bg-rose-950/30 dark:text-rose-300">
                <Bus className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</p>
                <p className="text-sm font-medium text-foreground capitalize">{route.vehicle.vehicle_type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{route.vehicle.vehicle_registration}</p>
                <p className="text-xs text-muted-foreground">{route.total_seats} passenger capacity</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seat pricing */}
        {route.available_seats.length > 0 && (
          <Card className="mb-6 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available seats & pricing</CardTitle>
              <CardDescription>
                {seatsAvailable} seats available · Prices shown per seat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {route.available_seats.slice(0, 12).map((seat) => (
                  <div
                    key={seat.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3 dark:bg-muted/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-md bg-background ring-1 ring-border/60 text-xs font-bold text-foreground">
                        {seat.seat_number}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{seat.seat_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {seat.seat_type === 'premium' ? 'Extra legroom' : seat.seat_type === 'handicap' ? 'Accessible' : 'Standard'}
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(seat.base_price)}
                    </p>
                  </div>
                ))}
                {route.available_seats.length > 12 && (
                  <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3 pt-1">
                    +{route.available_seats.length - 12} more seat types available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operator info */}
        <Card className="mb-6 border-border/60">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {theme && (
                <span
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ring-2 ring-offset-2 ring-offset-background',
                    theme.avatar,
                    theme.ring,
                  )}
                  aria-hidden
                >
                  {initials}
                </span>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{route.company.company_name}</h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {route.company.headquarters_location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden />
                      {route.company.headquarters_location}
                    </span>
                  )}
                  {route.company.contact_phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="size-4" aria-hidden />
                      {route.company.contact_phone}
                    </span>
                  )}
                  {route.company.contact_email && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" aria-hidden />
                      {route.company.contact_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-5 dark:bg-muted/15">
          <div>
            <p className="text-sm font-medium text-foreground">Ready to book?</p>
            <p className="text-xs text-muted-foreground">
              {seatsAvailable} seats available from {formatCurrency(minPrice)}
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto h-11 text-base font-semibold shadow-sm">
            <Link href={bookingHref}>Book this trip</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
