'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings } from '@/lib/platform-settings/public-client';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, ChevronLeft, CreditCard, Lock } from 'lucide-react';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const tripId = searchParams.get('tripId') || '';
  const seatId = searchParams.get('seatId') || '';

  useEffect(() => {
    if (!tripId) return;
    router.prefetch(`/passenger/booking-confirmation?tripId=${tripId}`);
  }, [tripId, router]);

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

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

  // Mock booking details (total includes platform fee per current bps)
  const bookingAmount = 7500;
  const ticketPrice = Math.round(bookingAmount / (1 + platformFeeBps / 10000));
  const platformFee = bookingAmount - ticketPrice;

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
      // Validate card details
      if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvv) {
        throw new Error('Please fill in all card details');
      }

      if (cardDetails.cardNumber.length < 13) {
        throw new Error('Invalid card number');
      }

      if (cardDetails.cvv.length < 3) {
        throw new Error('Invalid CVV');
      }

      // In production, this would call Paytota API through the backend
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(true);

      // Redirect to booking confirmation after 2 seconds
      setTimeout(() => {
        const next = `/passenger/booking-confirmation?tripId=${tripId}`;
        router.prefetch(next);
        router.push(next);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
                <Link href="/passenger/bookings">
                  <ChevronLeft className="size-4" aria-hidden />
                  Back to bookings
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
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">Card details</CardTitle>
                  <CardDescription>Your payment details stay private. We do not store full card numbers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePayment} className="space-y-6">
                    {error ? (
                      <Alert variant="destructive" className="border-destructive/40">
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        <AlertTitle>Payment failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Cardholder name</Label>
                        <Input
                          id="cardName"
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
                        <Label htmlFor="cardNumber">Card number</Label>
                        <div className="relative">
                          <Input
                            id="cardNumber"
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
                          <Label htmlFor="expiryMonth">Month</Label>
                          <Input
                            id="expiryMonth"
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
                          <Label htmlFor="expiryYear">Year</Label>
                          <Input
                            id="expiryYear"
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
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
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
                </CardContent>
              </Card>
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
                      {profile?.email ?? 'your account email'}
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
