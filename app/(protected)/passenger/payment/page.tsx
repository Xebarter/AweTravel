'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency';
import { DEFAULT_PLATFORM_FEE_BPS } from '@/lib/platform-settings/constants';
import { fetchPublicPlatformSettings } from '@/lib/platform-settings/public-client';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';

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
    setCardDetails(prev => ({
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md border-border">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your booking has been confirmed. Redirecting to confirmation page...
            </p>
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full animate-pulse bg-primary/30 dark:bg-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background to-secondary/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Details</h1>
          <p className="text-muted-foreground">Secure payment with Paytota</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Enter Your Payment Details</CardTitle>
                <CardDescription>Your payment is secured with Paytota encryption</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePayment} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <label htmlFor="cardName" className="text-sm font-medium">
                      Cardholder Name
                    </label>
                    <Input
                      id="cardName"
                      name="cardName"
                      placeholder="John Doe"
                      value={cardDetails.cardName}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <label htmlFor="cardNumber" className="text-sm font-medium">
                      Card Number
                    </label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        name="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '');
                          if (/^\d*$/.test(value)) {
                            const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                            setCardDetails(prev => ({ ...prev, cardNumber: formatted }));
                          }
                        }}
                        required
                        disabled={loading}
                        maxLength={19}
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="expiryMonth" className="text-sm font-medium">
                        Month
                      </label>
                      <Input
                        id="expiryMonth"
                        name="expiryMonth"
                        placeholder="MM"
                        value={cardDetails.expiryMonth}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="expiryYear" className="text-sm font-medium">
                        Year
                      </label>
                      <Input
                        id="expiryYear"
                        name="expiryYear"
                        placeholder="YY"
                        value={cardDetails.expiryYear}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="cvv" className="text-sm font-medium">
                        CVV
                      </label>
                      <Input
                        id="cvv"
                        name="cvv"
                        placeholder="XXX"
                        type="password"
                        value={cardDetails.cvv}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                        maxLength={4}
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-start gap-3">
                    <Lock className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-success">
                      Your payment is encrypted and secure. We use PCI DSS compliant systems.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent hover:bg-accent-dark text-lg font-semibold py-6"
                  >
                    {loading ? 'Processing Payment...' : `Pay ${formatCurrency(bookingAmount)}`}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By clicking pay, you agree to AweTravel&apos;s payment terms
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-border sticky top-16">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trip ID</p>
                  <p className="font-mono text-sm text-foreground">{tripId}</p>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Ticket Price</span>
                    <span className="font-medium text-foreground">{formatCurrency(ticketPrice)}</span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Platform Fee</span>
                    <span className="font-medium text-foreground">{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-accent">{formatCurrency(bookingAmount)}</span>
                  </div>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                  A confirmation email will be sent to <strong>{profile?.email}</strong>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
