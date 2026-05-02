'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RouteCard } from '@/components/passenger/RouteCard';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { MapPin, Calendar, Filter, X } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<AvailableRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');

  const origin = searchParams.get('from') || '';
  const destination = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';

  // Mock data - in production, this would fetch from the API
  const mockRoutes: AvailableRoute[] = [
    {
      trip_id: '1',
      route: {
        id: '1',
        company_id: '1',
        route_code: 'LI-001',
        origin_city: origin || 'Lagos',
        destination_city: destination || 'Ibadan',
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
    },
    {
      trip_id: '2',
      route: {
        id: '2',
        company_id: '2',
        route_code: 'LI-002',
        origin_city: origin || 'Lagos',
        destination_city: destination || 'Ibadan',
        distance_km: 125,
        estimated_duration_minutes: 180,
        route_type: 'bus',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      schedule: {
        id: '2',
        route_id: '2',
        departure_time: '02:00 PM',
        arrival_time: '05:00 PM',
        days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
      vehicle: {
        id: '2',
        company_id: '2',
        vehicle_registration: 'LG-2024-002',
        vehicle_type: 'bus',
        capacity: 45,
        current_status: 'active',
        created_at: new Date().toISOString(),
      },
      company: {
        id: '2',
        owner_user_id: '2',
        company_name: 'Safe Journey Coaches',
        registration_number: 'REG-2021-002',
        license_number: 'LIC-2021-002',
        verified: true,
        contact_email: 'info@safejourneycoaches.com',
        contact_phone: '+234 700 000 0002',
        headquarters_location: 'Lagos',
        created_at: new Date().toISOString(),
      },
      available_seats: Array.from({ length: 28 }, (_, i) => ({
        id: `seat-${i + 1}`,
        vehicle_id: '2',
        seat_number: `B${String(i + 1).padStart(2, '0')}`,
        seat_type: i < 4 ? 'premium' : 'regular',
        base_price: i < 4 ? 6500 : 4500,
        created_at: new Date().toISOString(),
      })),
      total_seats: 45,
      booked_seats: 17,
    },
  ];

  useState(() => {
    setLoading(false);
    setResults(mockRoutes);
  }, []);

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'price') {
      const aPrice = Math.min(...a.available_seats.map(s => s.base_price));
      const bPrice = Math.min(...b.available_seats.map(s => s.base_price));
      return aPrice - bPrice;
    } else if (sortBy === 'duration') {
      return a.route.estimated_duration_minutes - b.route.estimated_duration_minutes;
    } else {
      return a.schedule.departure_time.localeCompare(b.schedule.departure_time);
    }
  });

  return (
    <div className="min-h-screen pb-12">
      {/* Search Header */}
      <div className="bg-secondary/30 border-b border-border py-6 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">Search Results</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span><strong>{origin}</strong> to <strong>{destination}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{date}</span>
            </div>
            <div className="text-right">
              <Button variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Modify Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="md:col-span-1">
            <Card className="border-border sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sort */}
                <div>
                  <h4 className="font-medium text-sm text-foreground mb-3">Sort By</h4>
                  <div className="space-y-2">
                    {(['price', 'duration', 'departure'] as const).map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value={option}
                          checked={sortBy === option}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="rounded-full"
                        />
                        <span className="text-sm text-muted-foreground capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="font-medium text-sm text-foreground mb-3">Price Range</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-muted-foreground">Below {formatCurrency(5000)}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(5000)} – {formatCurrency(10000)}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-muted-foreground">Above {formatCurrency(10000)}</span>
                    </label>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h4 className="font-medium text-sm text-foreground mb-3">Amenities</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-muted-foreground">WiFi</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-muted-foreground">AC</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-muted-foreground">Toilet</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Results */}
          <div className="md:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                <p className="mt-4 text-muted-foreground">Searching for routes...</p>
              </div>
            ) : sortedResults.length === 0 ? (
              <Card className="border-border">
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-lg text-muted-foreground mb-4">No routes found</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Try modifying your search criteria
                  </p>
                  <Button className="bg-accent hover:bg-accent-dark">New Search</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found <strong>{sortedResults.length}</strong> available routes
                </p>
                {sortedResults.map((route) => (
                  <RouteCard key={route.trip_id} route={route} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
