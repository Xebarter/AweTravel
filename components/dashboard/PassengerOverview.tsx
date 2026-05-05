'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowRight, Calendar, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePassengerBookings } from '@/hooks/use-passenger-bookings';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function PassengerOverview() {
  const { data, loading, error, refetch } = usePassengerBookings(20);

  const upcoming = data.filter((b) => b.date >= todayStr() && /confirmed|pending/i.test(b.status)).length;
  const spent = data.reduce((s, b) => s + b.amount, 0);

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Travel overview</CardTitle>
          <CardDescription>Bookings linked to your account</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/passenger/dashboard">
            Open passenger home
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p className="text-sm text-destructive">
            {error}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Retry
            </button>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active bookings</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">{data.length}</p>
            )}
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Upcoming</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-12" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">{upcoming}</p>
            )}
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total spend</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(spent)}</p>
            )}
          </div>
        </div>

        {!loading && data.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Next on your calendar</p>
            <ul className="divide-y divide-border rounded-lg border border-border/80">
              {data
                .filter((b) => b.date >= todayStr())
                .slice(0, 2)
                .map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">{b.route}</span>
                    <span className="text-muted-foreground">
                      {format(parseISO(b.date), 'MMM d')} · {b.departureTime}
                    </span>
                    <Link
                      href={`/passenger/booking/${b.tripId}`}
                      className={cn('text-primary hover:underline', 'ml-auto')}
                    >
                      View
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/passenger/search">
              <Ticket className="size-4" aria-hidden />
              Find a trip
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/passenger/bookings">
              <Calendar className="size-4" aria-hidden />
              My bookings
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
