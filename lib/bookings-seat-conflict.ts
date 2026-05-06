import type { SupabaseClient } from '@supabase/supabase-js';
import { PAID_SEAT_HOLD_PAYMENT_STATUS } from '@/lib/bookings-paid-seat-hold';

/** Returns true if a paid booking already holds this seat (unpaid pending does not block). */
export async function hasSeatConflict(
  admin: SupabaseClient,
  input: {
    departureId: string;
    travelDate: string;
    seatCode: string;
    exceptBookingId?: string;
  },
): Promise<boolean> {
  const seat = input.seatCode.trim().toUpperCase();
  if (!seat) return false;

  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .eq('departure_id', input.departureId)
    .eq('travel_date', input.travelDate)
    .eq('seat_code', seat)
    .eq('payment_status', PAID_SEAT_HOLD_PAYMENT_STATUS)
    .not('status', 'eq', 'cancelled');

  if (error) {
    console.error('hasSeatConflict:', error);
    return true;
  }

  const rows = (data ?? []) as { id: string }[];
  const blocking = rows.filter((r) => r.id !== input.exceptBookingId);
  return blocking.length > 0;
}
