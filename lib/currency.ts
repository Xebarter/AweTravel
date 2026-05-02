/** ISO 4217 code used across the app (Ugandan Shilling). */
export const APP_CURRENCY_CODE = 'UGX' as const;

/** Whole UGX amounts only (no fractional subdivision in UI). */
export function formatCurrency(amount: number): string {
  const n = Math.round(amount);
  if (n < 0) {
    return `-${APP_CURRENCY_CODE} ${Math.abs(n).toLocaleString('en-UG')}`;
  }
  return `${APP_CURRENCY_CODE} ${n.toLocaleString('en-UG')}`;
}
