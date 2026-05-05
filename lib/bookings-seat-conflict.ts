import type { SupabaseClient } from '@supabase/supabase-js';

/** Returns true if another active booking already holds this seat on the same departure and date. */
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
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('hasSeatConflict:', error);
    return true;
  }

  const rows = (data ?? []) as { id: string }[];
  const blocking = rows.filter((r) => r.id !== input.exceptBookingId);
  return blocking.length > 0;
}
