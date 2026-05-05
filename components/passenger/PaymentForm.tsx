'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { getSupabaseAuthHeaderInit } from '@/lib/supabase';
import { AlertCircle, ExternalLink, Lock } from 'lucide-react';

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

      <p className="text-sm text-muted-foreground">
        You’ll complete payment on Paytota’s secure page (cards, mobile money, and other methods your operator enables).
        After paying, you’ll return here to see your confirmation.
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
            <p className="break-words text-xs text-muted-foreground">
              Receipt goes to{' '}
              <span className="font-medium text-foreground">{confirmationEmailHint}</span>.
            </p>
          ) : null}
        </div>
      ) : null}

      <Alert className="border-border/70">
        <Lock className="h-4 w-4 text-foreground/70" aria-hidden />
        <AlertTitle>Secure checkout</AlertTitle>
        <AlertDescription>
          AweTravel does not collect card or mobile-money PINs. Paytota handles payment details on their hosted checkout.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button type="button" disabled={loading} className="w-full gap-2" onClick={() => void startCheckout()}>
          {loading ? (
            'Redirecting…'
          ) : (
            <>
              Pay {formatCurrency(bookingAmount)}
              <ExternalLink className="size-4 opacity-80" aria-hidden />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to AweTravel&apos;s payment terms and Paytota&apos;s checkout policies.
        </p>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="px-1">{formBody}</div>;
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Pay with Paytota</CardTitle>
        <CardDescription>Hosted checkout — you’ll be redirected to complete payment.</CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
