'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bus,
  Calendar,
  ChevronRight,
  Compass,
  MapPin,
  RefreshCw,
  CreditCard,
  Search,
  Ticket,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { PassengerQuickSearch } from '@/components/passenger/PassengerQuickSearch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePassengerBookings } from '@/hooks/use-passenger-bookings';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import type { PassengerBookingListItem } from '@/lib/types';
import { cn } from '@/lib/utils';

function isUpcomingBooking(b: PassengerBookingListItem): boolean {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (b.date < todayStr) return false;
  const s = b.status.toLowerCase();
  return s === 'confirmed' || s === 'pending';
}

function bookingSortKey(b: PassengerBookingListItem): number {
  return new Date(`${b.date}T${b.departureTime || '00:00'}:00`).getTime();
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName: string | undefined): string {
  if (!fullName?.trim()) return 'there';
  return fullName.trim().split(/\s+/)[0] ?? 'there';
}

function pendingBadgeClass() {
  return 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100';
}

function bookingStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status.toLowerCase();
  if (s === 'cancelled') return 'destructive';
  if (s === 'confirmed') return 'default';
  if (s === 'pending') return 'secondary';
  if (s === 'completed') return 'outline';
  return 'outline';
}

export default function PassengerDashboardPage() {
  const { profile } = useAuth();
  const { data, loading, error, refetch } = usePassengerBookings(50);

  const { upcoming, recent, totalTrips, totalSpent, upcomingCount } = useMemo(() => {
    const upcomingList = data.filter(isUpcomingBooking).sort((a, b) => bookingSortKey(a) - bookingSortKey(b));
    const recentList = [...data]
      .sort((a, b) => bookingSortKey(b) - bookingSortKey(a))
      .slice(0, 5);
    const trips = data.filter((b) => b.status.toLowerCase() !== 'cancelled').length;
    const spent = data.reduce((sum, b) => sum + (typeof b.amount === 'number' ? b.amount : 0), 0);
    return {
      upcoming: upcomingList.slice(0, 3),
      recent: recentList,
      totalTrips: trips,
      totalSpent: spent,
      upcomingCount: upcomingList.length,
    };
  }, [data]);

  const name = firstName(profile?.full_name);

  return (
    <div className="min-h-0 pb-16">
      <div className="relative border-b border-border/60 bg-linear-to-b from-primary/6 via-accent/4 to-background dark:from-primary/10 dark:via-accent/5 dark:to-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.62 0.27 45 / 0.15), transparent)`,
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-12 sm:pb-10">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm dark:bg-card/60">
                <Compass className="size-3.5 text-accent" aria-hidden />
                Your travel hub
              </p>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
                <p className="mt-2 text-base text-muted-foreground sm:text-lg">
                  {timeOfDayGreeting()}, {name}. Search routes, review upcoming departures, and pick up where you left off.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => void refetch()}
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
                Refresh
              </Button>
              <Button size="sm" className="w-full shadow-sm sm:w-auto" asChild>
                <Link href="/passenger/search">
                  <Search className="size-4" aria-hidden />
                  Search trips
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border/80 bg-background/60 backdrop-blur-sm sm:w-auto"
                asChild
              >
                <Link href="/passenger/bookings">
                  <Ticket className="size-4" aria-hidden />
                  My bookings
                </Link>
              </Button>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
        <div className="-mt-6 relative z-10 sm:-mt-8">
          <PassengerQuickSearch className="overflow-hidden border-border/60 shadow-md shadow-primary/5 ring-1 ring-border/40 dark:shadow-none" />
        </div>

        <section aria-labelledby="quick-actions-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="quick-actions-heading" className="text-xl font-semibold tracking-tight text-foreground">
                Quick actions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Jump to what you want to do next</p>
            </div>
          </div>

          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {[
              {
                title: 'Search trips',
                description: 'Find routes and compare operators.',
                href: '/passenger/search',
                icon: Search,
              },
              {
                title: 'My bookings',
                description: 'See tickets and upcoming departures.',
                href: '/passenger/bookings',
                icon: Ticket,
              },
              {
                title: 'Payments',
                description: 'Complete payment for a booking.',
                href: '/passenger/payment',
                icon: CreditCard,
              },
              {
                title: 'Next departure',
                description: upcomingCount > 0 ? 'View your next trip details.' : 'No upcoming trips yet.',
                href: upcomingCount > 0 ? `/passenger/booking/${upcoming[0]?.tripId ?? ''}` : '/passenger/search',
                icon: Calendar,
                disabled: upcomingCount === 0,
              },
            ].map(({ title, description, href, icon: Icon, disabled }) => (
              <Card
                key={title}
                className="w-[260px] snap-start border-border/70 bg-card/80 shadow-sm dark:bg-card/50 sm:w-auto"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/15">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                          asChild
                          disabled={disabled}
                        >
                          <Link href={href}>
                            Open
                            <ChevronRight className="size-4 opacity-70" aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {error ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Could not load bookings</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="size-4" aria-hidden />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">
            Travel summary
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Total trips',
                hint: 'Bookings on your account',
                icon: Ticket,
                value: loading ? null : String(totalTrips),
                skeletonW: 'w-16',
              },
              {
                label: 'Total spent',
                hint: 'Across all bookings',
                icon: Wallet,
                value: loading ? null : formatCurrency(totalSpent),
                skeletonW: 'w-28',
              },
              {
                label: 'Upcoming',
                hint: 'From today onward',
                icon: TrendingUp,
                value: loading ? null : String(upcomingCount),
                skeletonW: 'w-12',
              },
            ].map(({ label, hint, icon: Icon, value, skeletonW }) => (
              <Card
                key={label}
                className="group border-border/70 bg-card/80 shadow-sm transition-shadow hover:shadow-md dark:bg-card/50"
              >
                <CardContent className="flex items-start gap-4 p-5 sm:p-6">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/15">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    {value === null ? (
                      <Skeleton className={cn('h-9', skeletonW)} />
                    ) : (
                      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">{value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8 lg:items-start">
          <section aria-labelledby="upcoming-heading" className="space-y-4 lg:col-span-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="upcoming-heading" className="text-xl font-semibold tracking-tight text-foreground">
                  Upcoming trips
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Next departures on your calendar</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-primary hover:text-primary" asChild>
                <Link href="/passenger/bookings">
                  All bookings
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
            {loading ? (
              <div className="grid gap-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : upcoming.length === 0 ? (
              <Card className="border-dashed border-2 border-border/70 bg-muted/20">
                <CardContent className="flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-10">
                  <div className="flex gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
                      <Calendar className="size-7 text-muted-foreground" aria-hidden />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">No upcoming trips</p>
                      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                        When you book a trip, it will appear here with date, carrier, and seat details.
                      </p>
                    </div>
                  </div>
                  <Button asChild className="w-full shadow-sm sm:w-auto">
                    <Link href="/passenger/search">Find a trip</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ul className="grid gap-3">
                {upcoming.map((b) => {
                  const parsed = parseISO(b.date);
                  return (
                    <li key={b.id}>
                      <Card className="overflow-hidden border-border/70 transition-all hover:border-primary/25 hover:shadow-md dark:hover:border-primary/30">
                        <CardContent className="flex flex-col gap-4 p-0 sm:flex-row sm:items-stretch">
                          <div className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-4 sm:w-28 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:px-3 sm:py-5 dark:bg-muted/15">
                            <time
                              dateTime={b.date}
                              className="flex flex-row items-center gap-3 sm:flex-col sm:gap-1 sm:text-center"
                            >
                              <span className="text-2xl font-bold tabular-nums leading-none text-foreground sm:text-3xl">
                                {format(parsed, 'd')}
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {format(parsed, 'MMM yyyy')}
                              </span>
                            </time>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold leading-snug text-foreground">{b.route}</h3>
                                <Badge
                                  variant={bookingStatusBadgeVariant(b.status)}
                                  className={cn(
                                    'font-normal capitalize',
                                    b.status.toLowerCase() === 'pending' && pendingBadgeClass(),
                                  )}
                                >
                                  {b.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="size-4 shrink-0 opacity-70" aria-hidden />
                                  {format(parsed, 'EEE')} · {b.departureTime}
                                </span>
                                {b.company ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="size-4 shrink-0 opacity-70" aria-hidden />
                                    {b.company}
                                  </span>
                                ) : null}
                                <span className="tabular-nums">Seat {b.seat}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 border-t border-border/50 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
                              <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(b.amount)}</p>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <Link href={`/passenger/booking/${b.tripId}`}>
                                  View trip
                                  <ChevronRight className="size-4 opacity-70" aria-hidden />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="recent-heading" className="space-y-4 lg:col-span-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="recent-heading" className="text-xl font-semibold tracking-tight text-foreground">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Latest on your bookings</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-primary hover:text-primary" asChild>
                <Link href="/passenger/bookings">
                  View all
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 pb-4 dark:bg-muted/10">
                <CardTitle className="text-base font-semibold">Bookings</CardTitle>
                <CardDescription>Most recent first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 px-0 pb-1 pt-0">
                {loading ? (
                  <div className="space-y-0 divide-y divide-border px-4 py-2">
                    <Skeleton className="my-3 h-16 w-full rounded-lg" />
                    <Skeleton className="my-3 h-16 w-full rounded-lg" />
                    <Skeleton className="my-3 h-16 w-full rounded-lg" />
                  </div>
                ) : recent.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                      <Ticket className="size-6 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                    <Button className="mt-5 shadow-sm" asChild>
                      <Link href="/passenger/search">Search routes</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recent.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/passenger/booking/${b.tripId}`}
                          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:hover:bg-muted/20"
                        >
                          <div className="min-w-0 text-left">
                            <p className="font-medium text-foreground">{b.route}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {format(parseISO(b.date), 'MMM d, yyyy')} · {b.departureTime} · Seat {b.seat}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
                            <Badge
                              variant={bookingStatusBadgeVariant(b.status)}
                              className={cn(
                                'capitalize',
                                b.status.toLowerCase() === 'pending' && pendingBadgeClass(),
                                b.status.toLowerCase() === 'completed' &&
                                  'border-transparent bg-muted text-foreground dark:bg-muted/80',
                              )}
                            >
                              {b.status}
                            </Badge>
                            <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(b.amount)}</span>
                            <span className="inline-flex items-center gap-0.5 text-sm font-medium text-primary">
                              Open
                              <ChevronRight className="size-4" aria-hidden />
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
