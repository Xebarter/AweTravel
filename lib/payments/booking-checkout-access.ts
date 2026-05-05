import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseRouteClient } from '@/lib/supabase-route';

export type BookingCheckoutRow = {
  id: string;
  booking_code: string;
  passenger_user_id: string | null;
  guest_email: string | null;
  guest_full_name: string | null;
  guest_phone: string | null;
  amount_minor: number;
  currency: string;
  payment_status: string;
  status: string;
  payment_reference: string | null;
};

function jsonError(message: string, status: number) {
  return { ok: false as const, status, message };
}

function bearerToken(request: NextRequest): string | null {
  const raw = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!raw?.toLowerCase().startsWith('bearer ')) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

/**
 * Resolves the user from the access token using a standalone client.
 * `createServerClient().auth.getUser(jwt)` is unreliable in some Next.js Route Handler setups.
 */
async function getUserFromAccessToken(accessToken: string): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function resolveUserFromRequest(request: NextRequest): Promise<User | null> {
  const token = bearerToken(request);
  if (token) {
    const fromBearer = await getUserFromAccessToken(token);
    if (fromBearer) return fromBearer;
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return null;

  const fromCookies = await supabase.auth.getUser();
  if (fromCookies.data.user) return fromCookies.data.user;

  return null;
}

export async function authorizeBookingCheckout(
  request: NextRequest,
  params: {
    bookingId: string;
    guestEmail?: string | null;
  },
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; booking: BookingCheckoutRow; user: User | null }
> {
  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError('Server misconfigured', 500);

  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'passenger_user_id',
        'guest_email',
        'guest_full_name',
        'guest_phone',
        'amount_minor',
        'currency',
        'payment_status',
        'status',
        'payment_reference',
      ].join(','),
    )
    .eq('id', params.bookingId)
    .maybeSingle();

  if (error || !booking) return jsonError('Booking not found', 404);

  const row = booking as unknown as BookingCheckoutRow;

  if (row.passenger_user_id) {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return jsonError('Sign in to complete payment', 401);
    }
    if (user.id !== row.passenger_user_id) {
      return jsonError('Forbidden', 403);
    }
    return { ok: true, booking: row, user };
  }

  const email = params.guestEmail?.trim().toLowerCase();
  const g = row.guest_email?.trim().toLowerCase();
  if (!email || !g || email !== g) {
    return jsonError('Invalid guest credentials', 403);
  }

  const user = await resolveUserFromRequest(request);
  return { ok: true, booking: row, user };
}
