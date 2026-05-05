'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentForm } from '@/components/passenger/PaymentForm';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings } from '@/lib/platform-settings/public-client';
import { getSupabaseAuthHeaderInit } from '@/lib/supabase';
import { ChevronLeft, Loader2 } from 'lucide-react';

type PreviewData = {
  totalMinor: number;
  platformFeeBps: number;
  ticketMinor: number;
  platformFeeMinor: number;
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const tripId = searchParams.get('tripId') || '';
  const seatId = searchParams.get('seatId') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const guestEmailParam = searchParams.get('guestEmail') || '';

  const [platformFeeBps, setPlatformFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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
    if (!bookingId) {
      setPreview(null);
      setPreviewError('');
      return;
    }

    let cancelled = false;
    void (async () => {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const q = new URLSearchParams({ bookingId });
        if (!profile?.email && guestEmailParam.trim()) {
          q.set('guestEmail', guestEmailParam.trim());
        }
        const authHeaders = await getSupabaseAuthHeaderInit();
        const res = await fetch(`/api/payments/preview?${q.toString()}`, {
          credentials: 'include',
          headers: { ...authHeaders },
        });
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: {
            totalMinor: number;
            platformFeeBps: number;
            ticketMinor: number;
            platformFeeMinor: number;
          };
        };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Could not load checkout summary');
        }
        if (!cancelled) setPreview(json.data);
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(e instanceof Error ? e.message : 'Could not load checkout summary');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, guestEmailParam, profile?.email]);

  const guestEmailForApi =
    profile?.email?.trim() ? undefined : guestEmailParam.trim() ? guestEmailParam.trim() : undefined;

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div>
              <Button variant="ghost" size="sm" className="-ml-2 px-2 text-muted-foreground hover:text-foreground" asChild>
                <Link href={profile ? '/passenger/bookings' : '/'}>
                  <ChevronLeft className="size-4" aria-hidden />
                  {profile ? 'Back to bookings' : 'Back to home'}
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Payment</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              You’ll be redirected to Paytota to pay securely. After payment, you’ll return here and we’ll confirm your
              booking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Powered by Paytota
            </Badge>
          </div>
        </header>

        {!tripId ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-lg">No trip selected</CardTitle>
              <CardDescription>
                This page expects a <code className="font-mono">tripId</code> in the URL. Start from search/bookings to
                pay for a seat.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/passenger/search">Search trips</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/passenger/bookings">My bookings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !bookingId ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-lg">No booking to pay</CardTitle>
              <CardDescription>
                Start from a trip, pick a seat, and confirm your booking. Then you can pay here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={tripId ? `/passenger/booking/${tripId}` : '/passenger/search'}>Back to booking</Link>
              </Button>
            </CardContent>
          </Card>
        ) : previewLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span>Loading checkout…</span>
          </div>
        ) : previewError ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-lg">Could not open checkout</CardTitle>
              <CardDescription>{previewError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/passenger/booking/${tripId}`}>Back to booking</Link>
              </Button>
            </CardContent>
          </Card>
        ) : preview ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-7">
              <PaymentForm
                tripId={tripId}
                seatId={seatId || undefined}
                bookingId={bookingId}
                platformFeeBps={preview.platformFeeBps}
                totalAmount={preview.totalMinor}
                guestEmail={guestEmailForApi}
                returnTripId={tripId}
                confirmationEmailHint={profile?.email?.trim() || guestEmailParam.trim() || undefined}
              />
            </section>

            <aside className="lg:col-span-5">
              <Card className="sticky top-16 border-border/80 shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">Order summary</CardTitle>
                  <CardDescription>Review the amount before paying.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trip</p>
                      <p className="font-mono text-xs text-muted-foreground">{tripId}</p>
                    </div>
                    {seatId ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seat</p>
                        <p className="font-mono text-xs text-muted-foreground">{seatId}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ticket price</span>
                      <span className="font-medium text-foreground">{formatCurrency(preview.ticketMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span className="font-medium text-foreground">{formatCurrency(preview.platformFeeMinor)}</span>
                    </div>
                    <div className="border-t border-border/80 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Total</span>
                        <span className="text-lg font-semibold text-foreground">{formatCurrency(preview.totalMinor)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                    A confirmation email will be sent to{' '}
                    <span className={cn('font-medium text-foreground', !profile?.email && !guestEmailParam && 'text-muted-foreground')}>
                      {profile?.email?.trim() || guestEmailParam.trim() || 'the email you used when booking'}
                    </span>
                    .
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
