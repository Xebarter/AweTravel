/**
 * Seat map, search availability, and create-booking conflict checks only treat a seat as
 * taken when payment has completed. Unpaid `pending` bookings do not block the seat
 * (e.g. user abandoned checkout).
 *
 * Apply both conditions on Supabase queries that decide physical seat occupancy.
 */
export const PAID_SEAT_HOLD_PAYMENT_STATUS = 'completed' as const;
