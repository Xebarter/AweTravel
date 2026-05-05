'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SeatSelector } from '@/components/passenger/SeatSelector';
import { PaymentForm } from '@/components/passenger/PaymentForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/components/ui/use-mobile';
import { formatCurrency } from '@/lib/currency';
import type { Seat, AvailableRoute, PassengerBookingListItem } from '@/lib/types';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings, platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';
import { cn } from '@/lib/utils';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTripDateLabel(dateStr: string) {
  if (!dateStr.trim()) return null;
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (!isValid(d)) return dateStr;
  return format(d, 'EEEE, MMM d, yyyy');
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (
    !headers.has('Content-Type') &&
    init.body &&
    typeof init.body === 'string' &&
    (init.method === 'POST' || init.method === 'PATCH')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(path, { ...init, headers, credentials: 'include' });
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  const tripId = typeof params.tripId === 'string' ? params.tripId : '';
  const travelDateRaw = searchParams.get('date');
  const travelDate =
    travelDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(travelDateRaw) ? travelDateRaw : todayISO();
  const existingBookingId = searchParams.get('bookingId');

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformFeeBps, setPlatformFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);

  const [route, setRoute] = useState<AvailableRoute | null>(null);
  const [bookedSeatCodes, setBookedSeatCodes] = useState<string[]>([]);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState('');
  const [existingBooking, setExistingBooking] = useState<PassengerBookingListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchPublicPlatformSettings();
      if (!cancelled) setPlatformFeeBps(s.platformFeeBps);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tripId) {
      setTripLoading(false);
      setTripError('Missing trip.');
      setRoute(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setTripLoading(true);
      setTripError('');
      try {
        const res = await fetch(
          `/api/passenger/departures/${tripId}?date=${encodeURIComponent(travelDate)}`,
          { cache: 'no-store' },
        );
        const json = (await res.json()) as {
          success?: boolean;
          data?: AvailableRoute;
          bookedSeatCodes?: string[];
          error?: string;
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Failed to load trip');
        }
        if (!cancelled) {
          setRoute(json.data);
          setBookedSeatCodes(json.bookedSeatCodes ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setRoute(null);
          setTripError(e instanceof Error ? e.message : 'Failed to load trip');
        }
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, travelDate]);

  useEffect(() => {
    if (!existingBookingId || !profile) {
      setExistingBooking(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/bookings/${existingBookingId}`, { cache: 'no-store' });
        const json = (await res.json()) as { success?: boolean; data?: PassengerBookingListItem; error?: string };
        if (!res.ok || !json.success || !json.data) return;
        if (cancelled) return;
        const b = json.data;
        if (b.departureId && b.departureId !== tripId) {
          setError('This booking is for a different departure.');
          return;
        }
        setExistingBooking(b);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [existingBookingId, profile, tripId]);

  useEffect(() => {
    if (!route || !existingBooking || existingBooking.status !== 'pending') return;
    const seat = route.available_seats.find(
      (s) => s.seat_number === existingBooking.seat || s.id === existingBooking.seat,
    );
    if (seat) setSelectedSeat(seat);
  }, [route, existingBooking]);

  useEffect(() => {
    if (!selectedSeat) return;
    const q = new URLSearchParams({
      tripId,
      seatId: selectedSeat.id,
      date: travelDate,
    });
    if (existingBooking?.id) q.set('bookingId', existingBooking.id);
    router.prefetch(`/passenger/payment?${q.toString()}`);
  }, [selectedSeat, tripId, travelDate, existingBooking?.id, router]);

  useEffect(() => {
    if (!paymentOpen || !tripId) return;
    router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
  }, [paymentOpen, tripId, router]);

  const displayName = profile?.full_name?.trim() || guestFullName.trim();
  const displayEmail = profile?.email?.trim() || guestEmail.trim();

  const handleSeatSelect = useCallback((seat: Seat) => {
    setSelectedSeat(seat);
    setError('');
  }, []);

  const handleProceedToPayment = async () => {
    if (!selectedSeat) {
      setError('Please select a seat');
      return;
    }
    if (!profile) {
      if (!guestFullName.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setError('');
    const bookingUuid = await confirmBookingAndGetId();
    if (!bookingUuid) return;

    setPaymentBookingId(bookingUuid);

    const payQ = new URLSearchParams({
      tripId,
      seatId: selectedSeat.id,
      date: travelDate,
    });
    payQ.set('bookingId', bookingUuid);
    if (!profile?.email?.trim() && guestEmail.trim()) {
      payQ.set('guestEmail', guestEmail.trim());
    }
    const payUrl = `/passenger/payment?${payQ.toString()}`;
    router.prefetch(payUrl);

    if (isMobile) {
      setPaymentOpen(true);
    } else {
      router.push(payUrl);
    }
  };

  const handleCancelBooking = async () => {
    if (!existingBooking?.id || existingBooking.status !== 'pending') return;
    if (!window.confirm('Cancel this pending booking?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/bookings/${existingBooking.id}`, { method: 'DELETE' });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not cancel');
      router.replace(`/passenger/search?date=${encodeURIComponent(travelDate)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
    } finally {
      setLoading(false);
    }
  };

  const confirmBookingAndGetId = async (): Promise<string | undefined> => {
    if (!selectedSeat || !route) {
      setError('Please select a seat');
      return undefined;
    }

    if (!profile) {
      if (!guestFullName.trim()) {
        setError('Please enter your full name');
        return undefined;
      }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        setError('Please enter a valid email address');
        return undefined;
      }
    }

    setLoading(true);
    setError('');

    try {
      let bookingUuid: string | undefined = existingBooking?.id;

      if (profile && existingBooking && existingBooking.status === 'pending' && existingBooking.id === existingBookingId) {
        const newCode = selectedSeat.seat_number.trim().toUpperCase();
        if (newCode !== existingBooking.seat.trim().toUpperCase()) {
          const res = await apiFetch(`/api/bookings/${existingBooking.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ seatCode: newCode }),
          });
          const json = (await res.json()) as { success?: boolean; error?: string };
          if (!res.ok || !json.success) throw new Error(json.error || 'Could not update seat');
        }
      } else {
        const res = await apiFetch('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            routeId: route.route.id,
            departureId: tripId,
            travelDate,
            seatCode: selectedSeat.seat_number,
            ...(profile
              ? {}
              : {
                  guestFullName: guestFullName.trim(),
                  guestEmail: guestEmail.trim(),
                }),
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { id: string };
          error?: string;
        };
        if (!res.ok || !json.success || !json.data?.id) {
          throw new Error(json.error || 'Could not create booking');
        }
        bookingUuid = json.data.id;
      }

      if (!bookingUuid) {
        throw new Error('Missing booking reference');
      }

      return bookingUuid;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = formatTripDateLabel(travelDate);

  const mobileBookingSheetOpen = paymentOpen;
  const payStepActive = isMobile ? paymentOpen : loading;

  const mobileFullSheetClass = cn(
    'mt-0 flex h-[100dvh] max-h-[100dvh] flex-col rounded-none border-0 shadow-none ring-1 ring-border/60',
    'data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh]',
    'pt-[max(0.25rem,env(safe-area-inset-top))]',
  );
  const mobileSheetScrollPadding = 'pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))]';

  if (tripLoading) {
    return (
      <div className="min-h-screen pb-24 md:pb-12 bg-linear-to-br from-background to-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (tripError || !route) {
    return (
      <div className="min-h-screen pb-12 bg-linear-to-br from-background to-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg">Trip unavailable</CardTitle>
              <CardDescription>{tripError || 'Could not load this departure.'}</CardDescription>
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

  const seatsAvailable = Math.max(0, route.total_seats - route.booked_seats);
  const seatTotal =
    selectedSeat != null
      ? selectedSeat.base_price + platformFeeFromBps(selectedSeat.base_price, platformFeeBps)
      : null;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-linear-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl mb-2">Complete Your Booking</h1>
          {existingBooking && existingBooking.status !== 'pending' ? (
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
              This booking is {existingBooking.status}. Seat changes here are only available for pending trips.
            </p>
          ) : null}
          {!profile ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Booking as a guest — no account needed.{' '}
              <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
                Sign in
              </Link>{' '}
              to keep trips in one place.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-bold ${
                  !payStepActive ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">Select seat</span>
            </div>

            <div className="hidden h-px min-w-4 flex-1 bg-border sm:block" aria-hidden />

            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-bold ${
                  payStepActive ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">Pay</span>
            </div>
          </div>
        </div>

        {error && !(isMobile && mobileBookingSheetOpen) ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      {route.route.origin_city} → {route.route.destination_city}
                    </CardTitle>
                    <CardDescription>{route.company.company_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    {dateLabel ? (
                      <p>
                        Travel date:{' '}
                        <span className="text-foreground font-medium tabular-nums">{dateLabel}</span>
                      </p>
                    ) : null}
                    <p>
                      Departure:{' '}
                      <span className="text-foreground font-medium">{route.schedule.departure_time}</span>
                    </p>
                    <p>
                      Duration:{' '}
                      <span className="text-foreground font-medium">
                        {Math.floor(route.route.estimated_duration_minutes / 60)}h{' '}
                        {route.route.estimated_duration_minutes % 60}m
                      </span>
                    </p>
                    <p>
                      Seats available:{' '}
                      <span className="text-foreground font-medium tabular-nums">
                        {seatsAvailable}
                      </span>
                      {route.total_seats > 0 ? (
                        <span className="text-muted-foreground">
                          {' '}
                          of {route.total_seats}
                        </span>
                      ) : null}
                    </p>
                  </CardContent>
                </Card>

                {!profile ? (
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Your details</CardTitle>
                      <CardDescription>
                        We&apos;ll use this for your ticket and payment confirmation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest-full-name">Full name</Label>
                        <Input
                          id="guest-full-name"
                          name="guestFullName"
                          autoComplete="name"
                          value={guestFullName}
                          onChange={(e) => setGuestFullName(e.target.value)}
                          placeholder="As on your ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest-email">Email</Label>
                        <Input
                          id="guest-email"
                          name="guestEmail"
                          type="email"
                          autoComplete="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <SeatSelector
                  seats={route.available_seats}
                  bookedSeats={bookedSeatCodes}
                  onSelect={handleSeatSelect}
                  vehicleType={route.vehicle.vehicle_type}
                  passengerCapacity={route.total_seats}
                  registration={route.vehicle.vehicle_registration}
                  routeLabel={`${route.route.origin_city} → ${route.route.destination_city}`}
                />

                {profile && existingBooking?.status === 'pending' ? (
                  <div className="flex justify-end md:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => void handleCancelBooking()}
                    >
                      Cancel booking
                    </Button>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground md:max-w-xl">
                  By continuing you create a pending booking and agree to AweTravel&apos;s terms. Payment is completed
                  on the next step via our payment partner.
                </p>

                <div className="hidden md:flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-lg border border-border px-6 py-3 font-medium text-foreground transition hover:bg-secondary/30"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleProceedToPayment()}
                    disabled={!selectedSeat || loading}
                    className="min-w-48 flex-1 rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:bg-accent-dark disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {loading ? 'Preparing payment…' : 'Continue to payment'}
                  </button>
                </div>
            </div>
          </div>

          <div className="hidden md:block">
            <Card className="border-border sticky top-16">
              <CardHeader>
                <CardTitle className="text-lg">Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Route</p>
                  <p className="font-semibold text-foreground">
                    {route.route.origin_city} → {route.route.destination_city}
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Travel date</p>
                  <p className="font-semibold text-foreground">{dateLabel || travelDate}</p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Departure</p>
                  <p className="font-semibold text-foreground">{route.schedule.departure_time}</p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Selected Seat</p>
                  <p className="font-semibold text-lg text-accent">
                    {selectedSeat?.seat_number || 'Not selected'}
                  </p>
                </div>

                {selectedSeat && (
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="font-bold text-lg text-accent">
                      {formatCurrency(
                        selectedSeat.base_price + platformFeeFromBps(selectedSeat.base_price, platformFeeBps),
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Includes platform fee (
                      {platformFeeBps % 100 === 0
                        ? platformFeeBps / 100
                        : (platformFeeBps / 100).toFixed(2).replace(/\.?0+$/, '')}
                      %)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isMobile ? (
        <>
          {!mobileBookingSheetOpen ? (
            <div
              className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 px-4 py-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto flex max-w-6xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="truncate font-semibold tabular-nums text-foreground">
                    {seatTotal != null ? formatCurrency(seatTotal) : '—'}
                  </p>
                  {selectedSeat ? (
                    <p className="truncate text-xs text-muted-foreground">Seat {selectedSeat.seat_number}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select a seat</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleProceedToPayment()}
                  disabled={!selectedSeat || loading}
                  className="shrink-0 rounded-lg bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:bg-accent-dark disabled:bg-muted disabled:text-muted-foreground"
                >
                  {loading ? 'Wait…' : 'Pay'}
                </button>
              </div>
            </div>
          ) : null}

          <Drawer open={paymentOpen} direction="bottom" onOpenChange={setPaymentOpen}>
            <DrawerContent className={mobileFullSheetClass}>
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-background px-4 pb-3 sm:px-5">
                <DrawerHeader className="min-w-0 flex-1 space-y-1 p-0 text-left">
                  <DrawerTitle className="text-lg">Payment</DrawerTitle>
                  <DrawerDescription>Complete checkout with Paytota.</DrawerDescription>
                </DrawerHeader>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 size-9 shrink-0 rounded-full"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </Button>
                </DrawerClose>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  className={cn(
                    'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 sm:px-5',
                    mobileSheetScrollPadding,
                  )}
                >
                  {selectedSeat ? (
                    <PaymentForm
                      embedded
                      tripId={tripId}
                      seatId={selectedSeat.id}
                      bookingId={paymentBookingId ?? undefined}
                      platformFeeBps={platformFeeBps}
                      totalAmount={
                        selectedSeat.base_price + platformFeeFromBps(selectedSeat.base_price, platformFeeBps)
                      }
                      guestEmail={profile?.email?.trim() ? undefined : guestEmail.trim() || undefined}
                      returnTripId={tripId}
                      confirmationEmailHint={displayEmail || undefined}
                      onCancel={() => setPaymentOpen(false)}
                    />
                  ) : null}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : null}
    </div>
  );
}
