'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/currency';
import { MapPin, Calendar, Users, Search, Clock, DollarSign } from 'lucide-react';

export default function PassengerDashboard() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!origin || !destination || !date) {
      alert('Please fill in all fields');
      return;
    }
    setSearching(true);
    // Navigate to search results page
    const searchParams = new URLSearchParams({
      from: origin,
      to: destination,
      date: date,
    });
    router.push(`/passenger/search?${searchParams.toString()}`);
  };

  const recentBookings = [
    {
      id: 1,
      route: 'Lagos - Ibadan',
      date: '2024-05-15',
      status: 'Completed',
      amount: 5000,
    },
    {
      id: 2,
      route: 'Abuja - Kaduna',
      date: '2024-05-10',
      status: 'Completed',
      amount: 3500,
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Section with Search */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Find Your Journey</h1>
          <p className="text-white/80 mb-8">Search and book trips from trusted transport companies</p>

          {/* Search Form */}
          <Card className="border-0 shadow-xl bg-white">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-5 gap-4">
                {/* Origin */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    From
                  </label>
                  <Input
                    placeholder="Departure city"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="bg-secondary/30"
                  />
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    To
                  </label>
                  <Input
                    placeholder="Arrival city"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-secondary/30"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-secondary/30"
                  />
                </div>

                {/* Passengers */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Passengers
                  </label>
                  <Input
                    type="number"
                    min="1"
                    defaultValue="1"
                    className="bg-secondary/30"
                  />
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={searching}
                    className="w-full bg-accent hover:bg-accent-dark text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Bookings Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">Your Recent Bookings</h2>

        <div className="grid gap-4">
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">{booking.route}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {booking.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold text-accent text-lg">{formatCurrency(booking.amount)}</p>
                      </div>
                      <div className="px-3 py-1 bg-success/10 text-success text-sm rounded-full font-medium">
                        {booking.status}
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground mb-4">No bookings yet</p>
                <Button className="bg-accent hover:bg-accent-dark">Book Your First Trip</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-secondary/30 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Your Travel Statistics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Trips</p>
                    <p className="text-3xl font-bold text-foreground">2</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(8500)}</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hours Traveled</p>
                    <p className="text-3xl font-bold text-foreground">4.5</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
