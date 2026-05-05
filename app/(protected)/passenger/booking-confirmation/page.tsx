'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { Download, Share2, CheckCircle, MapPin, Calendar, Clock, Users, DollarSign } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get('tripId') || '1';

  // Mock confirmation data
  const confirmation = {
    bookingId: 'AWE-2024-0001234',
    tripId: tripId,
    passengerName: 'John Doe',
    route: 'Lagos → Ibadan',
    seat: 'A05',
    date: 'May 20, 2024',
    departureTime: '08:00 AM',
    arrivalTime: '11:00 AM',
    company: 'Premium Travel Ltd',
    ticketPrice: 5000,
    platformFee: 250,
    totalAmount: 5250,
    status: 'Confirmed',
  };

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-br from-background to-secondary/30">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">Your ticket has been successfully booked</p>
        </div>

        {/* Booking Details Card */}
        <Card className="border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Booking Details</span>
              <span className="text-sm bg-success/10 text-success px-3 py-1 rounded-full font-medium">
                {confirmation.status}
              </span>
            </CardTitle>
            <CardDescription>Booking ID: {confirmation.bookingId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route Information */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Trip Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-semibold text-foreground">{confirmation.route}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold text-foreground">{confirmation.date}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departure - Arrival</p>
                      <p className="font-semibold text-foreground">
                        {confirmation.departureTime} - {confirmation.arrivalTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Seat Number</p>
                      <p className="font-semibold text-lg text-accent">{confirmation.seat}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Transport Company</p>
              <p className="font-semibold text-foreground">{confirmation.company}</p>
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-border pt-6">
              <h3 className="font-semibold text-foreground mb-4">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ticket Price</span>
                  <span className="font-medium text-foreground">{formatCurrency(confirmation.ticketPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium text-foreground">{formatCurrency(confirmation.platformFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total Paid</span>
                  <span className="font-bold text-lg text-accent">{formatCurrency(confirmation.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <h4 className="font-semibold text-warning mb-2">Important Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>A confirmation email has been sent to your email address</li>
                <li>Please arrive 30 minutes before departure time</li>
                <li>Keep your booking ID for check-in</li>
                <li>Cancellations must be made 24 hours before departure</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Button variant="outline" className="gap-2" disabled>
            <Download className="h-4 w-4" />
            Download Ticket
          </Button>
          <Button variant="outline" className="gap-2" disabled>
            <Share2 className="h-4 w-4" />
            Share Booking
          </Button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/passenger/bookings" className="flex-1">
            <Button variant="outline" className="w-full">
              View All Bookings
            </Button>
          </Link>
          <Link href="/passenger/dashboard" className="flex-1">
            <Button className="w-full bg-accent hover:bg-accent-dark">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <Card className="border-border mt-8 bg-secondary/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@awetravel.com" className="text-accent hover:underline font-medium">
                support@awetravel.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
