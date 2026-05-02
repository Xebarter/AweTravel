'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Building2, MapPin, Truck, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { APP_CURRENCY_CODE, formatCurrency } from '@/lib/currency';

export default function AdminDashboard() {
  const platformStats = {
    totalUsers: 1250,
    totalCompanies: 18,
    totalRoutes: 85,
    totalVehicles: 245,
    totalBookings: 4230,
    platformRevenue: `${APP_CURRENCY_CODE} 12.5M`,
  };

  const dailyMetrics = [
    { date: 'May 15', bookings: 120, users: 25, revenue: 450000 },
    { date: 'May 16', bookings: 145, users: 32, revenue: 520000 },
    { date: 'May 17', bookings: 165, users: 38, revenue: 580000 },
    { date: 'May 18', bookings: 190, users: 45, revenue: 650000 },
    { date: 'May 19', bookings: 210, users: 52, revenue: 720000 },
    { date: 'May 20', bookings: 235, users: 60, revenue: 850000 },
  ];

  const topRoutes = [
    { route: 'Lagos-Ibadan', bookings: 450, revenue: 2250000 },
    { route: 'Abuja-Kaduna', bookings: 320, revenue: 1280000 },
    { route: 'Lagos-Abeokuta', bookings: 280, revenue: 840000 },
    { route: 'Lagos-Ilorin', bookings: 240, revenue: 720000 },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-white/80 mt-1">Overview of platform performance and management</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.totalUsers}</p>
                </div>
                <Users className="h-5 w-5 text-accent" />
              </div>
              <p className="text-xs text-success">+12% this month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Companies</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.totalCompanies}</p>
                </div>
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-success">+4 new this month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Routes</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.totalRoutes}</p>
                </div>
                <MapPin className="h-5 w-5 text-accent" />
              </div>
              <p className="text-xs text-success">+8 this month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Vehicles</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.totalVehicles}</p>
                </div>
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-success">+35 this month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.totalBookings}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-xs text-success">+18% this month</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Platform Revenue</p>
                  <p className="text-2xl font-bold text-foreground">{platformStats.platformRevenue}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <p className="text-xs text-success">+25% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Daily Metrics */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Daily Platform Metrics</CardTitle>
              <CardDescription>Bookings and revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'Revenue' ? formatCurrency(Number(value)) : String(value)
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bookings" fill="#3b82f6" name="Bookings" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Growth */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New users joining the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
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

        {/* Top Routes */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle>Top Performing Routes</CardTitle>
            <CardDescription>Routes by booking volume and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRoutes.map((route, index) => (
                <div key={route.route} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{route.route}</p>
                      <p className="text-xs text-muted-foreground">{route.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">
                      {APP_CURRENCY_CODE} {(route.revenue / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Management Links */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Platform Management</CardTitle>
              <CardDescription>Manage platform operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/companies">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Companies
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="h-4 w-4 mr-2" />
                System Settings
              </Button>
            </CardContent>
          </Card>

          {/* Alerts & Issues */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Important notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Pending Company Verification</p>
                  <p className="text-muted-foreground text-xs mt-1">3 companies awaiting approval</p>
                </div>
              </div>

              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Suspicious Activity</p>
                  <p className="text-muted-foreground text-xs mt-1">1 user flagged for review</p>
                </div>
              </div>

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success">System Status</p>
                  <p className="text-muted-foreground text-xs mt-1">All systems operational</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
