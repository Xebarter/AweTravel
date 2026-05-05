import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addDays, format, subDays } from 'date-fns';
import type { PassengerBookingListItem } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createAuthedClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

function buildMockBookings(userId: string): PassengerBookingListItem[] {
  const now = new Date();
  const upcomingDate = format(addDays(now, 4), 'yyyy-MM-dd');
  const soonDate = format(addDays(now, 1), 'yyyy-MM-dd');
  const pastDate = format(subDays(now, 12), 'yyyy-MM-dd');
  const pastDate2 = format(subDays(now, 28), 'yyyy-MM-dd');
  const suffix = userId.slice(0, 8);

  return [
    {
      id: `mock-upcoming-1-${suffix}`,
      bookingId: 'AWE-2026-0001001',
      tripId: '1',
      route: 'Kampala — Jinja',
      seat: 'A05',
      date: upcomingDate,
      departureTime: '08:00',
      status: 'Confirmed',
      amount: 25_000,
      paymentStatus: 'Completed',
      company: 'AweTravel Express',
      createdAt: new Date().toISOString(),
    },
    {
      id: `mock-upcoming-2-${suffix}`,
      bookingId: 'AWE-2026-0001002',
      tripId: '2',
      route: 'Kampala — Entebbe',
      seat: 'B12',
      date: soonDate,
      departureTime: '14:30',
      status: 'Confirmed',
      amount: 15_000,
      paymentStatus: 'Completed',
      company: 'City Link Coaches',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: `mock-past-1-${suffix}`,
      bookingId: 'AWE-2026-0000998',
      tripId: '3',
      route: 'Kampala — Mbarara',
      seat: 'C03',
      date: pastDate,
      departureTime: '06:00',
      status: 'Completed',
      amount: 45_000,
      paymentStatus: 'Completed',
      company: 'Western Line',
      createdAt: new Date(Date.now() - 1_200_000_000).toISOString(),
    },
    {
      id: `mock-past-2-${suffix}`,
      bookingId: 'AWE-2026-0000990',
      tripId: '4',
      route: 'Kampala — Gulu',
      seat: 'D07',
      date: pastDate2,
      departureTime: '19:00',
      status: 'Completed',
      amount: 55_000,
      paymentStatus: 'Completed',
      company: 'Northern Star',
      createdAt: new Date(Date.now() - 2_400_000_000).toISOString(),
    },
  ];
}

/**
 * GET /api/bookings
 * Authenticated: returns mock list scoped to the signed-in user (until SQL exists).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = createAuthedClient(token);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const queryUserId = searchParams.get('userId');
    if (queryUserId && queryUserId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const all = buildMockBookings(user.id);
    const page = all.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: page,
      total: all.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

/**
 * POST /api/bookings
 * Create a new booking (mock response until DB exists).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { userId, tripId, seatId, passengerName, passengerEmail, phone } = body;

    if (!userId || !tripId || !seatId || !passengerName || !passengerEmail) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      const client = createAuthedClient(token);
      if (client) {
        const {
          data: { user },
        } = await client.auth.getUser();
        if (user && userId !== user.id) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const newBooking = {
      id: `booking-${Date.now()}`,
      bookingId: `AWE-2026-${String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0')}`,
      userId,
      tripId,
      seatId,
      passengerName,
      passengerEmail,
      phone,
      status: 'Pending',
      paymentStatus: 'Pending',
      amount: 5250,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: newBooking }, { status: 201 });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create booking' }, { status: 500 });
  }
}
