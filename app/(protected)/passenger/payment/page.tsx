'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentForm } from '@/components/passenger/PaymentForm';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { getSupabaseAuthHeaderInit } from '@/lib/supabase';
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  Mail,
  Receipt,
  ShieldCheck,
  Ticket,
} from 'lucide-react';

type PreviewData = {
  totalMinor: number;
  platformFeeBps: number;
  ticketMinor: number;
  platformFeeMinor: number;
  bookingCode?: string | null;
};

function truncateRef(id: string, head = 6, tail = 4) {
  const t = id.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function PaymentPageSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background to-secondary/30 pb-16">
      <div className="border-b border-border/70 bg-linear-to-b from-primary/8 via-background to-background dark:from-primary/12">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
          <Skeleton className="h-9 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-4/5 max-w-lg" />
          </div>
          <Skeleton className="h-14 w-full max-w-2xl rounded-xl" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const tripId = searchParams.get('tripId') || '';
  const seatId = searchParams.get('seatId') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const guestEmailParam = searchParams.get('guestEmail') || '';

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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
            bookingCode?: string | null;
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

  const confirmationEmail =
    profile?.email?.trim() || guestEmailParam.trim() || 'the email you used when booking';

  const checkoutSteps = (includeTrip: boolean) => (
    <nav aria-label="Checkout progress" className="w-full max-w-2xl">
      <ol className="flex items-center gap-2 sm:gap-4">
        <li className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Step 1</p>
            <p className="truncate text-sm font-semibold text-foreground">Seat &amp; booking</p>
          </div>
        </li>
        <div className="hidden h-px min-w-6 flex-1 bg-border sm:block" aria-hidden />
        <li className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary shadow-sm ring-4 ring-primary/15"
            aria-current="step"
          >
            <CreditCard className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Step 2</p>
            <p className="truncate text-sm font-semibold text-foreground">Payment</p>
          </div>
        </li>
        <div className="hidden h-px min-w-6 flex-1 bg-border sm:block" aria-hidden />
        <li className="flex min-w-0 flex-1 items-center gap-2 opacity-70">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted/50 text-muted-foreground"
            aria-hidden
          >
            <Receipt className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Step 3</p>
            <p className="truncate text-sm font-semibold text-muted-foreground">Confirmation</p>
          </div>
        </li>
      </ol>
      {includeTrip ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Trip ref:{' '}
          <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[0.7rem] text-foreground/90" title={tripId}>
            {truncateRef(tripId)}
          </code>
        </p>
      ) : null}
    </nav>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-secondary/30 pb-16">
      <div className="relative border-b border-border/70 bg-linear-to-b from-primary/8 via-accent/5 to-background dark:from-primary/12 dark:via-accent/8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.18),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-6 px-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={profile ? '/passenger/bookings' : '/'}>
              <ChevronLeft className="size-4" aria-hidden />
              {profile ? 'Back to bookings' : 'Back to home'}
            </Link>
          </Button>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                Secure checkout with Paytota
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Complete your payment</h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                You’ll be redirected to Paytota’s hosted page to pay safely. When you’re done, you’ll return here while we
                confirm your booking.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pt-2">
              <Badge variant="secondary" className="font-medium">
                Cards &amp; mobile money
              </Badge>
              <Badge variant="outline" className="border-primary/25 bg-primary/5 font-normal text-foreground">
                Powered by Paytota
              </Badge>
            </div>
          </div>

          <div className="mt-10">{checkoutSteps(Boolean(tripId))}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {!tripId ? (
          <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10">
            <CardHeader className="border-b border-border/60 bg-muted/25 pb-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Bus className="size-6" aria-hidden />
              </div>
              <CardTitle className="pt-2 text-xl">No trip selected</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                This page needs a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">tripId</code> in the
                URL. Start from search or your bookings to pay for a seat.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap">
              <Button asChild className="gap-2 sm:w-auto">
                <Link href="/passenger/search">
                  Search trips
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/passenger/bookings">My bookings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !bookingId ? (
          <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10">
            <CardHeader className="border-b border-border/60 bg-muted/25 pb-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Ticket className="size-6" aria-hidden />
              </div>
              <CardTitle className="pt-2 text-xl">No booking to pay yet</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Choose a seat and confirm your booking first. Then you can return here to pay.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button asChild className="gap-2">
                <Link href={`/passenger/booking/${tripId}`}>
                  Continue booking
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : previewLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">Preparing your checkout…</p>
            <p className="max-w-sm text-center text-sm text-muted-foreground">Hang on while we verify your booking and totals.</p>
          </div>
        ) : previewError ? (
          <Card className="overflow-hidden border-destructive/35 shadow-md ring-1 ring-destructive/10">
            <CardHeader className="border-b border-destructive/15 bg-destructive/5 pb-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-6" aria-hidden />
              </div>
              <CardTitle className="pt-2 text-xl text-destructive">Could not open checkout</CardTitle>
              <CardDescription className="text-base text-destructive/90">{previewError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
              <Button asChild variant="outline">
                <Link href={`/passenger/booking/${tripId}`}>Back to booking</Link>
              </Button>
              <Button asChild variant="ghost" className="text-muted-foreground">
                <Link href="/passenger/bookings">My bookings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : preview ? (
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <section className="order-2 lg:order-0 lg:col-span-7">
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

            <aside className="order-1 lg:order-0 lg:col-span-5">
              <Card className="lg:sticky lg:top-20 overflow-hidden border-border/80 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 pb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Receipt className="size-5" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-wider">Summary</span>
                  </div>
                  <CardTitle className="text-xl font-semibold tracking-tight">Order total</CardTitle>
                  <CardDescription>Double-check the breakdown before you pay.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm">
                    {preview.bookingCode ? (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Booking</p>
                        <p className="text-right font-mono text-sm font-semibold text-foreground">{preview.bookingCode}</p>
                      </div>
                    ) : null}
                    <Separator className="bg-border/80" />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Trip reference</span>
                      <code
                        className="max-w-[55%] truncate rounded bg-muted/80 px-2 py-0.5 text-right font-mono text-xs text-foreground/90"
                        title={tripId}
                      >
                        {truncateRef(tripId)}
                      </code>
                    </div>
                    {seatId ? (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Seat</span>
                        <span className="font-semibold tabular-nums text-foreground">{seatId}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Ticket price</span>
                      <span className="font-medium tabular-nums text-foreground">{formatCurrency(preview.ticketMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(preview.platformFeeMinor)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-3 dark:bg-primary/15">
                      <span className="text-sm font-semibold text-foreground">Total due</span>
                      <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                        {formatCurrency(preview.totalMinor)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Confirmation and receipt go to{' '}
                      <span
                        className={cn(
                          'font-medium text-foreground',
                          !profile?.email && !guestEmailParam && 'italic text-muted-foreground',
                        )}
                      >
                        {confirmationEmail}
                      </span>
                      .
                    </p>
                  </div>

                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    <span>We never see your card or wallet PIN — Paytota handles payment details on their secure page.</span>
                  </p>
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
    <Suspense fallback={<PaymentPageSkeleton />}>
      <PaymentContent />
    </Suspense>
  );
}
