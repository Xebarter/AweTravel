'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock, MapPin, Route as RouteIcon, Users } from 'lucide-react';
import Link from 'next/link';

interface RouteCardProps {
  route: AvailableRoute;
  /** Travel date for the booking URL (YYYY-MM-DD). */
  travelDate?: string;
}

/**
 * Operator color theme — deterministic per company id so the same transporter
 * always looks the same across the app. Each entry stores complete Tailwind
 * class strings (no dynamic concatenation) so they survive purge.
 */
type OperatorTheme = {
  surface: string;
  surfaceHover: string;
  border: string;
  avatar: string;
  ring: string;
  accentText: string;
};

const OPERATOR_THEMES: readonly OperatorTheme[] = [
  {
    surface: 'bg-sky-50/80 dark:bg-sky-950/25',
    surfaceHover: 'hover:bg-sky-50 dark:hover:bg-sky-950/35',
    border: 'border-sky-500/15 dark:border-sky-400/15',
    avatar: 'bg-sky-600 text-white',
    ring: 'ring-sky-500/25',
    accentText: 'text-sky-700 dark:text-sky-200',
  },
  {
    surface: 'bg-emerald-50/80 dark:bg-emerald-950/25',
    surfaceHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/35',
    border: 'border-emerald-500/15 dark:border-emerald-400/15',
    avatar: 'bg-emerald-600 text-white',
    ring: 'ring-emerald-500/25',
    accentText: 'text-emerald-700 dark:text-emerald-200',
  },
  {
    surface: 'bg-violet-50/80 dark:bg-violet-950/25',
    surfaceHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/35',
    border: 'border-violet-500/15 dark:border-violet-400/15',
    avatar: 'bg-violet-600 text-white',
    ring: 'ring-violet-500/25',
    accentText: 'text-violet-700 dark:text-violet-200',
  },
  {
    surface: 'bg-rose-50/80 dark:bg-rose-950/25',
    surfaceHover: 'hover:bg-rose-50 dark:hover:bg-rose-950/35',
    border: 'border-rose-500/15 dark:border-rose-400/15',
    avatar: 'bg-rose-600 text-white',
    ring: 'ring-rose-500/25',
    accentText: 'text-rose-700 dark:text-rose-200',
  },
  {
    surface: 'bg-teal-50/80 dark:bg-teal-950/25',
    surfaceHover: 'hover:bg-teal-50 dark:hover:bg-teal-950/35',
    border: 'border-teal-500/15 dark:border-teal-400/15',
    avatar: 'bg-teal-600 text-white',
    ring: 'ring-teal-500/25',
    accentText: 'text-teal-700 dark:text-teal-200',
  },
  {
    surface: 'bg-indigo-50/80 dark:bg-indigo-950/25',
    surfaceHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/35',
    border: 'border-indigo-500/15 dark:border-indigo-400/15',
    avatar: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-500/25',
    accentText: 'text-indigo-700 dark:text-indigo-200',
  },
  {
    surface: 'bg-cyan-50/80 dark:bg-cyan-950/25',
    surfaceHover: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/35',
    border: 'border-cyan-600/15 dark:border-cyan-400/15',
    avatar: 'bg-cyan-700 text-white',
    ring: 'ring-cyan-500/25',
    accentText: 'text-cyan-700 dark:text-cyan-200',
  },
  {
    surface: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/25',
    surfaceHover: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/35',
    border: 'border-fuchsia-500/15 dark:border-fuchsia-400/15',
    avatar: 'bg-fuchsia-600 text-white',
    ring: 'ring-fuchsia-500/25',
    accentText: 'text-fuchsia-700 dark:text-fuchsia-200',
  },
  {
    surface: 'bg-amber-50/80 dark:bg-amber-950/25',
    surfaceHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/35',
    border: 'border-amber-500/15 dark:border-amber-400/15',
    avatar: 'bg-amber-600 text-white',
    ring: 'ring-amber-500/25',
    accentText: 'text-amber-800 dark:text-amber-200',
  },
  {
    surface: 'bg-lime-50/80 dark:bg-lime-950/25',
    surfaceHover: 'hover:bg-lime-50 dark:hover:bg-lime-950/35',
    border: 'border-lime-600/15 dark:border-lime-400/15',
    avatar: 'bg-lime-700 text-white',
    ring: 'ring-lime-500/25',
    accentText: 'text-lime-800 dark:text-lime-200',
  },
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getOperatorTheme(companyId: string): OperatorTheme {
  const idx = hashString(companyId || 'unknown') % OPERATOR_THEMES.length;
  return OPERATOR_THEMES[idx]!;
}

function getOperatorInitials(name: string): string {
  if (!name) return '?';
  const tokens = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !/^(ltd|llc|inc|co|company|limited|corp|plc|sa|gmbh)\.?$/i.test(t));
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return (tokens[0]![0]! + tokens[1]![0]!).toUpperCase();
}

