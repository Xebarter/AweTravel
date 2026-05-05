'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { Seat } from '@/lib/types';
import { platformFeeFromBps } from '@/lib/platform-settings/public-client';
import { MapPin, Calendar } from 'lucide-react';

interface BookingSummaryProps {
  route: AvailableRoute;
  selectedSeat: Seat;
  passengerName: string;
  passengerEmail: string;
  /** Basis points (e.g. 500 = 5%). */
  platformFeeBps: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BookingSummary({
  route,
  selectedSeat,
  passengerName,
  passengerEmail,
  platformFeeBps,
  onConfirm,
  isLoading = false,
}: BookingSummaryProps) {
  const platformFee = platformFeeFromBps(selectedSeat.base_price, platformFeeBps);
  const totalPrice = selectedSeat.base_price + platformFee;
  const feePctLabel =
    platformFeeBps % 100 === 0
      ? String(platformFeeBps / 100)
      : (platformFeeBps / 100).toFixed(2).replace(/\.?0+$/, '');

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
        <CardDescription>Review your booking details before payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Route Details</h4>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-accent mt-0.5" />
              <div>
                <p className="text-muted-foreground">Route</p>
                <p className="break-words font-medium text-foreground">
                  {route.route.origin_city} → {route.route.destination_city}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-muted-foreground">Company</span>
              <p className="font-medium text-foreground">{route.company.company_name}</p>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-accent mt-0.5" />
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium text-foreground">
                  {route.schedule.departure_time} - {route.schedule.arrival_time}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Passenger Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Passenger Details</h4>

          <div className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Name</p>
              <p className="break-words font-medium text-foreground">{passengerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Email</p>
              <p className="break-words font-medium text-foreground">{passengerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Seat Number</p>
              <p className="font-medium text-foreground text-lg text-accent">{selectedSeat.seat_number}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Price Breakdown</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Price</span>
              <span className="font-medium text-foreground">{formatCurrency(selectedSeat.base_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee ({feePctLabel}%)</span>
              <span className="font-medium text-foreground">{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Total Amount</span>
              <span className="font-bold text-lg text-accent">{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
          <p>By confirming, you agree to AweTravel&apos;s terms and conditions. A confirmation email will be sent to {passengerEmail}.</p>
        </div>

        {/* Action Button */}
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-dark text-lg font-semibold py-6"
        >
          {isLoading ? 'Processing...' : 'Proceed to Payment'}
        </Button>
      </CardContent>
    </Card>
  );
}
