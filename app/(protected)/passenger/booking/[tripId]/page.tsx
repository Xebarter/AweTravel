'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SeatSelector } from '@/components/passenger/SeatSelector';
import { BookingSummary } from '@/components/passenger/BookingSummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Seat, AvailableRoute } from '@/lib/types';
import { AlertCircle } from 'lucide-react';

// Mock data - in production, fetch from API
const mockRoute: AvailableRoute = {
  trip_id: '1',
  route: {
    id: '1',
    company_id: '1',
    route_code: 'LI-001',
    origin_city: 'Lagos',
    destination_city: 'Ibadan',
    distance_km: 125,
    estimated_duration_minutes: 180,
    route_type: 'bus',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  schedule: {
    id: '1',
    route_id: '1',
    departure_time: '08:00 AM',
    arrival_time: '11:00 AM',
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  vehicle: {
    id: '1',
    company_id: '1',
    vehicle_registration: 'LG-2024-001',
    vehicle_type: 'bus',
    capacity: 50,
    current_status: 'active',
    created_at: new Date().toISOString(),
  },
  company: {
    id: '1',
    owner_user_id: '1',
    company_name: 'Premium Travel Ltd',
    registration_number: 'REG-2020-001',
    license_number: 'LIC-2020-001',
    verified: true,
    contact_email: 'info@premiumtravel.com',
    contact_phone: '+234 700 000 0001',
    headquarters_location: 'Lagos',
    created_at: new Date().toISOString(),
  },
  available_seats: Array.from({ length: 35 }, (_, i) => ({
    id: `seat-${i + 1}`,
    vehicle_id: '1',
    seat_number: `A${String(i + 1).padStart(2, '0')}`,
    seat_type: i < 5 ? 'premium' : i < 6 ? 'handicap' : 'regular',
    base_price: i < 5 ? 7500 : 5000,
    created_at: new Date().toISOString(),
  })),
  total_seats: 50,
  booked_seats: 15,
};

const bookedSeats = ['seat-3', 'seat-7', 'seat-12', 'seat-18', 'seat-22', 'seat-28'];

export default function BookingPage({
  params,
}: {
  params: { tripId: string };
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const [step, setStep] = useState<'seat' | 'summary' | 'payment'>('seat');
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const route = mockRoute; // In production, fetch based on tripId

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Not Authenticated</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please sign in to continue with your booking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
    setError('');
  };

  const handleProceedToSummary = () => {
    if (!selectedSeat) {
      setError('Please select a seat');
      return;
    }
    setStep('summary');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeat) {
      setError('Please select a seat');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Create booking in database and get payment reference
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to payment page
      router.push(`/passenger/payment?tripId=${params.tripId}&seatId=${selectedSeat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete Your Booking</h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'seat' || step === 'summary' || step === 'payment'
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Select Seat</span>

            <div className="h-px flex-1 bg-border"></div>

            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'summary' || step === 'payment'
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Review</span>

            <div className="h-px flex-1 bg-border"></div>

            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              step === 'payment'
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}>
              3
            </div>
            <span className="text-sm font-medium">Payment</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            {step === 'seat' && (
              <div className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-2xl">{route.route.origin_city} → {route.route.destination_city}</CardTitle>
                    <CardDescription>{route.company.company_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Departure: <span className="text-foreground font-medium">{route.schedule.departure_time}</span></p>
                    <p>Duration: <span className="text-foreground font-medium">{Math.floor(route.route.estimated_duration_minutes / 60)}h {route.route.estimated_duration_minutes % 60}m</span></p>
                  </CardContent>
                </Card>

                <SeatSelector
                  seats={route.available_seats}
                  bookedSeats={bookedSeats}
                  onSelect={handleSeatSelect}
                />

                <div className="flex gap-4">
                  <button
                    onClick={() => router.back()}
                    className="px-6 py-3 rounded-lg border border-border hover:bg-secondary/30 font-medium text-foreground transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProceedToSummary}
                    disabled={!selectedSeat}
                    className="flex-1 px-6 py-3 rounded-lg bg-accent hover:bg-accent-dark disabled:bg-muted disabled:text-muted-foreground font-medium text-accent-foreground transition"
                  >
                    Continue to Summary
                  </button>
                </div>
              </div>
            )}

            {step === 'summary' && selectedSeat && (
              <BookingSummary
                route={route}
                selectedSeat={selectedSeat}
                passengerName={profile.full_name}
                passengerEmail={profile.email}
                onConfirm={handleConfirmBooking}
                isLoading={loading}
              />
            )}
          </div>

          {/* Sidebar - Route Summary */}
          <div>
            <Card className="border-border sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Route</p>
                  <p className="font-semibold text-foreground">
                    {route.route.origin_city} → {route.route.destination_city}
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                  <p className="font-semibold text-foreground">{route.schedule.departure_time}</p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Selected Seat</p>
                  <p className="font-semibold text-lg text-accent">
                    {selectedSeat?.seat_number || 'Not selected'}
                  </p>
                </div>

                {selectedSeat && (
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="font-bold text-lg text-accent">
                      ₦{(selectedSeat.base_price + Math.round(selectedSeat.base_price * 0.05)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Includes 5% platform fee
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
