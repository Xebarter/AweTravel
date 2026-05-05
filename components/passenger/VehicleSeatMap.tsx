'use client';

import { useId } from 'react';
import type { RouteType, Seat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  buildCoachSeatLayoutFromSeats,
  normalizeSeatCode,
  vehicleSchematicMetrics,
} from '@/lib/vehicle-seat-layout';
import { Armchair, GripVertical } from 'lucide-react';

export type VehicleSeatMapProps = {
  seats: Seat[];
  bookedSeatCodes: string[];
  selectedSeatId: string | null;
  onSeatSelect: (seat: Seat) => void;
  vehicleType: RouteType;
  registration?: string;
  routeLabel?: string;
};

function isSeatBooked(seat: Seat, booked: Set<string>): boolean {
  return booked.has(normalizeSeatCode(seat.id)) || booked.has(normalizeSeatCode(seat.seat_number));
}

function seatAriaLabel(seat: Seat, booked: boolean, selected: boolean): string {
  const price = formatCurrency(seat.base_price);
  const state = booked ? 'booked' : selected ? 'selected' : 'available';
  const tier = seat.seat_type !== 'regular' ? `, ${seat.seat_type}` : '';
  return `Seat ${seat.seat_number}, ${state}, ${price}${tier}`;
}

export function VehicleSeatMap({
  seats,
  bookedSeatCodes,
  selectedSeatId,
  onSeatSelect,
  vehicleType,
  registration,
  routeLabel,
}: VehicleSeatMapProps) {
  const rows = buildCoachSeatLayoutFromSeats(seats);
  const bookedSet = new Set(bookedSeatCodes.map(normalizeSeatCode));
  const { bodyWidth, cornerRadius, windshieldDepth } = vehicleSchematicMetrics(vehicleType);

  const shellId = `vss-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div
        className={cn(
          'relative mx-auto min-w-[min(100%,280px)] max-w-md px-3 pb-4 pt-2',
          vehicleType === 'minibus' && 'max-w-sm',
          vehicleType === 'vessel' && 'max-w-lg',
        )}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-border/60"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${shellId}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--muted)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--card)" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <rect
            x={(100 - bodyWidth) / 2}
            y={windshieldDepth + 2}
            width={bodyWidth}
            height={100 - windshieldDepth - 6}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={`url(#${shellId}-body)`}
            stroke="currentColor"
            strokeWidth="0.9"
          />
          <path
            d={`M ${(100 - bodyWidth) / 2 + cornerRadius * 0.4} ${windshieldDepth + 2} Q 50 ${windshieldDepth * 0.2} ${100 - (100 - bodyWidth) / 2 - cornerRadius * 0.4} ${windshieldDepth + 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.85"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="18" cy="92" r="3.2" fill="currentColor" opacity="0.25" />
          <circle cx="82" cy="92" r="3.2" fill="currentColor" opacity="0.25" />
          <circle cx="18" cy="22" r="2.8" fill="currentColor" opacity="0.2" />
          <circle cx="82" cy="22" r="2.8" fill="currentColor" opacity="0.2" />
        </svg>

        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-sm sm:text-xs">
              <span className="text-primary" aria-hidden>
                ▲
              </span>
              Front · direction of travel
            </div>
            {registration?.trim() ? (
              <p className="text-[11px] text-muted-foreground tabular-nums sm:text-xs">
                {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
                {registration ? ` · ${registration.trim()}` : ''}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground capitalize sm:text-xs">{vehicleType}</p>
            )}
            {routeLabel?.trim() ? (
              <p className="max-w-[90%] truncate text-[11px] text-muted-foreground sm:text-xs">{routeLabel}</p>
            ) : null}
            <p className="text-[10px] text-muted-foreground/90 italic sm:text-[11px]">
              Schematic layout — not to scale
            </p>
          </div>

          <div
            className="w-full space-y-1.5 rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur-sm sm:space-y-2 sm:p-3"
            role="group"
            aria-label="Vehicle seat map"
          >
            {rows.map((row, ri) => (
              <div
                key={ri}
                className="grid w-full grid-cols-[1fr_1fr_0.42fr_1fr_1fr] gap-1 sm:gap-1.5"
              >
                {row.map((cell, ci) => {
                  if (cell.kind === 'spacer') {
                    return <div key={`${ri}-${ci}`} className="min-h-11 sm:min-h-12" aria-hidden />;
                  }
                  if (cell.kind === 'aisle') {
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border/60 bg-muted/25 sm:min-h-12"
                        aria-hidden
                      >
                        <GripVertical className="size-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                        <span className="text-[9px] font-medium uppercase tracking-tight text-muted-foreground/70">
                          Aisle
                        </span>
                      </div>
                    );
                  }
                  const seat = seats[cell.seatIndex];
                  if (!seat) return <div key={`${ri}-${ci}`} className="min-h-11" aria-hidden />;
                  const isBooked = isSeatBooked(seat, bookedSet);
                  const selected = selectedSeatId === seat.id;
                  const premium = seat.seat_type === 'premium';
                  const handicap = seat.seat_type === 'handicap';

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && onSeatSelect(seat)}
                      aria-label={seatAriaLabel(seat, isBooked, selected)}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-11 flex-col items-center justify-center rounded-lg border text-[10px] font-semibold leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-12 sm:text-xs',
                        isBooked &&
                          'cursor-not-allowed border-border bg-muted/80 text-muted-foreground opacity-55 line-through decoration-muted-foreground',
                        !isBooked &&
                          selected &&
                          'border-accent bg-accent text-accent-foreground shadow-md ring-2 ring-accent/30',
                        !isBooked &&
                          !selected &&
                          'border-border bg-secondary/90 text-foreground hover:border-accent/50 hover:bg-secondary',
                        premium && !isBooked && 'ring-1 ring-amber-500/40',
                        handicap && !isBooked && 'ring-1 ring-sky-500/40',
                      )}
                    >
                      <span className="flex items-center gap-0.5">
                        {handicap ? <Armchair className="size-3 opacity-80" aria-hidden /> : null}
                        {seat.seat_number}
                      </span>
                      {!isBooked ? (
                        <span className="mt-0.5 hidden font-normal text-[9px] opacity-80 sm:block">
                          {formatCurrency(seat.base_price)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
