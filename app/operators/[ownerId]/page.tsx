'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { HomeTransporterGroupedTrips } from '@/components/site/HomeTransporterGroupedTrips';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TripSearchResult } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function OperatorPublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ownerId = typeof params.ownerId === 'string' ? params.ownerId : '';

  const rawDate = searchParams.get('date');
  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayISO();

  const [routes, setRoutes] = useState<TripSearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ownerId || !UUID_RE.test(ownerId)) {
      setError('This operator link is not valid.');
      setLoading(false);
      setRoutes([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const q = new URLSearchParams({
          owner: ownerId,
          date,
          routeLimit: '50',
          tripLimit: '500',
          maxDeparturesPerRoute: '0',
          offset: '0',
          sort: 'departure',
        });
        const res = await fetch(`/api/home/discover?${q.toString()}`, { cache: 'no-store' });
        const json = (await res.json()) as { success?: boolean; data?: TripSearchResult[]; error?: string };
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load schedules');
        if (!cancelled) setRoutes(json.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load schedules');
          setRoutes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerId, date]);

  const companyName = routes?.[0]?.company.company_name ?? 'Operator';

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to home
          </Link>
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 rounded-md" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !routes?.length ? (
          <p className="text-sm text-muted-foreground">No published schedules for this operator.</p>
        ) : (
          <>
            <header className="mb-6 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{companyName}</h1>
              <p className="text-sm text-muted-foreground">
                Active departures for travel date{' '}
                <span className="font-medium tabular-nums text-foreground">{date}</span>. Availability may change; sign in
                when booking to confirm seats.
              </p>
            </header>
            <HomeTransporterGroupedTrips trips={routes} layout="stack" />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
