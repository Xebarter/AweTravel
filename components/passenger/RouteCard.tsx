'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BadgeCheck, Clock, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

interface RouteCardProps {
  route: AvailableRoute;
  /** Travel date for the booking URL (YYYY-MM-DD). */
  travelDate?: string;
}

export function RouteCard({ route, travelDate }: RouteCardProps) {
  const minPrice =
    route.available_seats.length > 0 ? Math.min(...route.available_seats.map((s) => s.base_price)) : 0;
  const availableSeats = route.available_seats.length;
  const durationH = Math.floor(route.route.estimated_duration_minutes / 60);
  const durationM = route.route.estimated_duration_minutes % 60;

  return (
    <Card className="group overflow-hidden border-border/80 shadow-sm transition hover:-translate-y-px hover:shadow-md">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
                    {route.route.origin_city} <span className="text-muted-foreground">→</span> {route.route.destination_city}
                  </h3>
                </div>
                <Badge variant="secondary" className="font-normal">
                  {route.route.route_type === 'bus' ? 'Bus' : route.route.route_type}
                </Badge>
                {route.company.verified ? (
                  <Badge variant="outline" className="gap-1.5 font-normal">
                    <BadgeCheck className="size-3.5 text-primary" aria-hidden />
                    Verified operator
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{route.company.company_name}</span>
                <span aria-hidden className="text-border">
                  •
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4" aria-hidden />
                  {durationH}h {durationM}m
                </span>
                <span aria-hidden className="text-border">
                  •
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" aria-hidden />
                  {availableSeats} seats left
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-start justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{formatCurrency(minPrice)}</p>
                <p className="text-xs text-muted-foreground">per passenger</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 font-normal',
                  availableSeats <= 6 ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'bg-background',
                )}
              >
                {availableSeats <= 6 ? 'Limited seats' : 'Good availability'}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="text-sm font-medium text-foreground">{route.schedule.departure_time}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arrival</p>
                <p className="text-sm font-medium text-foreground">{route.schedule.arrival_time}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-medium text-foreground">{route.route.distance_km} km</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Route code <span className="font-medium text-foreground">{route.route.route_code}</span>
            </p>
            <Link
              href={`/passenger/booking/${route.trip_id}${travelDate ? `?date=${encodeURIComponent(travelDate)}` : ''}`}
              className="sm:w-auto"
            >
              <Button className="h-11 w-full font-semibold shadow-sm sm:w-auto">
                Select trip
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
