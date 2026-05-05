'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Users, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { listTransporterBookings, patchTransporterBooking } from '@/lib/transporter-bookings/client';
import type { Booking } from '@/lib/bookings/types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'pending'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUpdateError(null);
    try {
      const data = await listTransporterBookings({
        q: searchTerm.trim() || undefined,
        status: filterStatus,
        limit: 100,
      });
      setBookings(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
    const totalRevenueMinor = bookings.reduce(
      (sum, b) => sum + (b.paymentStatus === 'completed' ? b.amountMinor : 0),
      0,
    );
    const pendingPayments = bookings.filter((b) => b.paymentStatus === 'pending').length;
    return { totalBookings, confirmedBookings, totalRevenueMinor, pendingPayments };
  }, [bookings]);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="bg-linear-to-r from-primary to-primary-dark text-white py-8 px-6 md:px-8">
        <h1 className="text-3xl font-bold">Bookings & Reservations</h1>
        <p className="text-white/80 mt-1">Monitor and manage passenger bookings</p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {updateError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {updateError}
          </div>
        ) : null}
        {loadError ? (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}{' '}
            <button className="underline" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : null}

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
              <p className="text-2xl font-bold text-accent">{formatCurrency(stats.totalRevenueMinor)}</p>
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
            {(
              [
                { id: 'all' as const, label: 'All' },
                { id: 'confirmed' as const, label: 'Confirmed' },
                { id: 'completed' as const, label: 'Completed' },
                { id: 'pending' as const, label: 'Pending' },
              ] as const
            ).map((s) => (
              <Button
                key={s.id}
                variant={filterStatus === s.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(s.id)}
                className={filterStatus === s.id ? 'bg-accent hover:bg-accent-dark' : ''}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <Card className="border-border">
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-sm text-muted-foreground">Loading bookings…</p>
            </CardContent>
          </Card>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="border-border hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left - Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-sm text-muted-foreground font-mono">{booking.bookingCode}</p>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'confirmed'
                            ? 'bg-success/10 text-success'
                            : booking.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {booking.status}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-accent" />
                        {booking.routeLabel}
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Passenger</p>
                          <p className="font-medium text-foreground">{booking.passengerName ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Seat</p>
                          <p className="font-medium text-accent">{booking.seatCode}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Date</p>
                          <p className="font-medium text-foreground">{booking.travelDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Payment</p>
                          <p className={`font-medium ${
                            booking.paymentStatus === 'completed'
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
                        <p className="text-2xl font-bold text-accent">{formatCurrency(booking.amountMinor)}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={updatingId === booking.id}
                          onClick={async () => {
                            setUpdatingId(booking.id);
                            setUpdateError(null);
                            try {
                              const next =
                                booking.status === 'pending'
                                  ? 'confirmed'
                                  : booking.status === 'confirmed'
                                    ? 'completed'
                                    : booking.status;
                              await patchTransporterBooking(booking.id, { status: next });
                              await reload();
                            } catch (e: unknown) {
                              setUpdateError(e instanceof Error ? e.message : 'Failed to update booking.');
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        >
                          Confirm/Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:bg-destructive/10"
                          disabled={updatingId === booking.id || booking.status === 'cancelled'}
                          onClick={async () => {
                            setUpdatingId(booking.id);
                            setUpdateError(null);
                            try {
                              await patchTransporterBooking(booking.id, { status: 'cancelled' });
                              await reload();
                            } catch (e: unknown) {
                              setUpdateError(e instanceof Error ? e.message : 'Failed to cancel booking.');
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        >
                          Cancel
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" disabled>
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
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
