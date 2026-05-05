'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/currency';
import type { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type HomeHeaderTripSearchProps = {
  className?: string;
};

export function HomeHeaderTripSearch({ className }: HomeHeaderTripSearchProps) {
  const router = useRouter();
  const formId = useId();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<AvailableRoute[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hint, setHint] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const a = from.trim();
    const b = to.trim();
    if (a.length < 2 || b.length < 2) {
      setPreview([]);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            date: todayISO(),
            from: a,
            to: b,
            tripLimit: '10',
            routeLimit: '14',
            maxDeparturesPerRoute: '2',
            sort: 'departure',
          });
          const res = await fetch(`/api/home/discover?${params.toString()}`, { cache: 'no-store' });
          const json = (await res.json()) as {
            success?: boolean;
            data?: AvailableRoute[];
            error?: string;
          };
          if (!res.ok || !json.success) throw new Error(json.error || 'Search failed');
          if (!cancelled) {
            setPreview(json.data ?? []);
            setMenuOpen(true);
          }
        } catch {
          if (!cancelled) {
            setPreview([]);
            setMenuOpen(false);
          }
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      })();
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [from, to]);

  const goToHomeResults = () => {
    setHint('');
    const a = from.trim();
    const b = to.trim();
    if (!a || !b) {
      setHint('Enter departure and destination.');
      return;
    }
    const date = todayISO();
    const q = new URLSearchParams({ from: a, to: b, date }).toString();
    router.push(`/?${q}#book`);
    setMenuOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    goToHomeResults();
  };

  return (
    <div ref={wrapRef} className={cn('relative w-full max-w-xl', className)}>
      <div
        className="flex w-full items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm sm:gap-2 sm:px-2.5"
        role="search"
        aria-label="Find trips by route"
      >
        <MapPin className="size-3.5 shrink-0 text-muted-foreground sm:size-4" aria-hidden />
        <Input
          id={`${formId}-from`}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0 sm:h-9 sm:text-sm"
          placeholder="Departure city"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => preview.length > 0 && setMenuOpen(true)}
          autoComplete="off"
          aria-label="Departure city"
        />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
        <Input
          id={`${formId}-to`}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0 sm:h-9 sm:text-sm"
          placeholder="Destination city"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => preview.length > 0 && setMenuOpen(true)}
          autoComplete="off"
          aria-label="Destination city"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2.5 text-xs sm:h-9 sm:px-3"
          onClick={goToHomeResults}
        >
          <Search className="size-3.5 sm:size-4" aria-hidden />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {hint ? (
        <p className="absolute left-0 right-0 top-full z-40 mt-1 text-[11px] text-destructive sm:text-xs">
          {hint}
        </p>
      ) : null}

      {menuOpen && (from.trim().length >= 2 || to.trim().length >= 2) ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,380px)] overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg"
          role="listbox"
          aria-label="Matching trips"
        >
          {previewLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Finding trips…
            </div>
          ) : preview.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No trips match that route for today. Try different spellings or search to pick a date
              below.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {preview.map((r) => {
                const minPrice =
                  r.available_seats.length > 0
                    ? Math.min(...r.available_seats.map((s) => s.base_price))
                    : 0;
                const date = todayISO();
                return (
                  <li key={`${r.trip_id}-${r.schedule.id}`}>
                    <Link
                      href={`/passenger/booking/${r.trip_id}?date=${encodeURIComponent(date)}`}
                      className="flex flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/80"
                      onClick={() => setMenuOpen(false)}
                      role="option"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {r.route.origin_city} → {r.route.destination_city}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.schedule.departure_time} · {r.company.company_name} · from{' '}
                        {formatCurrency(minPrice)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!previewLoading && preview.length > 0 ? (
            <div className="border-t border-border/70 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-full text-xs font-medium"
                onClick={goToHomeResults}
              >
                View all matching schedules
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
