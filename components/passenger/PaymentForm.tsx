'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { getSupabaseAuthHeaderInit } from '@/lib/supabase';
import { AlertCircle, CreditCard, ExternalLink, Lock, Sparkles } from 'lucide-react';

const MOCK_TOTAL_FALLBACK = 7500;

export type PaymentFormProps = {
  tripId: string;
  seatId?: string;
  bookingId?: string;
  platformFeeBps: number;
  /** Total to charge (ticket + platform fee). */
  totalAmount?: number;
  /** For guest checkout, must match the booking’s guest email. */
  guestEmail?: string;
  /** Sent to Paytota return URLs for redirect to confirmation. */
  returnTripId?: string;
  embedded?: boolean;
  confirmationEmailHint?: string | null;
  onCancel?: () => void;
};

export function PaymentForm({
  tripId,
  seatId,
  bookingId,
  platformFeeBps,
  totalAmount: totalAmountProp,
  guestEmail,
  returnTripId,
  embedded = false,
  confirmationEmailHint,
  onCancel,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bookingAmount = totalAmountProp ?? MOCK_TOTAL_FALLBACK;
  const ticketPrice = Math.round(bookingAmount / (1 + platformFeeBps / 10000));
  const platformFee = bookingAmount - ticketPrice;

  const startCheckout = async () => {
    setError('');
    if (!bookingId?.trim()) {
      setError('Missing booking reference. Go back and confirm your booking again.');
      return;
    }
    if (guestEmail !== undefined && !guestEmail.trim()) {
      setError('Email is required to continue to payment.');
      return;
    }

    setLoading(true);
    try {
      const authHeaders = await getSupabaseAuthHeaderInit();
      const res = await fetch('/api/payments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          bookingId: bookingId.trim(),
          ...(guestEmail?.trim() ? { guestEmail: guestEmail.trim() } : {}),
          ...(returnTripId?.trim() ? { tripId: returnTripId.trim() } : { tripId: tripId }),
        }),
      });
      const json = (await res.json()) as { success?: boolean; checkoutUrl?: string; error?: string };
      if (!res.ok || !json.success || !json.checkoutUrl) {
        throw new Error(json.error || 'Could not start checkout');
      }
      window.location.assign(json.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be started. Please try again.');
      setLoading(false);
    }
  };

  const formBody = (
    <div className="space-y-6">
      {embedded && onCancel ? (
        <div className="flex justify-start">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 px-2" onClick={onCancel} disabled={loading}>
            Back
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Checkout error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm leading-relaxed text-muted-foreground">
        You’ll complete payment on Paytota’s secure page — cards, mobile money, and other methods your operator enables.
        After paying, you’ll return here while we finalize your confirmation.
      </p>

      {embedded ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Ticket price</span>
            <span className="font-medium text-foreground">{formatCurrency(ticketPrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Platform fee</span>
            <span className="font-medium text-foreground">{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/80 pt-3 font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-lg text-foreground">{formatCurrency(bookingAmount)}</span>
          </div>
          {bookingId ? (
            <p className="text-xs text-muted-foreground font-mono">Booking ref: {bookingId}</p>
          ) : null}
          {confirmationEmailHint ? (
            <p className="wrap-break-word text-xs text-muted-foreground">
              Receipt goes to{' '}
              <span className="font-medium text-foreground">{confirmationEmailHint}</span>.
            </p>
          ) : null}
        </div>
      ) : null}

      <Alert className="border-primary/20 bg-primary/5">
        <Lock className="h-4 w-4 text-primary" aria-hidden />
        <AlertTitle>Secure checkout</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          AweTravel does not collect card or mobile-money PINs. Paytota handles payment details on their hosted page.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          disabled={loading}
          className="h-12 w-full gap-2 text-base font-semibold shadow-md shadow-primary/20"
          onClick={() => void startCheckout()}
        >
          {loading ? (
            'Redirecting…'
          ) : (
            <>
              Pay {formatCurrency(bookingAmount)}
              <ExternalLink className="size-4 opacity-90" aria-hidden />
            </>
          )}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to AweTravel&apos;s payment terms and Paytota&apos;s checkout policies.
        </p>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="px-1">{formBody}</div>;
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      <CardHeader className="relative space-y-0 border-b border-border/60 bg-linear-to-br from-muted/40 via-background to-background px-6 py-6">
        <div className="pointer-events-none absolute right-4 top-4 opacity-[0.07] dark:opacity-[0.12]" aria-hidden>
          <Sparkles className="size-24 text-primary" strokeWidth={1} />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner">
            <CreditCard className="size-6" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Pay with Paytota</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Hosted checkout — you’ll be redirected to complete payment in a few seconds.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6 sm:px-8 sm:py-8">{formBody}</CardContent>
    </Card>
  );
}
