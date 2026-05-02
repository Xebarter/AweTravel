'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { Clock, MapPin, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface RouteCardProps {
  route: AvailableRoute;
}

export function RouteCard({ route }: RouteCardProps) {
  const minPrice = route.available_seats.length > 0 
    ? Math.min(...route.available_seats.map(s => s.base_price))
    : 0;

  return (
    <Card className="border-border hover:shadow-lg transition">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Route Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-lg text-foreground">
                  {route.route.origin_city} → {route.route.destination_city}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">{route.company.company_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(minPrice)}</p>
            </div>
          </div>

          {/* Route Details Grid */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4" />
                {Math.floor(route.route.estimated_duration_minutes / 60)}h {route.route.estimated_duration_minutes % 60}m
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Distance</p>
              <p className="text-sm font-medium text-foreground">{route.route.distance_km} km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Seats Available</p>
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <Users className="h-4 w-4" />
                {route.available_seats.length}
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-sm font-medium text-foreground mb-1">Departure & Arrival</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{route.schedule.departure_time}</span>
              <span className="text-sm text-muted-foreground">→</span>
              <span className="text-sm text-muted-foreground">{route.schedule.arrival_time}</span>
            </div>
          </div>

          {/* Action Button */}
          <Link href={`/passenger/booking/${route.trip_id}`}>
            <Button className="w-full bg-accent hover:bg-accent-dark">
              Select & Book
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
