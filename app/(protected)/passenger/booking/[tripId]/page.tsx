'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SeatSelector } from '@/components/passenger/SeatSelector';
import { BookingSummary } from '@/components/passenger/BookingSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import type { Seat, AvailableRoute, PassengerBookingListItem } from '@/lib/types';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings, platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';

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

  const tripId = typeof params.tripId === 'string' ? params.tripId : '';
  const travelDateRaw = searchParams.get('date');
  const travelDate =
    travelDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(travelDateRaw) ? travelDateRaw : todayISO();
  const existingBookingId = searchParams.get('bookingId');

  const [step, setStep] = useState<'seat' | 'summary' | 'payment'>('seat');
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformFeeBps, setPlatformFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

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

  const displayName = profile?.full_name?.trim() || guestFullName.trim();
  const displayEmail = profile?.email?.trim() || guestEmail.trim();

  const handleSeatSelect = useCallback((seat: Seat) => {
    setSelectedSeat(seat);
    setError('');
  }, []);

  const handleProceedToSummary = () => {
    if (!selectedSeat) {
      setError('Please select a seat');
      return;
    }
    setError('');
    setStep('summary');
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

  const handleConfirmBooking = async () => {
    if (!selectedSeat || !route) {
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

      const payQ = new URLSearchParams({
        tripId,
        seatId: selectedSeat.id,
        date: travelDate,
      });
      if (bookingUuid) payQ.set('bookingId', bookingUuid);
      const payUrl = `/passenger/payment?${payQ.toString()}`;
      router.prefetch(payUrl);
      router.push(payUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = formatTripDateLabel(travelDate);

  if (tripLoading) {
    return (
      <div className="min-h-screen pb-12 bg-linear-to-br from-background to-secondary/30">
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

  return (
    <div className="min-h-screen pb-12 bg-linear-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Booking</h1>
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
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                step === 'seat' || step === 'summary' || step === 'payment'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              1
            </div>
            <span className="text-sm font-medium">Select Seat</span>

            <div className="h-px flex-1 bg-border"></div>

            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                step === 'summary' || step === 'payment'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              2
            </div>
            <span className="text-sm font-medium">Review</span>

            <div className="h-px flex-1 bg-border"></div>

            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                step === 'payment' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              3
            </div>
            <span className="text-sm font-medium">Payment</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {step === 'seat' && (
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
                  </CardContent>
                </Card>

                <SeatSelector
                  seats={route.available_seats}
                  bookedSeats={bookedSeatCodes}
                  onSelect={handleSeatSelect}
                  vehicleType={route.vehicle.vehicle_type}
                  passengerCapacity={route.total_seats}
                  registration={route.vehicle.vehicle_registration}
                  routeLabel={`${route.route.origin_city} → ${route.route.destination_city}`}
                />

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 rounded-lg border border-border hover:bg-secondary/30 font-medium text-foreground transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToSummary}
                    disabled={!selectedSeat}
                    className="flex-1 px-6 py-3 rounded-lg bg-accent hover:bg-accent-dark disabled:bg-muted disabled:text-muted-foreground font-medium text-accent-foreground transition"
                  >
                    Continue to Summary
                  </button>
                </div>
              </div>
            )}

            {step === 'summary' && selectedSeat && (
              <div className="space-y-6">
                {!profile ? (
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Your details</CardTitle>
                      <CardDescription>We&apos;ll use this for your ticket and payment confirmation.</CardDescription>
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
                {profile && existingBooking?.status === 'pending' ? (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" disabled={loading} onClick={() => void handleCancelBooking()}>
                      Cancel booking
                    </Button>
                  </div>
                ) : null}
                <BookingSummary
                  route={route}
                  selectedSeat={selectedSeat}
                  passengerName={displayName || '—'}
                  passengerEmail={displayEmail || '—'}
                  platformFeeBps={platformFeeBps}
                  onConfirm={handleConfirmBooking}
                  isLoading={loading}
                />
              </div>
            )}
          </div>

          <div>
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
    </div>
  );
}
