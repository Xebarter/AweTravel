'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import type { RouteType, Seat } from '@/lib/types';
import { VehicleSeatMap } from '@/components/passenger/VehicleSeatMap';
import { AlertCircle } from 'lucide-react';

interface SeatSelectorProps {
  seats: Seat[];
  bookedSeats?: string[];
  onSelect: (seat: Seat) => void;
  vehicleType: RouteType;
  registration?: string;
  routeLabel?: string;
}

export function SeatSelector({
  seats,
  bookedSeats = [],
  onSelect,
  vehicleType,
  registration,
  routeLabel,
}: SeatSelectorProps) {
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    onSelect(seat);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Select Your Seat</CardTitle>
        <CardDescription>
          Tap a seat on the vehicle layout — front rows are toward the top.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg border border-border bg-secondary" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg border border-border bg-muted opacity-55 line-through decoration-muted-foreground" />
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg border-2 border-accent bg-accent" />
            <span className="text-muted-foreground">Selected</span>
          </div>
        </div>

        {seats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No seats available for this departure.</p>
        ) : (
          <VehicleSeatMap
            seats={seats}
            bookedSeatCodes={bookedSeats}
            selectedSeatId={selectedSeat?.id ?? null}
            onSeatSelect={handleSeatClick}
            vehicleType={vehicleType}
            registration={registration}
            routeLabel={routeLabel}
          />
        )}

        {selectedSeat ? (
          <div className="rounded-lg border border-accent/20 bg-accent/10 p-4">
            <p className="text-sm font-medium text-foreground">
              Selected seat: <span className="font-bold text-accent">{selectedSeat.seat_number}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Price:{' '}
              <span className="font-semibold text-accent">{formatCurrency(selectedSeat.base_price)}</span>
            </p>
          </div>
        ) : (
          <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <p className="text-sm text-warning">Please select a seat to continue</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
