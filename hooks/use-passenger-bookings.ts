'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PassengerBookingListItem } from '@/lib/types';

type BookingsState = {
  data: PassengerBookingListItem[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function usePassengerBookings(limit = 50) {
  const [state, setState] = useState<BookingsState>({
    data: [],
    total: 0,
    loading: true,
    error: null,
  });

  const fetchBookings = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setState({ data: [], total: 0, loading: false, error: 'Not signed in' });
        return;
      }

      const res = await fetch(`/api/bookings?limit=${limit}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });

      let json: {
        success?: boolean;
        data?: PassengerBookingListItem[];
        total?: number;
        error?: string;
      };
      try {
        const text = await res.text();
        json = text ? (JSON.parse(text) as typeof json) : {};
      } catch {
        setState({ data: [], total: 0, loading: false, error: 'Invalid response from server' });
        return;
      }

      if (!res.ok || !json.success) {
        setState({
          data: [],
          total: 0,
          loading: false,
          error: json.error || 'Could not load bookings',
        });
        return;
      }

      setState({
        data: json.data ?? [],
        total: json.total ?? 0,
        loading: false,
        error: null,
      });
    } catch {
      setState({ data: [], total: 0, loading: false, error: 'Could not load bookings' });
    }
  }, [limit]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  return { ...state, refetch: fetchBookings };
}
