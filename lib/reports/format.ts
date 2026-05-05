import { APP_CURRENCY_CODE } from '@/lib/currency';

/** Intl-based UGX display for reports (locale-aware grouping). */
export function formatReportCurrency(amountUgx: number, locale: string): string {
  const n = Math.round(amountUgx);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: APP_CURRENCY_CODE,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${APP_CURRENCY_CODE} ${n.toLocaleString('en-UG')}`;
  }
}

export function formatReportInteger(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

export function formatReportPercent(deltaPct: number | null, locale: string): string {
  if (deltaPct === null) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    }).format(deltaPct) + '%';
  } catch {
    return `${deltaPct.toFixed(1)}%`;
  }
}

/** Format an ISO UTC instant for display in a timezone and locale. */
export function formatReportInstant(isoUtc: string, timeZone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

export function formatReportDay(dayYmd: string, timeZone: string, locale: string): string {
  const d = new Date(`${dayYmd}T12:00:00.000Z`);
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dayYmd;
  }
}
