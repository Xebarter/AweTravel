import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/bookings
 * Fetch bookings with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    // In production, this would query the database
    // For now, return mock data
    const mockBookings = [
      {
        id: '1',
        bookingId: 'AWE-2024-0001234',
        userId: userId,
        tripId: '1',
        route: 'Lagos - Ibadan',
        seat: 'A05',
        date: '2024-05-20',
        departureTime: '08:00 AM',
        status: status || 'Confirmed',
        amount: 5250,
        paymentStatus: 'Completed',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        bookingId: 'AWE-2024-0001233',
        userId: userId,
        tripId: '2',
        route: 'Abuja - Kaduna',
        seat: 'B12',
        date: '2024-05-25',
        departureTime: '02:00 PM',
        status: status || 'Confirmed',
        amount: 3750,
        paymentStatus: 'Completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockBookings.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      total: mockBookings.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      tripId,
      seatId,
      passengerName,
      passengerEmail,
      phone,
    } = body;

    // Validate required fields
    if (!userId || !tripId || !seatId || !passengerName || !passengerEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, this would create a booking in the database
    const newBooking = {
      id: `booking-${Date.now()}`,
      bookingId: `AWE-2024-${String(Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
      userId,
      tripId,
      seatId,
      passengerName,
      passengerEmail,
      phone,
      status: 'Pending',
      paymentStatus: 'Pending',
      amount: 5250, // This would be calculated based on seat price
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, data: newBooking },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
