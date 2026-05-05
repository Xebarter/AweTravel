'use client';

import { RouteCard } from '@/components/passenger/RouteCard';
import type { AvailableRoute } from '@/lib/types';
import { cn } from '@/lib/utils';

function departureSortKey(t: AvailableRoute) {
  return t.schedule.departure_time || '';
}

export function HomeTransporterGroupedTrips({
  trips,
  layout = 'stack',
}: {
  trips: AvailableRoute[];
  layout?: 'stack' | 'grid';
}) {
  const groups = new Map<string, AvailableRoute[]>();
  for (const t of trips) {
    const k = t.route.id;
    const arr = groups.get(k) ?? [];
    arr.push(t);
    groups.set(k, arr);
  }

  const entries = Array.from(groups.entries()).map(([routeId, items]) => {
    const sorted = [...items].sort((a, b) => departureSortKey(a).localeCompare(departureSortKey(b)));
    const first = sorted[0];
    const label =
      first?.route.origin_city && first?.route.destination_city
        ? `${first.route.origin_city} → ${first.route.destination_city}`
        : (first?.route.route_code ?? routeId);
    return { routeId, items: sorted, label };
  });

  entries.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div
      className={cn(
        layout === 'grid' ? 'grid gap-8 sm:grid-cols-2' : 'space-y-8',
      )}
    >
      {entries.map(({ routeId, items, label }) => (
        <section key={routeId} className="space-y-3">
          <h2 className="border-b border-border/80 pb-2 text-sm font-semibold text-foreground">{label}</h2>
          <ul className="space-y-4" aria-label="Departures for route">
            {items.map((r) => (
              <li key={`${r.trip_id}-${r.schedule.id}`}>
                <RouteCard route={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
