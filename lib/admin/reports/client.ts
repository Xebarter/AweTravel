import type { AdminReportResponse } from '@/lib/admin/reports/types';

export type { AdminReportResponse } from '@/lib/admin/reports/types';

export const REPORT_TIMEZONES = [
  'UTC',
  'Africa/Kampala',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

export type ReportTimezone = (typeof REPORT_TIMEZONES)[number];

export const REPORT_LOCALES = ['en-UG', 'en-US', 'en-GB', 'fr-FR', 'de-DE', 'sw-UG'] as const;

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export type FetchAdminReportParams = {
  from: string;
  to: string;
  timezone: string;
  locale: string;
  compare?: boolean;
};

export async function fetchAdminReport(params: FetchAdminReportParams): Promise<AdminReportResponse> {
  const sp = new URLSearchParams({
    from: params.from,
    to: params.to,
    timezone: params.timezone,
    locale: params.locale,
  });
  if (params.compare) sp.set('compare', 'true');

  const res = await fetch(`/api/admin/reports?${sp.toString()}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AdminReportResponse;
}
