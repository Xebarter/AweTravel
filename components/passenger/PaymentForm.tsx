'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';
import { AlertCircle, CheckCircle, CreditCard, Lock } from 'lucide-react';

const MOCK_TOTAL_FALLBACK = 7500;

export type PaymentFormProps = {
  tripId: string;
  seatId?: string;
  bookingId?: string;
  platformFeeBps: number;
  /** Total to charge (ticket + platform fee). Defaults to mock amount on standalone payment demo route. */
  totalAmount?: number;
  embedded?: boolean;
  confirmationEmailHint?: string | null;
  /** Standalone payment page: parent shows full-screen success + redirect. */
  onPaymentSucceeded?: () => void;
  /** Embedded drawer: called after brief success UI (or immediately if onPaymentSucceeded omitted and embedded). */
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function PaymentForm({
  tripId,
  seatId,
  bookingId,
  platformFeeBps,
  totalAmount: totalAmountProp,
  embedded = false,
  confirmationEmailHint,
  onPaymentSucceeded,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const bookingAmount = totalAmountProp ?? MOCK_TOTAL_FALLBACK;
  const ticketPrice = Math.round(bookingAmount / (1 + platformFeeBps / 10000));
  const platformFee = bookingAmount - ticketPrice;

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (
        !cardDetails.cardNumber ||
        !cardDetails.cardName ||
        !cardDetails.expiryMonth ||
        !cardDetails.expiryYear ||
        !cardDetails.cvv
      ) {
        throw new Error('Please fill in all card details');
      }

      if (cardDetails.cardNumber.replace(/\s/g, '').length < 13) {
        throw new Error('Invalid card number');
      }

      if (cardDetails.cvv.length < 3) {
        throw new Error('Invalid CVV');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (onPaymentSucceeded) {
        onPaymentSucceeded();
        return;
      }

      setSuccess(true);

      const done = () => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
          router.push(`/passenger/booking-confirmation?tripId=${tripId}`);
        }
      };

      setTimeout(done, embedded ? 1200 : 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const inner = (
      <>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Payment successful</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your booking has been confirmed. Redirecting…
        </p>
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full animate-pulse bg-primary/30 dark:bg-primary/40" aria-hidden />
        </div>
      </>
    );

    if (embedded) {
      return <div className="px-1 py-4 text-center">{inner}</div>;
    }

    return (
      <div className="min-h-screen bg-background px-4 py-12 sm:px-6">
        <Card className="mx-auto w-full max-w-md border-border/80">
          <CardContent className="pt-10 pb-10 text-center">{inner}</CardContent>
        </Card>
      </div>
    );
  }

  const formBody = (
    <form onSubmit={handlePayment} className="space-y-6">
      {embedded && onCancel ? (
        <div className="flex justify-start">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 px-2" onClick={onCancel}>
            Back
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor={embedded ? 'embedded-cardName' : 'cardName'}>Cardholder name</Label>
          <Input
            id={embedded ? 'embedded-cardName' : 'cardName'}
            name="cardName"
            placeholder="John Doe"
            autoComplete="cc-name"
            value={cardDetails.cardName}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={embedded ? 'embedded-cardNumber' : 'cardNumber'}>Card number</Label>
          <div className="relative">
            <Input
              id={embedded ? 'embedded-cardNumber' : 'cardNumber'}
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardDetails.cardNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, '');
                if (/^\d*$/.test(value)) {
                  const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setCardDetails((prev) => ({ ...prev, cardNumber: formatted }));
                }
              }}
              required
              disabled={loading}
              maxLength={19}
              className="pr-10"
            />
            <CreditCard className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-xs text-muted-foreground">Numbers only. Spaces are added automatically.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor={embedded ? 'embedded-expiryMonth' : 'expiryMonth'}>Month</Label>
            <Input
              id={embedded ? 'embedded-expiryMonth' : 'expiryMonth'}
              name="expiryMonth"
              placeholder="MM"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              value={cardDetails.expiryMonth}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                setCardDetails((prev) => ({ ...prev, expiryMonth: v }));
              }}
              required
              disabled={loading}
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={embedded ? 'embedded-expiryYear' : 'expiryYear'}>Year</Label>
            <Input
              id={embedded ? 'embedded-expiryYear' : 'expiryYear'}
              name="expiryYear"
              placeholder="YY"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              value={cardDetails.expiryYear}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                setCardDetails((prev) => ({ ...prev, expiryYear: v }));
              }}
              required
              disabled={loading}
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={embedded ? 'embedded-cvv' : 'cvv'}>CVV</Label>
            <Input
              id={embedded ? 'embedded-cvv' : 'cvv'}
              name="cvv"
              placeholder="123"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cardDetails.cvv}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCardDetails((prev) => ({ ...prev, cvv: v }));
              }}
              required
              disabled={loading}
              maxLength={4}
            />
          </div>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground">
              Confirmation will be sent to <span className="font-medium text-foreground">{confirmationEmailHint}</span>.
            </p>
          ) : null}
        </div>
      ) : null}

      <Alert className="border-border/70">
        <Lock className="h-4 w-4 text-foreground/70" aria-hidden />
        <AlertTitle>Secure checkout</AlertTitle>
        <AlertDescription>
          Your payment is encrypted in transit. Use a card you have access to and double‑check the digits before paying.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing…' : `Pay ${formatCurrency(bookingAmount)}`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By clicking pay, you agree to AweTravel&apos;s payment terms.
        </p>
      </div>
    </form>
  );

  if (embedded) {
    return <div className="px-1">{formBody}</div>;
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Card details</CardTitle>
        <CardDescription>Your payment details stay private. We do not store full card numbers.</CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
