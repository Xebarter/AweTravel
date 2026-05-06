'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import type { RouteType, Seat } from '@/lib/types';
import { VehicleSeatMap } from '@/components/passenger/VehicleSeatMap';
import { AlertCircle } from 'lucide-react';

interface SeatSelectorProps {
  seats: Seat[];
  bookedSeats?: string[];
  /** Controlled multi-selection (order preserved). */
  selectedSeats: Seat[];
  /** Max selectable seats (e.g. 1 when resuming a single pending booking). */
  maxTickets: number;
  onToggleSeat: (seat: Seat) => void;
  vehicleType: RouteType;
  passengerCapacity?: number;
  registration?: string;
  routeLabel?: string;
}

export function SeatSelector({
  seats,
  bookedSeats = [],
  selectedSeats,
  maxTickets,
  onToggleSeat,
  vehicleType,
  passengerCapacity,
  registration,
  routeLabel,
}: SeatSelectorProps) {
  const handleSeatClick = (seat: Seat) => {
    onToggleSeat(seat);
  };

  const subtotal = selectedSeats.reduce((s, x) => s + x.base_price, 0);

  return (
    <Card id="seat-map" className="scroll-mt-24 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Seat map</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Front of vehicle at the top.
          {maxTickets > 1 ? (
            <>
              {' '}
              Tap up to {maxTickets} seats ({selectedSeats.length}/{maxTickets} selected).
            </>
          ) : (
            <> Tap a seat to select it.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
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
          <p className="text-sm text-muted-foreground">No seats left.</p>
        ) : (
          <VehicleSeatMap
            seats={seats}
            bookedSeatCodes={bookedSeats}
            selectedSeatIds={selectedSeats.map((s) => s.id)}
            onSeatSelect={handleSeatClick}
            vehicleType={vehicleType}
            passengerCapacity={passengerCapacity}
            registration={registration}
            routeLabel={routeLabel}
          />
        )}

        {selectedSeats.length > 0 ? (
          <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-accent">
                {selectedSeats.map((s) => s.seat_number).join(', ')}
              </span>
              {selectedSeats.length > 1 ? (
                <span className="text-muted-foreground">
                  {' '}
                  · {selectedSeats.length} tickets
                </span>
              ) : null}
            </p>
            <p className="text-sm tabular-nums font-medium text-foreground">
              Subtotal <span className="text-muted-foreground">·</span> {formatCurrency(subtotal)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2">
            <AlertCircle className="size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-sm text-warning">Select at least one seat</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
