'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Eye, RefreshCw, Search, Ticket, CalendarDays, CreditCard, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { listTransporterBookings, patchTransporterBooking } from '@/lib/transporter-bookings/client';
import type { Booking } from '@/lib/bookings/types';
import { cn } from '@/lib/utils';

function statusBadgeClass(status: string): string {
  if (status === 'confirmed') return 'border-0 bg-success/15 text-success hover:bg-success/20';
  if (status === 'completed') return 'border-0 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  if (status === 'pending') return 'border-0 bg-warning/15 text-warning hover:bg-warning/20';
  if (status === 'cancelled') return 'border-0 bg-muted text-muted-foreground';
  return 'border-0 bg-muted text-muted-foreground';
}

function paymentBadgeClass(status: string): string {
  return status === 'completed'
    ? 'border-0 bg-success/15 text-success hover:bg-success/20'
    : 'border-0 bg-warning/15 text-warning hover:bg-warning/20';
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'pending'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUpdateError(null);
    try {
      const data = await listTransporterBookings({
        q: searchTerm.trim() || undefined,
        status: filterStatus,
        limit: 100,
      });
      setBookings(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
    const totalRevenueMinor = bookings.reduce(
      (sum, b) => sum + (b.paymentStatus === 'completed' ? b.amountMinor : 0),
      0,
    );
    const pendingPayments = bookings.filter((b) => b.paymentStatus === 'pending').length;
    return { totalBookings, confirmedBookings, totalRevenueMinor, pendingPayments };
  }, [bookings]);

  return (
    <div className="min-h-0 bg-muted/20 pb-[max(3rem,env(safe-area-inset-bottom,0px))] dark:bg-background sm:pb-12">
      <div className="border-b border-border/80 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Transporter console · Bookings
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Bookings & reservations
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Review passengers, payment status, and confirm completed trips.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 border-border/80 bg-background shadow-sm hover:bg-muted/40 sm:h-10 md:w-auto"
                onClick={() => void reload()}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 md:px-8">
        {updateError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {updateError}
          </div>
        ) : null}
        {loadError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}{' '}
            <button className="underline" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {[
              { key: 'total', label: 'Total bookings', value: loading ? null : stats.totalBookings },
              { key: 'confirmed', label: 'Confirmed', value: loading ? null : stats.confirmedBookings },
              { key: 'revenue', label: `Revenue`, value: loading ? null : formatCurrency(stats.totalRevenueMinor) },
              { key: 'pending', label: 'Pending payments', value: loading ? null : stats.pendingPayments },
            ].map((item) => (
              <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-0.5">
                  {item.value === null ? (
                    <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative w-full min-w-0 flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Search by booking code, passenger, route…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-border/80 bg-card pl-8 text-sm shadow-sm placeholder:text-muted-foreground/70"
              aria-label="Search bookings"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter bookings by status"
              className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border/80 bg-card p-0.5 shadow-sm"
            >
              {(
                [
                  { id: 'all' as const, label: 'All' },
                  { id: 'confirmed' as const, label: 'Confirmed' },
                  { id: 'completed' as const, label: 'Completed' },
                  { id: 'pending' as const, label: 'Pending' },
                ] as const
              ).map((s) => {
                const active = filterStatus === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      'h-7 rounded-sm px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => setFilterStatus(s.id)}
                    disabled={loading}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-8">
              <div className="h-40 animate-pulse rounded-lg bg-muted sm:h-48" />
            </CardContent>
          </Card>
        ) : bookings.length > 0 ? (
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              {/* Mobile: cards */}
              <div className="space-y-3 bg-muted/25 p-4 sm:space-y-4 sm:p-6 lg:hidden">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('shrink-0 capitalize', statusBadgeClass(booking.status))}>
                          {booking.status}
                        </Badge>
                        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                          {booking.bookingCode}
                        </span>
                        <Badge className={cn('shrink-0 capitalize', paymentBadgeClass(booking.paymentStatus))}>
                          {booking.paymentStatus}
                        </Badge>
                      </div>

                      <h3 className="mt-3 flex items-center gap-2 text-base font-semibold leading-snug">
                        <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0 truncate">{booking.routeLabel}</span>
                      </h3>

                      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 sm:grid-cols-4">
                        <div>
                          <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <Users className="h-3 w-3 opacity-70" aria-hidden />
                            Passenger
                          </dt>
                          <dd className="truncate text-sm font-medium text-foreground">
                            {booking.passengerName ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <Ticket className="h-3 w-3 opacity-70" aria-hidden />
                            Seat
                          </dt>
                          <dd className="text-sm font-semibold text-accent">{booking.seatCode}</dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <CalendarDays className="h-3 w-3 opacity-70" aria-hidden />
                            Date
                          </dt>
                          <dd className="text-sm font-medium text-foreground">{booking.travelDate}</dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <CreditCard className="h-3 w-3 opacity-70" aria-hidden />
                            Amount
                          </dt>
                          <dd className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(booking.amountMinor)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="min-h-11 flex-1 touch-manipulation shadow-sm sm:min-h-10"
                          disabled={updatingId === booking.id}
                          onClick={async () => {
                            setUpdatingId(booking.id);
                            setUpdateError(null);
                            try {
                              const next =
                                booking.status === 'pending'
                                  ? 'confirmed'
                                  : booking.status === 'confirmed'
                                    ? 'completed'
                                    : booking.status;
                              await patchTransporterBooking(booking.id, { status: next });
                              await reload();
                            } catch (e: unknown) {
                              setUpdateError(e instanceof Error ? e.message : 'Failed to update booking.');
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        >
                          Confirm/Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 flex-1 touch-manipulation text-destructive hover:bg-destructive/10 sm:min-h-10"
                          disabled={updatingId === booking.id || booking.status === 'cancelled'}
                          onClick={async () => {
                            setUpdatingId(booking.id);
                            setUpdateError(null);
                            try {
                              await patchTransporterBooking(booking.id, { status: 'cancelled' });
                              await reload();
                            } catch (e: unknown) {
                              setUpdateError(e instanceof Error ? e.message : 'Failed to cancel booking.');
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        >
                          Cancel
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-11 min-w-11 shrink-0 sm:min-h-10 sm:min-w-10" disabled>
                          <Eye className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="relative hidden max-h-[min(72vh,720px)] w-full overflow-auto lg:block">
                <table className="w-full min-w-[980px] caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10 border-b border-border bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead className="h-11 w-[140px] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pl-6">
                        Code
                      </TableHead>
                      <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Route
                      </TableHead>
                      <TableHead className="h-11 w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Passenger
                      </TableHead>
                      <TableHead className="h-11 w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Seat
                      </TableHead>
                      <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Date
                      </TableHead>
                      <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-11 w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Payment
                      </TableHead>
                      <TableHead className="h-11 w-[140px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="h-11 w-[220px] pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking, rowIndex) => (
                      <TableRow
                        key={booking.id}
                        className={cn(
                          'group border-border/60 transition-colors',
                          rowIndex % 2 === 1 && 'bg-muted/25',
                          'hover:bg-muted/50',
                        )}
                      >
                        <TableCell className="py-3.5 pl-4 lg:pl-6">
                          <span className="font-mono text-sm font-semibold tracking-tight">
                            {booking.bookingCode}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{booking.routeLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="truncate text-sm text-muted-foreground">
                            {booking.passengerName ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-sm font-semibold text-accent">{booking.seatCode}</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                          {booking.travelDate}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge className={cn('capitalize shadow-none', statusBadgeClass(booking.status))}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge className={cn('capitalize shadow-none', paymentBadgeClass(booking.paymentStatus))}>
                            {booking.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(booking.amountMinor)}
                        </TableCell>
                        <TableCell className="py-3.5 pr-4 text-right lg:pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9"
                              disabled={updatingId === booking.id}
                              onClick={async () => {
                                setUpdatingId(booking.id);
                                setUpdateError(null);
                                try {
                                  const next =
                                    booking.status === 'pending'
                                      ? 'confirmed'
                                      : booking.status === 'confirmed'
                                        ? 'completed'
                                        : booking.status;
                                  await patchTransporterBooking(booking.id, { status: next });
                                  await reload();
                                } catch (e: unknown) {
                                  setUpdateError(e instanceof Error ? e.message : 'Failed to update booking.');
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                            >
                              Confirm/Complete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-destructive hover:bg-destructive/10"
                              disabled={updatingId === booking.id || booking.status === 'cancelled'}
                              onClick={async () => {
                                setUpdatingId(booking.id);
                                setUpdateError(null);
                                try {
                                  await patchTransporterBooking(booking.id, { status: 'cancelled' });
                                  await reload();
                                } catch (e: unknown) {
                                  setUpdateError(e instanceof Error ? e.message : 'Failed to cancel booking.');
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                            >
                              Cancel
                            </Button>
                            <Button variant="outline" size="sm" className="h-9" disabled>
                              <Eye className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No bookings found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Bookings will appear here once passengers make reservations'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
