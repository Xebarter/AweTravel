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

/** Aisle between 1 seat (left) and 2 seats (right); for capacity ≤ 30. */
const SMALL_LEFT = 1;
const SMALL_RIGHT = 2;

/** Aisle between 2 seats (left) and 3 seats (right); for capacity > 30. */
const LARGE_LEFT = 2;
const LARGE_RIGHT = 3;

/** @param passengerCapacity Vehicle passenger capacity (defaults to seatCount). */
export function coachLayoutSides(passengerCapacity: number): { left: number; right: number } {
  const cap = Math.max(0, passengerCapacity);
  if (cap <= 30) return { left: SMALL_LEFT, right: SMALL_RIGHT };
  return { left: LARGE_LEFT, right: LARGE_RIGHT };
}

/**
 * Top-down schematic: left block | aisle | right block, front (low seat index) at row 0.
 * ≤30 passengers: 1 | aisle | 2 per row. Larger vehicles: 2 | aisle | 3 per row.
 */
export function buildCoachSeatLayout(seatCount: number, passengerCapacity?: number): LayoutRow[] {
  const cap = passengerCapacity ?? seatCount;
  const { left: leftN, right: rightN } = coachLayoutSides(cap);
  const perRow = leftN + rightN;

  const n = Math.max(0, seatCount);
  const rows: LayoutRow[] = [];
  let idx = 0;

  while (idx < n) {
    const remaining = n - idx;
    const inRow = Math.min(perRow, remaining);
    const leftTake = Math.min(inRow, leftN);
    const rightTake = inRow - leftTake;

    const row: LayoutRow = [];

    for (let i = 0; i < leftN; i++) {
      if (i < leftTake) {
        row.push({ kind: 'seat', seatIndex: idx });
        idx += 1;
      } else {
        row.push({ kind: 'spacer' });
      }
    }
    row.push({ kind: 'aisle' });
    for (let i = 0; i < rightN; i++) {
      if (i < rightTake) {
        row.push({ kind: 'seat', seatIndex: idx });
        idx += 1;
      } else {
        row.push({ kind: 'spacer' });
      }
    }

    rows.push(row);
  }

  return rows;
}

export function buildCoachSeatLayoutFromSeats(
  seats: readonly Seat[],
  passengerCapacity?: number,
): LayoutRow[] {
  const cap = passengerCapacity ?? seats.length;
  return buildCoachSeatLayout(seats.length, cap);
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
