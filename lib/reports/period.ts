import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = parseISO(s);
  return !Number.isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === s;
}

export function assertPeriodMaxDays(fromYmd: string, toYmd: string, maxDays: number): void {
  const from = parseISO(fromYmd);
  const to = parseISO(toYmd);
  const span = differenceInCalendarDays(to, from) + 1;
  if (span > maxDays) {
    throw new Error(`Date range cannot exceed ${maxDays} days`);
  }
  if (span < 1) {
    throw new Error('Invalid date range');
  }
}

/** Inclusive [from, to] → previous window of equal length: [prevFrom, prevTo] inclusive. */
export function previousPeriodInclusive(fromYmd: string, toYmd: string): {
  prevFrom: string;
  prevTo: string;
} {
  const from = parseISO(fromYmd);
  const to = parseISO(toYmd);
  const days = differenceInCalendarDays(to, from) + 1;
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, days - 1);
  return {
    prevFrom: format(prevFrom, 'yyyy-MM-dd'),
    prevTo: format(prevTo, 'yyyy-MM-dd'),
  };
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
