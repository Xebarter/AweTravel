'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentForm } from '@/components/passenger/PaymentForm';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings } from '@/lib/platform-settings/public-client';
import { CheckCircle, ChevronLeft } from 'lucide-react';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  const tripId = searchParams.get('tripId') || '';
  const seatId = searchParams.get('seatId') || '';

  useEffect(() => {
    if (!tripId) return;
    router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
  }, [tripId, router]);

  const [platformFeeBps, setPlatformFeeBps] = useState(DEFAULT_PLATFORM_FEE_BPS);

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

  const bookingAmount = 7500;
  const ticketPrice = Math.round(bookingAmount / (1 + platformFeeBps / 10000));
  const platformFee = bookingAmount - ticketPrice;

  useEffect(() => {
    if (!paymentSucceeded || !tripId) return;
    const t = window.setTimeout(() => {
      router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
      router.push(`/passenger/booking-confirmation?tripId=${tripId}`);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [paymentSucceeded, tripId, router]);

  if (paymentSucceeded) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 sm:px-6">
        <Card className="mx-auto w-full max-w-md border-border/80">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Payment successful</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your booking has been confirmed. Redirecting to confirmation page...
            </p>
            <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse bg-primary/30 dark:bg-primary/40" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Secure checkout. Review your order summary, then enter your card details to confirm.
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
                This page expects a <code className="font-mono">tripId</code> in the URL. Start from search/bookings to pay for a seat.
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-7">
              <PaymentForm
                tripId={tripId}
                seatId={seatId || undefined}
                platformFeeBps={platformFeeBps}
                totalAmount={bookingAmount}
                onPaymentSucceeded={() => setPaymentSucceeded(true)}
                confirmationEmailHint={profile?.email ?? undefined}
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
                      <span className="font-medium text-foreground">{formatCurrency(ticketPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span className="font-medium text-foreground">{formatCurrency(platformFee)}</span>
                    </div>
                    <div className="border-t border-border/80 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Total</span>
                        <span className="text-lg font-semibold text-foreground">{formatCurrency(bookingAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                    A confirmation email will be sent to{' '}
                    <span className={cn('font-medium text-foreground', !profile?.email && 'text-muted-foreground')}>
                      {profile?.email ?? 'the email you used when booking'}
                    </span>
                    .
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
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
