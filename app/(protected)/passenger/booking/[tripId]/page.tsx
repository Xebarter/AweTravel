'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { MAX_TICKETS_PER_CHECKOUT } from '@/lib/bookings/constants';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings, platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { AlertCircle, ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { startPaytotaCheckout } from '@/lib/payments/start-paytota-checkout-client';

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

  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformFeeBps, setPlatformFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  /** Pending unpaid rows created this session (or the resumed booking id); cleared/replaced after each confirm. */
  const [pendingUnpaidIds, setPendingUnpaidIds] = useState<string[]>([]);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentBookingIds, setPaymentBookingIds] = useState<string[]>([]);
  const [paymentCheckoutGroupId, setPaymentCheckoutGroupId] = useState<string | null>(null);
  /** User closed the mobile payment sheet — don’t immediately reopen until they change seat or tap Pay again. */
  const [userClosedPaymentSheet, setUserClosedPaymentSheet] = useState(false);

  const paymentFlowLockRef = useRef(false);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const selectedSeatsRef = useRef<Seat[]>([]);
  selectedSeatsRef.current = selectedSeats;
  const pendingUnpaidIdsRef = useRef<string[]>([]);
  pendingUnpaidIdsRef.current = pendingUnpaidIds;

  const [route, setRoute] = useState<AvailableRoute | null>(null);
  const [bookedSeatCodes, setBookedSeatCodes] = useState<string[]>([]);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState('');
  const [existingBooking, setExistingBooking] = useState<PassengerBookingListItem | null>(null);

  const maxSelectable = useMemo(() => {
    if (
      existingBookingId &&
      existingBooking?.status === 'pending' &&
      existingBooking.id === existingBookingId
    ) {
      return 1;
    }
    return MAX_TICKETS_PER_CHECKOUT;
  }, [existingBookingId, existingBooking?.id, existingBooking?.status]);

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
    if (seat) setSelectedSeats([seat]);
  }, [route, existingBooking]);

  useEffect(() => {
    if (
      existingBooking?.status === 'pending' &&
      existingBookingId &&
      existingBooking.id === existingBookingId
    ) {
      setPendingUnpaidIds([existingBooking.id]);
    }
  }, [existingBooking?.id, existingBooking?.status, existingBookingId]);

  useEffect(() => {
    if (!paymentOpen || !tripId) return;
    router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
  }, [paymentOpen, tripId, router]);

  const displayEmail = profile?.email?.trim() || guestEmail.trim();

  const handleSeatToggle = useCallback(
    (seat: Seat) => {
      setUserClosedPaymentSheet(false);
      const prev = selectedSeatsRef.current;
      const i = prev.findIndex((s) => s.id === seat.id);
      if (i >= 0) {
        setError('');
        setSelectedSeats(prev.filter((_, j) => j !== i));
        return;
      }
      if (prev.length >= maxSelectable) {
        if (maxSelectable === 1) {
          setError('');
          setSelectedSeats([seat]);
          return;
        }
        setError(`You can select at most ${maxSelectable} seats. Deselect one to choose another.`);
        return;
      }
      setError('');
      setSelectedSeats([...prev, seat]);
    },
    [maxSelectable],
  );

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat');
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

    if (paymentFlowLockRef.current) return;
    paymentFlowLockRef.current = true;

    setError('');
    try {
      const confirmed = await confirmBookingAndGetId();
      if (!confirmed) return;

      setPaymentBookingIds(confirmed.bookingIds);
      setPaymentCheckoutGroupId(confirmed.checkoutGroupId);

      if (isMobile) {
        setPaymentOpen(true);
      } else {
        setLoading(true);
        try {
          if (confirmed.checkoutGroupId) {
            await startPaytotaCheckout({
              checkoutGroupId: confirmed.checkoutGroupId,
              tripId,
              ...(!profile?.email?.trim() && guestEmail.trim() ? { guestEmail: guestEmail.trim() } : {}),
            });
          } else {
            await startPaytotaCheckout({
              bookingId: confirmed.bookingIds[0]!,
              tripId,
              ...(!profile?.email?.trim() && guestEmail.trim() ? { guestEmail: guestEmail.trim() } : {}),
            });
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not start checkout');
        } finally {
          setLoading(false);
        }
      }
    } finally {
      paymentFlowLockRef.current = false;
    }
  };

  const guestDetailsComplete =
    !!profile ||
    (guestFullName.trim().length > 0 &&
      guestEmail.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()));

  const canContinueToPay = Boolean(selectedSeats.length > 0 && guestDetailsComplete && !loading);

  useEffect(() => {
    if (!error || !errorBannerRef.current) return;
    errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  const handleCancelBooking = async () => {
    if (!existingBooking?.id || existingBooking.status !== 'pending') return;
    if (!window.confirm('Cancel this pending booking?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/bookings/${existingBooking.id}`, { method: 'DELETE' });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not cancel');
      setPendingUnpaidIds([]);
      router.replace(`/passenger/search?date=${encodeURIComponent(travelDate)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
    } finally {
      setLoading(false);
    }
  };

  const confirmBookingAndGetId = async (): Promise<
    { bookingIds: string[]; checkoutGroupId: string | null } | undefined
  > => {
    if (selectedSeats.length === 0 || !route) {
      setError('Please select at least one seat');
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

    const isResume = Boolean(
      profile &&
        existingBookingId &&
        existingBooking &&
        existingBooking.status === 'pending' &&
        existingBooking.id === existingBookingId &&
        selectedSeats.length === 1,
    );

    setLoading(true);
    setError('');

    try {
      if (isResume && existingBooking) {
        const newCode = selectedSeats[0]!.seat_number.trim().toUpperCase();
        if (newCode !== existingBooking.seat.trim().toUpperCase()) {
          const res = await apiFetch(`/api/bookings/${existingBooking.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ seatCode: newCode }),
          });
          const json = (await res.json()) as { success?: boolean; error?: string };
          if (!res.ok || !json.success) throw new Error(json.error || 'Could not update seat');
        }
        setPendingUnpaidIds([existingBooking.id]);
        return { bookingIds: [existingBooking.id], checkoutGroupId: null };
      }

      for (const id of pendingUnpaidIdsRef.current) {
        await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
      }
      setPendingUnpaidIds([]);

      const seatCodes = selectedSeats.map((s) => s.seat_number.trim().toUpperCase());
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          routeId: route.route.id,
          departureId: tripId,
          travelDate,
          seatCodes,
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
        data?: { bookingIds: string[]; checkoutGroupId: string | null };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data?.bookingIds?.length) {
        throw new Error(json.error || 'Could not create booking');
      }

      const { bookingIds, checkoutGroupId } = json.data;
      setPendingUnpaidIds(bookingIds);
      return { bookingIds, checkoutGroupId };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = formatTripDateLabel(travelDate);

  const mobileBookingSheetOpen = paymentOpen;
  /** Step 2 while checkout is opening or the mobile payment sheet is up. */
  const payStepHighlighted = paymentOpen || loading;

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
              <CardTitle className="text-lg">Can&apos;t load trip</CardTitle>
              <CardDescription>{tripError || 'Try search or another date.'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/passenger/search">Search</Link>
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
  const ticketsSubtotal = selectedSeats.reduce((s, seat) => s + seat.base_price, 0);
  const seatTotal =
    selectedSeats.length > 0
      ? ticketsSubtotal + platformFeeFromBps(ticketsSubtotal, platformFeeBps)
      : null;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-linear-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
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

          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Step 1 of 2</p>
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
            {maxSelectable > 1 ? 'Choose your seats' : 'Choose your seat'}
          </h1>
          <p className="mb-4 max-w-xl text-sm text-muted-foreground">
            Then continue to secure payment.{!profile ? ' Guests add contact details next.' : null}
          </p>

          {existingBooking && existingBooking.status === 'pending' && existingBookingId ? (
            <p className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
              Finishing a pending booking — you can change the seat, then pay.
            </p>
          ) : null}
          {existingBooking && existingBooking.status !== 'pending' ? (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
              This trip is {existingBooking.status}. Seat changes need a pending booking.
            </p>
          ) : null}
          {!profile ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Checking out as a guest.{' '}
              <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
                Sign in
              </Link>{' '}
              to save trips.
            </p>
          ) : null}

          <nav aria-label="Booking progress" className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  selectedSeats.length > 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-accent-foreground',
                )}
                aria-current={!payStepHighlighted ? 'step' : undefined}
              >
                {selectedSeats.length > 0 ? <Check className="size-4" aria-hidden /> : '1'}
              </div>
              <span className="text-sm font-medium text-foreground">Seat &amp; details</span>
            </div>

            <div className="hidden h-px min-w-4 flex-1 bg-border sm:block" aria-hidden />

            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  payStepHighlighted
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-muted-foreground',
                )}
                aria-current={payStepHighlighted ? 'step' : undefined}
              >
                2
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  payStepHighlighted ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                Pay
              </span>
            </div>
          </nav>
        </div>

        {error && !(isMobile && mobileBookingSheetOpen) ? (
          <div
            ref={errorBannerRef}
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm leading-relaxed">{error}</p>
              {selectedSeats.length > 0 && guestDetailsComplete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={loading}
                  onClick={() => void handleProceedToPayment()}
                >
                  {loading ? 'Opening…' : 'Try again'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="space-y-6">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl sm:text-2xl">
                      {route.route.origin_city} → {route.route.destination_city}
                    </CardTitle>
                    <CardDescription>{route.company.company_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {dateLabel ? (
                        <span className="font-medium tabular-nums text-foreground">{dateLabel}</span>
                      ) : null}
                      {dateLabel ? <span aria-hidden>·</span> : null}
                      <span>
                        <span className="text-foreground font-medium">{route.schedule.departure_time}</span>
                        <span className="mx-1.5" aria-hidden>
                          ·
                        </span>
                        <span className="text-foreground font-medium">
                          {Math.floor(route.route.estimated_duration_minutes / 60)}h{' '}
                          {route.route.estimated_duration_minutes % 60}m
                        </span>
                        <span className="mx-1.5" aria-hidden>
                          ·
                        </span>
                        <span className="tabular-nums text-foreground font-medium">{seatsAvailable}</span>
                        {route.total_seats > 0 ? (
                          <span className="text-muted-foreground">/{route.total_seats} seats</span>
                        ) : (
                          <span className="text-muted-foreground"> seats</span>
                        )}
                      </span>
                    </p>
                  </CardContent>
                </Card>

                <SeatSelector
                  seats={route.available_seats}
                  bookedSeats={bookedSeatCodes}
                  selectedSeats={selectedSeats}
                  maxTickets={maxSelectable}
                  onToggleSeat={handleSeatToggle}
                  vehicleType={route.vehicle.vehicle_type}
                  passengerCapacity={route.total_seats}
                  registration={route.vehicle.vehicle_registration}
                  routeLabel={`${route.route.origin_city} → ${route.route.destination_city}`}
                />

                {!profile ? (
                  <Card id="booking-contact" className="scroll-mt-24 border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Your details</CardTitle>
                      <CardDescription>Used for your ticket and receipt.</CardDescription>
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
                          placeholder="Full name"
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

                {profile && existingBooking?.status === 'pending' ? (
                  <div className="flex justify-end md:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => void handleCancelBooking()}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground md:max-w-xl">
                  Continuing creates a pending hold on your seat{selectedSeats.length > 1 ? 's' : ''}.{' '}
                  <Link href="/terms" className="underline-offset-2 hover:underline">
                    Terms
                  </Link>
                </p>
            </div>
          </div>

          <div className="hidden md:block">
            <Card className="sticky top-16 border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Summary</CardTitle>
                <CardDescription>Review, then pay.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="font-semibold text-foreground">
                    {route.route.origin_city} → {route.route.destination_city}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {dateLabel || travelDate}
                    <span className="mx-1.5" aria-hidden>
                      ·
                    </span>
                    {route.schedule.departure_time}
                  </p>
                </div>

                <div className="flex items-baseline justify-between gap-2 rounded-lg bg-secondary/30 p-3">
                  <span className="text-muted-foreground">{selectedSeats.length > 1 ? 'Seats' : 'Seat'}</span>
                  <span className="text-right text-lg font-semibold text-accent">
                    {selectedSeats.length > 0
                      ? selectedSeats.map((s) => s.seat_number).join(', ')
                      : '—'}
                  </span>
                </div>

                {selectedSeats.length > 0 ? (
                  <div className="rounded-lg border border-accent/20 bg-accent/10 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-muted-foreground">Total</span>
                      <p className="text-lg font-bold tabular-nums text-accent">
                        {formatCurrency(
                          ticketsSubtotal + platformFeeFromBps(ticketsSubtotal, platformFeeBps),
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Incl.{' '}
                      {platformFeeBps % 100 === 0
                        ? platformFeeBps / 100
                        : (platformFeeBps / 100).toFixed(2).replace(/\.?0+$/, '')}
                      % fee
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    className="h-12 w-full text-base font-semibold shadow-sm"
                    size="lg"
                    disabled={!canContinueToPay}
                    onClick={() => {
                      setUserClosedPaymentSheet(false);
                      void handleProceedToPayment();
                    }}
                  >
                    {loading ? 'Opening checkout…' : 'Continue to payment'}
                  </Button>
                  {selectedSeats.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground">
                      <Link href="#seat-map" className="underline-offset-2 hover:underline">
                        {maxSelectable > 1 ? 'Choose seats' : 'Choose a seat'}
                      </Link>{' '}
                      on the map first.
                    </p>
                  ) : !guestDetailsComplete && !profile ? (
                    <p className="text-center text-xs text-amber-700 dark:text-amber-400">
                      <Link href="#booking-contact" className="underline-offset-2 hover:underline">
                        Add your name and email
                      </Link>{' '}
                      to continue.
                    </p>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">You&apos;ll pay on the next screen.</p>
                  )}
                </div>
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
                  {selectedSeats.length > 0 ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedSeats.length > 1
                        ? `${selectedSeats.length} seats · ${selectedSeats.map((s) => s.seat_number).join(', ')}`
                        : `Seat ${selectedSeats[0]!.seat_number}`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <a href="#seat-map" className="underline-offset-2">
                        Tap the map
                      </a>
                    </p>
                  )}
                  {!profile && selectedSeats.length > 0 && !guestDetailsComplete ? (
                    <p className="truncate text-xs text-amber-700 dark:text-amber-400">
                      <a href="#booking-contact" className="underline-offset-2">
                        Add name &amp; email
                      </a>
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 shrink-0 px-6 font-semibold shadow-sm"
                  disabled={!canContinueToPay}
                  onClick={() => {
                    setUserClosedPaymentSheet(false);
                    void handleProceedToPayment();
                  }}
                  aria-label={
                    loading
                      ? 'Opening checkout'
                      : !guestDetailsComplete && !profile
                        ? 'Add your details first'
                        : 'Continue to payment'
                  }
                >
                  {loading ? 'Opening…' : 'Continue'}
                </Button>
              </div>
            </div>
          ) : null}

          <Drawer
            open={paymentOpen}
            direction="bottom"
            onOpenChange={(open) => {
              setPaymentOpen(open);
              if (!open) setUserClosedPaymentSheet(true);
            }}
          >
            <DrawerContent className={mobileFullSheetClass}>
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-background px-4 pb-3 sm:px-5">
                <DrawerHeader className="min-w-0 flex-1 space-y-0.5 p-0 text-left">
                  <DrawerTitle className="text-lg">Payment</DrawerTitle>
                  <DrawerDescription className="text-muted-foreground">Secure checkout — you can close and return here.</DrawerDescription>
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
                  {selectedSeats.length > 0 && paymentBookingIds.length > 0 ? (
                    <PaymentForm
                      tripId={tripId}
                      bookingId={paymentCheckoutGroupId ? undefined : paymentBookingIds[0]}
                      checkoutGroupId={paymentCheckoutGroupId ?? undefined}
                      platformFeeBps={platformFeeBps}
                      totalAmount={seatTotal ?? undefined}
                      ticketCount={selectedSeats.length}
                      guestEmail={profile?.email?.trim() ? undefined : guestEmail.trim() || undefined}
                      confirmationEmailHint={displayEmail || undefined}
                      onCancel={() => {
                        setPaymentOpen(false);
                        setUserClosedPaymentSheet(true);
                      }}
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
