'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bus,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePassengerBookings } from '@/hooks/use-passenger-bookings';
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

function sortBookingsAll(list: PassengerBookingListItem[]): PassengerBookingListItem[] {
  const upcoming = list.filter(isUpcomingBooking).sort((a, b) => bookingSortKey(a) - bookingSortKey(b));
  const rest = list
    .filter((b) => !isUpcomingBooking(b))
    .sort((a, b) => bookingSortKey(b) - bookingSortKey(a));
  return [...upcoming, ...rest];
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'border-transparent bg-primary/15 text-primary';
  if (s === 'pending') return 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300';
  if (s === 'completed') return 'border-transparent bg-muted text-foreground';
  if (s === 'cancelled') return 'border-transparent bg-destructive/15 text-destructive';
  return 'font-normal';
}

function BookingCard({ booking }: { booking: PassengerBookingListItem }) {
  const upcoming = isUpcomingBooking(booking);
  const weekday = format(parseISO(booking.date), 'EEE');

  return (
    <Card
      className={cn(
        'group border-border/80 overflow-hidden transition-shadow hover:shadow-md',
        upcoming && 'ring-1 ring-primary/20',
      )}
    >
      <CardContent className="relative p-0">
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-1',
            upcoming ? 'bg-primary' : 'bg-border',
          )}
          aria-hidden
        />
        <div className="flex flex-col gap-5 p-5 pl-6 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 gap-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl border',
                upcoming
                  ? 'border-primary/25 bg-primary/10 text-primary'
                  : 'border-border bg-muted/50 text-muted-foreground',
              )}
              aria-hidden
            >
              <Bus className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                  {booking.route}
                </h2>
                <Badge variant="outline" className={cn('shrink-0 capitalize', statusBadgeClass(booking.status))}>
                  {booking.status}
                </Badge>
              </div>
              <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
                  <div>
                    <dt className="sr-only">Date</dt>
                    <dd>
                      <span className="font-medium text-foreground">{weekday}</span>
                      {', '}
                      {format(parseISO(booking.date), 'MMM d, yyyy')}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
                  <div>
                    <dt className="sr-only">Departure</dt>
                    <dd className="text-foreground">{booking.departureTime}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Ticket className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
                  <div>
                    <dt className="sr-only">Seat</dt>
                    <dd>
                      Seat <span className="font-medium text-foreground">{booking.seat}</span>
                    </dd>
                  </div>
                </div>
                {booking.company ? (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
                    <div>
                      <dt className="sr-only">Operator</dt>
                      <dd className="text-foreground">{booking.company}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(booking.amount)}</p>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link href={`/passenger/booking/${booking.tripId}`}>
                View trip
                <ArrowRight
                  className="size-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="border-border/80 overflow-hidden">
          <CardContent className="p-5 pl-6">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex flex-1 gap-4">
                <Skeleton className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-48 max-w-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32 sm:col-span-2" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4 sm:w-36 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                <Skeleton className="h-4 w-16 sm:ml-auto" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const { data: bookings, loading, error, refetch } = usePassengerBookings(50);
  const [tab, setTab] = useState('all');

  const { upcoming, past, totalTrips, totalSpent, upcomingCount, allSorted } = useMemo(() => {
    const upcomingList = bookings.filter(isUpcomingBooking).sort((a, b) => bookingSortKey(a) - bookingSortKey(b));
    const pastList = bookings
      .filter((b) => !isUpcomingBooking(b))
      .sort((a, b) => bookingSortKey(b) - bookingSortKey(a));
    const trips = bookings.filter((b) => b.status.toLowerCase() !== 'cancelled').length;
    const spent = bookings.reduce((sum, b) => sum + (typeof b.amount === 'number' ? b.amount : 0), 0);
    return {
      upcoming: upcomingList,
      past: pastList,
      totalTrips: trips,
      totalSpent: spent,
      upcomingCount: upcomingList.length,
      allSorted: sortBookingsAll(bookings),
    };
  }, [bookings]);

  return (
    <div className="min-h-0 pb-12">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-6 border-b border-border/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">My bookings</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Every trip you have booked in one place. Filter by upcoming departures or past travel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void refetch()}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link href="/passenger/search">
                <Search className="size-4" aria-hidden />
                Find a trip
              </Link>
            </Button>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive">
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

        {!loading && bookings.length > 0 ? (
          <section aria-labelledby="bookings-summary-heading">
            <h2 id="bookings-summary-heading" className="sr-only">
              Booking summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-border/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total bookings</CardTitle>
                  <Ticket className="size-4 text-primary" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{bookings.length}</p>
                  <p className="text-xs text-muted-foreground">Including cancelled</p>
                </CardContent>
              </Card>
              <Card className="border-border/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
                  <Calendar className="size-4 text-primary" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{upcomingCount}</p>
                  <p className="text-xs text-muted-foreground">From today, confirmed or pending</p>
                </CardContent>
              </Card>
              <Card className="border-border/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total spent</CardTitle>
                  <Wallet className="size-4 text-primary" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">Across {totalTrips} non-cancelled trips</p>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {loading ? (
          <BookingsSkeleton />
        ) : bookings.length > 0 ? (
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
                <TabsTrigger value="all" className="gap-1.5 px-3">
                  All
                  <Badge variant="secondary" className="ml-0.5 rounded-md px-1.5 py-0 text-xs font-normal tabular-nums">
                    {bookings.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="gap-1.5 px-3">
                  Upcoming
                  <Badge variant="secondary" className="ml-0.5 rounded-md px-1.5 py-0 text-xs font-normal tabular-nums">
                    {upcoming.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="past" className="gap-1.5 px-3">
                  Past
                  <Badge variant="secondary" className="ml-0.5 rounded-md px-1.5 py-0 text-xs font-normal tabular-nums">
                    {past.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 space-y-4">
              {allSorted.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-0 space-y-4">
              {upcoming.length === 0 ? (
                <Card className="border-dashed border-border/80 bg-muted/20">
                  <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                      <Calendar className="size-7 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No upcoming trips</p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        You do not have any confirmed or pending departures from today onward.
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/passenger/search">Search routes</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-0 space-y-4">
              {past.length === 0 ? (
                <Card className="border-dashed border-border/80 bg-muted/20">
                  <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                      <Bus className="size-7 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No past bookings</p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Completed and older trips will appear here once you have travel history.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                past.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed border-border/80 bg-muted/20">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                <Ticket className="size-8 text-muted-foreground" aria-hidden />
              </div>
              <CardTitle className="text-xl">No bookings yet</CardTitle>
              <CardDescription className="text-base">
                When you book a seat, your tickets and trip details will show up here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-10">
              <Button asChild>
                <Link href="/passenger/search">
                  <Search className="size-4" aria-hidden />
                  Find a trip
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
