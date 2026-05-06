'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { startPaytotaCheckout } from '@/lib/payments/start-paytota-checkout-client';
import { AlertCircle, ExternalLink } from 'lucide-react';

const MOCK_TOTAL_FALLBACK = 7500;

export type PaymentFormProps = {
  tripId: string;
  /** Single-booking checkout (one of bookingId / checkoutGroupId required). */
  bookingId?: string;
  /** Multi-ticket checkout: one Paytota purchase for the whole group. */
  checkoutGroupId?: string;
  platformFeeBps: number;
  /** Total to charge (ticket + platform fee). */
  totalAmount?: number;
  /** Number of seats (for labels only). Defaults from ids when omitted. */
  ticketCount?: number;
  /** For guest checkout, must match the booking’s guest email. */
  guestEmail?: string;
  confirmationEmailHint?: string | null;
  onCancel?: () => void;
};

export function PaymentForm({
  tripId,
  bookingId,
  checkoutGroupId,
  platformFeeBps,
  totalAmount: totalAmountProp,
  ticketCount: ticketCountProp,
  guestEmail,
  confirmationEmailHint,
  onCancel,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bookingAmount = totalAmountProp ?? MOCK_TOTAL_FALLBACK;
  const ticketPrice = Math.round(bookingAmount / (1 + platformFeeBps / 10000));
  const platformFee = bookingAmount - ticketPrice;
  const ticketCount = ticketCountProp ?? 1;

  const handlePay = async () => {
    setError('');
    const hasGroup = Boolean(checkoutGroupId?.trim());
    const hasBooking = Boolean(bookingId?.trim());
    if (!hasGroup && !hasBooking) {
      setError('Missing booking reference. Go back and confirm your booking again.');
      return;
    }
    if (hasGroup && hasBooking) {
      setError('Invalid checkout state. Refresh and try again.');
      return;
    }
    if (guestEmail !== undefined && !guestEmail.trim()) {
      setError('Email is required to continue to payment.');
      return;
    }

    setLoading(true);
    try {
      if (hasGroup) {
        await startPaytotaCheckout({
          checkoutGroupId: checkoutGroupId!.trim(),
          tripId,
          ...(guestEmail?.trim() ? { guestEmail: guestEmail.trim() } : {}),
        });
      } else {
        await startPaytotaCheckout({
          bookingId: bookingId!.trim(),
          tripId,
          ...(guestEmail?.trim() ? { guestEmail: guestEmail.trim() } : {}),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be started. Please try again.');
      setLoading(false);
    }
  };

  const refLabel = checkoutGroupId?.trim() ? checkoutGroupId.trim() : bookingId?.trim();
  const ticketLabel = ticketCount > 1 ? 'Tickets' : 'Ticket';

  return (
    <div className="space-y-5 px-1">
      {onCancel ? (
        <div className="flex justify-start">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 px-2" onClick={onCancel} disabled={loading}>
            Back
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle className="text-sm">Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {ticketLabel}
            {ticketCount > 1 ? (
              <span className="text-muted-foreground/80"> · ×{ticketCount}</span>
            ) : null}
          </span>
          <span className="font-medium text-foreground">{formatCurrency(ticketPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Fee</span>
          <span className="font-medium text-foreground">{formatCurrency(platformFee)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border/80 pt-3 font-semibold">
          <span className="text-foreground">Total</span>
          <span className="text-lg text-foreground">{formatCurrency(bookingAmount)}</span>
        </div>
        {refLabel ? (
          <p className="font-mono text-[10px] text-muted-foreground">
            Ref · {refLabel.slice(0, 8)}…{checkoutGroupId ? ' (group)' : ''}
          </p>
        ) : null}
        {confirmationEmailHint ? (
          <p className="wrap-break-word text-xs text-muted-foreground">
            Receipt · <span className="font-medium text-foreground">{confirmationEmailHint}</span>
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Pay on Paytota (card or mobile money). You’ll return here when done.
      </p>

      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          disabled={loading}
          className="h-12 w-full gap-2 text-base font-semibold shadow-sm"
          onClick={() => void handlePay()}
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
        <p className="text-center text-[11px] text-muted-foreground">
          Continues to Paytota.{' '}
          <a href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </a>
        </p>
      </div>
    </div>
  );
}
