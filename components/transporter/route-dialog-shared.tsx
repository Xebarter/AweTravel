'use client';

import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ALL_DAYS_MASK,
  DAYS_OF_WEEK,
  WEEKDAYS_MASK,
  WEEKEND_MASK,
  type DepartureStatus,
} from '@/types/transporter-route';

export type StopRow = {
  key: string;
  name: string;
  etaOffsetMinutes: string;
};

export type DepartureRow = {
  key: string;
  departureTime: string;
  daysOfWeek: number;
  vehicleId: string;
  status: DepartureStatus;
  priceOverride: string;
  notes: string;
};

let rowCounter = 0;
export const newRouteFormKey = (prefix: string) => {
  rowCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${rowCounter}`;
};

export const newDepartureRow = (): DepartureRow => ({
  key: newRouteFormKey('dep'),
  departureTime: '08:00',
  daysOfWeek: WEEKDAYS_MASK,
  vehicleId: '',
  status: 'active',
  priceOverride: '',
  notes: '',
});

export function RouteDialogSectionTitle({
  icon: Icon,
  children,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
        {children}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RouteDialogDaysToggle({
  mask,
  onChange,
  idPrefix,
}: {
  mask: number;
  onChange: (mask: number) => void;
  idPrefix: string;
}) {
  const toggle = (bit: number) => onChange(mask ^ bit);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {DAYS_OF_WEEK.map((d) => {
        const bit = 1 << d.index;
        const active = (mask & bit) !== 0;
        return (
          <button
            key={d.index}
            id={`${idPrefix}-day-${d.index}`}
            type="button"
            onClick={() => toggle(bit)}
            aria-pressed={active}
            className={cn(
              'h-9 min-w-11 rounded-md border px-2 text-xs font-semibold uppercase tracking-wide transition-colors',
              active
                ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground',
            )}
          >
            {d.short.slice(0, 1)}
          </button>
        );
      })}
      <div className="ml-1 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(WEEKDAYS_MASK)}
        >
          Weekdays
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(WEEKEND_MASK)}
        >
          Weekends
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(ALL_DAYS_MASK)}
        >
          Every day
        </Button>
      </div>
    </div>
  );
}
