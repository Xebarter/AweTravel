'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Users, DollarSign, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([
    {
      id: '1',
      bookingId: 'AWE-2024-0001234',
      route: 'Lagos - Ibadan',
      date: '2024-05-20',
      passengerName: 'John Doe',
      seat: 'A05',
      status: 'Confirmed',
      amount: 5250,
      paymentStatus: 'Completed',
    },
    {
      id: '2',
      bookingId: 'AWE-2024-0001233',
      route: 'Lagos - Ibadan',
      date: '2024-05-20',
      passengerName: 'Jane Smith',
      seat: 'A10',
      status: 'Confirmed',
      amount: 7750,
      paymentStatus: 'Completed',
    },
    {
      id: '3',
      bookingId: 'AWE-2024-0001232',
      route: 'Abuja - Kaduna',
      date: '2024-05-19',
      passengerName: 'Ahmed Hassan',
      seat: 'B08',
      status: 'Completed',
      amount: 4050,
      paymentStatus: 'Completed',
    },
    {
      id: '4',
      bookingId: 'AWE-2024-0001231',
      route: 'Lagos - Ibadan',
      date: '2024-05-21',
      passengerName: 'Chioma Okafor',
      seat: 'A15',
      status: 'Pending',
      amount: 5250,
      paymentStatus: 'Pending',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Confirmed' | 'Completed' | 'Pending'>('All');

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.route.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'All' || booking.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'Confirmed').length,
    totalRevenue: bookings.reduce((sum, b) => sum + b.amount, 0),
    pendingPayments: bookings.filter(b => b.paymentStatus === 'Pending').length,
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">Bookings & Reservations</h1>
        <p className="text-white/80 mt-1">Monitor and manage passenger bookings</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalBookings}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Confirmed</p>
              <p className="text-3xl font-bold text-success">{stats.confirmedBookings}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Pending Payments</p>
              <p className="text-3xl font-bold text-warning">{stats.pendingPayments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="Search by booking ID, passenger name, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary/30"
          />
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Confirmed', 'Completed', 'Pending'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'bg-accent hover:bg-accent-dark' : ''}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Bookings Table */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-sm text-muted-foreground font-mono">{booking.bookingId}</p>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'Confirmed'
                            ? 'bg-success/10 text-success'
                            : booking.status === 'Completed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {booking.status}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-accent" />
                        {booking.route}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Passenger</p>
                          <p className="font-medium text-foreground">{booking.passengerName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Seat</p>
                          <p className="font-medium text-foreground text-accent">{booking.seat}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Date</p>
                          <p className="font-medium text-foreground">{booking.date}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Payment</p>
                          <p className={`font-medium ${
                            booking.paymentStatus === 'Completed'
                              ? 'text-success'
                              : 'text-warning'
                          }`}>
                            {booking.paymentStatus}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right - Amount & Action */}
                    <div className="flex flex-col items-end gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Amount</p>
                        <p className="text-2xl font-bold text-accent">{formatCurrency(booking.amount)}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
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
              <p className="text-lg text-muted-foreground mb-4">No bookings found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Bookings will appear here once passengers make reservations'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
