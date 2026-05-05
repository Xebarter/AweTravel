'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { fetchAdminReport, type AdminReportResponse } from '@/lib/admin/reports/client';
import { getAdminPlatformSettings } from '@/lib/platform-settings/admin-client';

type AdminDashboardReportState = {
  report: AdminReportResponse | null;
  fromDate: string;
  toDate: string;
  timezone: string;
  locale: string;
  isLoading: boolean;
  error: string | null;
};

export function useAdminDashboardReport() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const fromDate = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

  const [state, setState] = useState<AdminDashboardReportState>({
    report: null,
    fromDate,
    toDate,
    timezone: 'Africa/Kampala',
    locale: 'en-UG',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getAdminPlatformSettings();
        if (cancelled) return;
        if (typeof s.defaultReportTimezone === 'string' && s.defaultReportTimezone.trim().length > 0) {
          setState((prev) => ({ ...prev, timezone: s.defaultReportTimezone }));
        }
      } catch {
        // Keep fallback timezone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetchAdminReport({
        from: state.fromDate,
        to: state.toDate,
        timezone: state.timezone,
        locale: state.locale,
        compare: true,
      });
      setState((prev) => ({ ...prev, report: res, isLoading: false, error: null }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        report: null,
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load dashboard report',
      }));
    }
  }, [state.fromDate, state.locale, state.timezone, state.toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    refetch: load,
  };
}

