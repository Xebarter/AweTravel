'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type PassengerQuickSearchProps = {
  className?: string;
  compact?: boolean;
  /** Sync from URL or parent when these change (e.g. passenger search results page). */
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialPassengers?: string;
};

export function PassengerQuickSearch({
  className,
  compact,
  initialFrom,
  initialTo,
  initialDate,
  initialPassengers,
}: PassengerQuickSearchProps) {
  const router = useRouter();
  const [origin, setOrigin] = useState(initialFrom ?? '');
  const [destination, setDestination] = useState(initialTo ?? '');
  const [date, setDate] = useState(initialDate ?? '');
  const [passengers, setPassengers] = useState(initialPassengers ?? '1');

  useEffect(() => {
    if (initialFrom !== undefined) setOrigin(initialFrom);
    if (initialTo !== undefined) setDestination(initialTo);
    if (initialDate !== undefined) setDate(initialDate);
    if (initialPassengers !== undefined) setPassengers(initialPassengers || '1');
  }, [initialFrom, initialTo, initialDate, initialPassengers]);

  useEffect(() => {
    router.prefetch('/passenger/search');
  }, [router]);

  const [searching, setSearching] = useState(false);
  const [validation, setValidation] = useState('');

  const handleSearch = () => {
    setValidation('');
    if (!origin.trim() || !destination.trim() || !date) {
      setValidation('Enter origin, destination, and travel date.');
      return;
    }
    setSearching(true);
    const searchParams = new URLSearchParams({
      from: origin.trim(),
      to: destination.trim(),
      date,
    });
    if (passengers && passengers !== '1') {
      searchParams.set('passengers', passengers);
    }
    const url = `/passenger/search?${searchParams.toString()}`;
    router.prefetch(url);
    router.push(url);
    setSearching(false);
  };

  const fieldClass = 'h-11 bg-background text-base shadow-sm md:text-sm';

  return (
    <Card className={cn('border-border/80 shadow-sm', className)}>
      <CardContent className={compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}>
        {!compact ? (
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Find a trip</h2>
            <p className="text-sm text-muted-foreground">Search routes and compare options</p>
          </div>
        ) : null}
        {validation ? (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {validation}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="qs-origin" className="flex items-center gap-2 text-foreground">
              <MapPin className="size-4 text-primary" aria-hidden />
              From
            </Label>
            <Input
              id="qs-origin"
              placeholder="Departure city"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="qs-destination" className="flex items-center gap-2 text-foreground">
              <MapPin className="size-4 text-primary" aria-hidden />
              To
            </Label>
            <Input
              id="qs-destination"
              placeholder="Arrival city"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="qs-date" className="flex items-center gap-2 text-foreground">
              <Calendar className="size-4 text-primary" aria-hidden />
              Date
            </Label>
            <Input id="qs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="qs-passengers" className="flex items-center gap-2 text-foreground">
              <Users className="size-4 text-primary" aria-hidden />
              Passengers
            </Label>
            <Input
              id="qs-passengers"
              type="number"
              min={1}
              max={20}
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="lg:col-span-2">
            <Button type="button" className="h-11 w-full font-semibold shadow-sm" onClick={handleSearch} disabled={searching}>
              <Search className="size-4" aria-hidden />
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
