'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { Seat } from '@/lib/types';
import { AlertCircle } from 'lucide-react';

interface SeatSelectorProps {
  seats: Seat[];
  bookedSeats?: string[];
  onSelect: (seat: Seat) => void;
}

export function SeatSelector({ seats, bookedSeats = [], onSelect }: SeatSelectorProps) {
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    onSelect(seat);
  };

  const seatsByType = {
    regular: seats.filter(s => s.seat_type === 'regular'),
    premium: seats.filter(s => s.seat_type === 'premium'),
    handicap: seats.filter(s => s.seat_type === 'handicap'),
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Select Your Seat</CardTitle>
        <CardDescription>Choose your preferred seat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-secondary border border-border"></div>
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted border border-border"></div>
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent"></div>
            <span className="text-muted-foreground">Selected</span>
          </div>
        </div>

        {/* Seat Layout */}
        <div className="space-y-6">
          {/* Regular Seats */}
          {seatsByType.regular.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Regular Seats ({formatCurrency(5000)})
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {seatsByType.regular.map((seat) => {
                  const isBooked = bookedSeats.includes(seat.id);
                  const isSelected = selectedSeat?.id === seat.id;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => !isBooked && handleSeatClick(seat)}
                      disabled={isBooked}
                      className={`w-12 h-12 rounded-lg font-medium text-sm transition-all ${
                        isBooked
                          ? 'bg-muted border border-border cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-accent text-accent-foreground border border-accent-dark'
                          : 'bg-secondary hover:bg-secondary-foreground/20 border border-border'
                      }`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium Seats */}
          {seatsByType.premium.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Premium Seats ({formatCurrency(7500)})
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {seatsByType.premium.map((seat) => {
                  const isBooked = bookedSeats.includes(seat.id);
                  const isSelected = selectedSeat?.id === seat.id;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => !isBooked && handleSeatClick(seat)}
                      disabled={isBooked}
                      className={`w-12 h-12 rounded-lg font-medium text-sm transition-all ${
                        isBooked
                          ? 'bg-muted border border-border cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-accent text-accent-foreground border border-accent-dark'
                          : 'bg-secondary hover:bg-secondary-foreground/20 border border-border'
                      }`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Handicap Seats */}
          {seatsByType.handicap.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Accessible Seats ({formatCurrency(5000)})
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {seatsByType.handicap.map((seat) => {
                  const isBooked = bookedSeats.includes(seat.id);
                  const isSelected = selectedSeat?.id === seat.id;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => !isBooked && handleSeatClick(seat)}
                      disabled={isBooked}
                      className={`w-12 h-12 rounded-lg font-medium text-sm transition-all ${
                        isBooked
                          ? 'bg-muted border border-border cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-accent text-accent-foreground border border-accent-dark'
                          : 'bg-secondary hover:bg-secondary-foreground/20 border border-border'
                      }`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {selectedSeat && (
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm font-medium text-foreground">
              Selected Seat: <span className="text-accent font-bold">{selectedSeat.seat_number}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Price: <span className="text-accent font-semibold">{formatCurrency(selectedSeat.base_price)}</span>
            </p>
          </div>
        )}

        {!selectedSeat && (
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm text-warning">Please select a seat to continue</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