export function RouteCard({ route, travelDate }: RouteCardProps) {
  const minPrice =
    route.available_seats.length > 0 ? Math.min(...route.available_seats.map((s) => s.base_price)) : 0;
  /** True availability (search only materializes up to 60 seat rows for pricing UI). */
  const seatsAvailable =
    route.total_seats > 0 ? Math.max(0, route.total_seats - route.booked_seats) : route.available_seats.length;
  const durationH = Math.floor(route.route.estimated_duration_minutes / 60);
  const durationM = route.route.estimated_duration_minutes % 60;
  const durationLabel = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM} min`;

  const bookingHref = `/passenger/booking/${route.trip_id}${travelDate ? `?date=${encodeURIComponent(travelDate)}` : ''}`;
  const limited = seatsAvailable <= 6;

  const theme = getOperatorTheme(route.company.id);
  const initials = getOperatorInitials(route.company.company_name);

  const ariaTrip = `${route.route.origin_city} to ${route.route.destination_city} with ${route.company.company_name}, departing ${route.schedule.departure_time}, from ${formatCurrency(minPrice)}`;

  // Format departure time to 12-hour clock
  function format12Hour(time: string) {
    if (!time) return '';
    const [h, m = '00'] = time.split(':');
    const hour = Number(h);
    const minute = Number(m);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${m.padStart(2, '0')} ${ampm}`;
  }

  function formatTravelDate(dateStr: string | undefined) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <Card
      className={cn(
        'group relative touch-manipulation overflow-hidden border pt-0 shadow-sm transition-[box-shadow,transform,background-color]',
        'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm',
        theme.surface,
        theme.surfaceHover,
        theme.border,
      )}
    >
      <CardContent className="p-3 sm:p-6">
        <article className="flex flex-col gap-3 sm:gap-5" aria-label={ariaTrip}>
          {/* Header row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/60 text-muted-foreground ring-1 ring-inset ring-border/60 sm:size-10',
                    theme.accentText,
                  )}
                >
                  <MapPin className="size-3.5 sm:size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                    <span className="wrap-break-word">{route.route.origin_city}</span>
                    <span className="mx-1 inline text-muted-foreground sm:mx-2" aria-hidden>
                      →
                    </span>
                    <span className="wrap-break-word">{route.route.destination_city}</span>
                  </h3>

                  {/* Operator identity row — color-coded */}
                  <div className="mt-2 flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-tight ring-2 ring-offset-1 ring-offset-card sm:size-8 sm:text-xs',
                        theme.avatar,
                        theme.ring,
                      )}
                      aria-hidden
                    >
                      {initials}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground sm:text-[15px]">
                      {route.company.company_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price + availability */}
            <div className="flex shrink-0 flex-row items-center justify-between gap-2 rounded-lg border border-background/35 bg-background/55 px-2.5 py-2 backdrop-blur-[2px] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:gap-3 sm:px-3 sm:py-3 sm:rounded-xl">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">From</p>
                <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {formatCurrency(minPrice)}
                </p>
              </div>
            </div>
          </div>

          {/* Journey details row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 sm:gap-4 sm:pt-3">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
              <span className="font-medium text-foreground">{route.route.distance_km} km</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
              <span className="font-medium text-foreground">{durationLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
              <span className="font-medium text-foreground">{seatsAvailable} seats</span>
              <span className="ml-1 font-normal text-muted-foreground">({route.route.route_type === 'bus' ? 'Bus' : route.route.route_type})</span>
            </div>
          </div>

          {/* Departure time and booking button row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:gap-3 sm:pt-3 border-t border-background/20">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ring-1 ring-inset ring-border/60 sm:size-8 sm:text-xs',
                  theme.accentText,
                )}
              >
                <Clock className="size-3.5 sm:size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Departs {formatTravelDate(travelDate)}
                </p>
                <p className="text-base font-bold tabular-nums tracking-tight text-foreground sm:text-lg">
                  {format12Hour(route.schedule.departure_time)}
                </p>
              </div>
            </div>
            <Link href={bookingHref} className="w-full sm:w-auto">
              <Button className="w-full h-9 sm:h-10 text-sm sm:w-auto">Book trip</Button>
            </Link>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}
