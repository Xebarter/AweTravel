'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MapPin, Truck, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function TransporterDashboard() {
  // Revenue data for the chart
  const revenueData = [
    { day: 'Mon', revenue: 125000, bookings: 15 },
    { day: 'Tue', revenue: 180000, bookings: 22 },
    { day: 'Wed', revenue: 160000, bookings: 19 },
    { day: 'Thu', revenue: 210000, bookings: 25 },
    { day: 'Fri', revenue: 245000, bookings: 30 },
    { day: 'Sat', revenue: 280000, bookings: 35 },
    { day: 'Sun', revenue: 200000, bookings: 24 },
  ];

  const dailyBookings = [
    { date: 'May 15', bookings: 18 },
    { date: 'May 16', bookings: 22 },
    { date: 'May 17', bookings: 25 },
    { date: 'May 18', bookings: 30 },
    { date: 'May 19', bookings: 28 },
    { date: 'May 20', bookings: 35 },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">Transporter Dashboard</h1>
        <p className="text-white/80 mt-1">Monitor your operations and performance</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Weekly Revenue</p>
                  <p className="text-3xl font-bold text-foreground">₦1.4M</p>
                  <p className="text-xs text-success mt-2">+12% from last week</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Active Routes</p>
                  <p className="text-3xl font-bold text-foreground">8</p>
                  <p className="text-xs text-muted-foreground mt-2">Across 3 regions</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Vehicles</p>
                  <p className="text-3xl font-bold text-foreground">12</p>
                  <p className="text-xs text-warning mt-2">1 in maintenance</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
                  <p className="text-3xl font-bold text-foreground">170</p>
                  <p className="text-xs text-success mt-2">This week</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <Users className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Weekly Revenue & Bookings</CardTitle>
              <CardDescription>Performance over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₦)" />
                  <Bar yAxisId="right" dataKey="bookings" fill="#10b981" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bookings Trend */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Daily bookings over the past 6 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Management Links */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Management</CardTitle>
              <CardDescription>Manage your operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/transporter/routes">
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Routes
                </Button>
              </Link>
              <Link href="/transporter/vehicles">
                <Button variant="outline" className="w-full justify-start">
                  <Truck className="h-4 w-4 mr-2" />
                  Manage Vehicles
                </Button>
              </Link>
              <Link href="/transporter/schedules">
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Schedules
                </Button>
              </Link>
              <Link href="/transporter/bookings">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View Bookings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
              <CardDescription>Important updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Vehicle Maintenance Due</p>
                  <p className="text-muted-foreground text-xs mt-1">Vehicle LG-2023-005 requires scheduled maintenance</p>
                </div>
              </div>

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success">High Booking Volume</p>
                  <p className="text-muted-foreground text-xs mt-1">35 bookings today - your best day this week!</p>
                </div>
              </div>

              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-accent">Payment Received</p>
                  <p className="text-muted-foreground text-xs mt-1">₦35,000 received from 7 bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
