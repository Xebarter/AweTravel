'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, DollarSign, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';

export default function BookingsPage() {
  const bookings = [
    {
      id: 1,
      bookingId: 'AWE-2024-0001234',
      route: 'Lagos - Ibadan',
      date: '2024-05-20',
      departureTime: '08:00 AM',
      seat: 'A05',
      status: 'Confirmed',
      amount: 5250,
      company: 'Premium Travel Ltd',
    },
    {
      id: 2,
      bookingId: 'AWE-2024-0001233',
      route: 'Abuja - Kaduna',
      date: '2024-05-15',
      departureTime: '02:00 PM',
      seat: 'B12',
      status: 'Completed',
      amount: 3750,
      company: 'Safe Journey Coaches',
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-white/80 mt-1">View and manage your travel bookings</p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left Side - Trip Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-3">{booking.route}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{booking.date} at {booking.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Ticket className="h-4 w-4" />
                          <span>Seat: <strong className="text-accent">{booking.seat}</strong></span>
                        </div>
                        <div className="text-muted-foreground">
                          {booking.company}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Status & Amount */}
                    <div className="flex flex-col sm:items-end gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Amount</p>
                        <p className="text-2xl font-bold text-accent">{formatCurrency(booking.amount)}</p>
                      </div>
                      <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'Confirmed'
                            ? 'bg-success/10 text-success'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">No bookings yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Start your journey by booking a trip
              </p>
              <Link href="/passenger">
                <Button className="bg-accent hover:bg-accent-dark">
                  Find a Trip
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
