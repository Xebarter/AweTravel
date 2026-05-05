'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { getTransporterEarnings } from '@/lib/transporter-earnings/client';

export default function EarningsPage() {
  const monthlyEarnings = [
    { month: 'Jan', revenue: 450000, expenses: 120000 },
    { month: 'Feb', revenue: 520000, expenses: 140000 },
    { month: 'Mar', revenue: 580000, expenses: 135000 },
    { month: 'Apr', revenue: 620000, expenses: 150000 },
    { month: 'May', revenue: 750000, expenses: 180000 },
  ];

  const routePerformance = [
    { name: 'Lagos-Ibadan', value: 450000, count: 120 },
    { name: 'Abuja-Kaduna', value: 280000, count: 85 },
    { name: 'Lagos-Abeokuta', value: 120000, count: 45 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  const [summary, setSummary] = useState<{
    grossCompletedUgx: number;
    payoutsCompletedUgx: number;
    payoutsPendingUgx: number;
    netUgx: number;
  } | null>(null);
  const [recent, setRecent] = useState<{ id: string; date: string; label: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const data = await getTransporterEarnings();
        if (cancelled) return;
        setSummary(data.summary);
        setRecent(
          (data.recent ?? []).slice(0, 8).map((r) => ({
            id: r.id,
            date: r.createdAt.slice(0, 10),
            label: r.kind === 'passenger_payment' ? 'Booking payment' : 'Payout',
            amount: r.kind === 'transporter_payout' ? -r.amountUgx : r.amountUgx,
          })),
        );
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load earnings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const earningsSummary = useMemo(() => {
    if (!summary) {
      return {
        totalEarnings: 0,
        monthlyAverage: 0,
        thisMonth: 0,
        platformFees: 0,
        netEarnings: 0,
      };
    }
    return {
      totalEarnings: summary.grossCompletedUgx,
      monthlyAverage: 0,
      thisMonth: 0,
      platformFees: 0,
      netEarnings: summary.netUgx,
    };
  }, [summary]);

  const recentTransactions = recent;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-linear-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings & Revenue</h1>
            <p className="text-white/80 mt-1">Track your income and financial performance</p>
          </div>
          <Button className="bg-accent hover:bg-accent-dark gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        {loadError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}
        {/* Key Metrics */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(earningsSummary.totalEarnings)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Monthly Average</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(earningsSummary.monthlyAverage)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(earningsSummary.thisMonth)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Platform Fees</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(earningsSummary.platformFees)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(earningsSummary.netEarnings)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Monthly Revenue */}
          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue vs expenses over 5 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Route Performance */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Revenue by Route</CardTitle>
              <CardDescription>Top performing routes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={routePerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {routePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest payment and fee records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No ledger activity yet.</div>
              ) : recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{transaction.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{transaction.date}</p>
                  </div>
                  <p className={`font-bold text-lg ${
                    transaction.amount < 0 ? 'text-destructive' : 'text-success'
                  }`}>
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
