import type { RouteType, Seat } from '@/lib/types';

export type LayoutCell =
  | { kind: 'aisle' }
  | { kind: 'seat'; seatIndex: number }
  | { kind: 'spacer' };

export type LayoutRow = LayoutCell[];

/** Uppercase seat code for comparing with API `bookedSeatCodes`. */
export function normalizeSeatCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Top-down coach layout: 2 seats | aisle | 2 seats per row, front (low seat index) at row 0.
 * Partial last row fills left block (L1, L2) before right (R1, R2).
 */
export function buildCoachSeatLayout(seatCount: number): LayoutRow[] {
  const n = Math.max(0, seatCount);
  const rows: LayoutRow[] = [];
  let idx = 0;

  while (idx < n) {
    const remaining = n - idx;
    const inRow = Math.min(4, remaining);
    const row: LayoutRow = [];

    row.push(inRow >= 1 ? { kind: 'seat', seatIndex: idx } : { kind: 'spacer' });
    if (inRow >= 1) idx += 1;
    row.push(inRow >= 2 ? { kind: 'seat', seatIndex: idx } : { kind: 'spacer' });
    if (inRow >= 2) idx += 1;
    row.push({ kind: 'aisle' });
    row.push(inRow >= 3 ? { kind: 'seat', seatIndex: idx } : { kind: 'spacer' });
    if (inRow >= 3) idx += 1;
    row.push(inRow >= 4 ? { kind: 'seat', seatIndex: idx } : { kind: 'spacer' });
    if (inRow >= 4) idx += 1;

    rows.push(row);
  }

  return rows;
}

export function buildCoachSeatLayoutFromSeats(seats: readonly Seat[]): LayoutRow[] {
  return buildCoachSeatLayout(seats.length);
}

/** Visual hints for the schematic shell (not to scale). */
export function vehicleSchematicMetrics(vehicleType: RouteType): {
  bodyWidth: number;
  cornerRadius: number;
  windshieldDepth: number;
} {
  switch (vehicleType) {
    case 'minibus':
      return { bodyWidth: 88, cornerRadius: 10, windshieldDepth: 9 };
    case 'vessel':
      return { bodyWidth: 100, cornerRadius: 6, windshieldDepth: 6 };
    case 'coach':
      return { bodyWidth: 92, cornerRadius: 12, windshieldDepth: 10 };
    default:
      return { bodyWidth: 90, cornerRadius: 11, windshieldDepth: 9 };
  }
}
