import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/routes
 * Search and fetch routes with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');
    const limit = searchParams.get('limit') || '20';

    // Mock data - in production, this would query the database
    const mockRoutes = [
      {
        tripId: '1',
        routeCode: 'LI-001',
        origin: origin || 'Lagos',
        destination: destination || 'Ibadan',
        distance: 125,
        duration: 180,
        departureTime: '08:00 AM',
        arrivalTime: '11:00 AM',
        company: 'Premium Travel Ltd',
        availableSeats: 35,
        totalSeats: 50,
        minPrice: 5000,
        maxPrice: 7500,
      },
      {
        tripId: '2',
        routeCode: 'LI-002',
        origin: origin || 'Lagos',
        destination: destination || 'Ibadan',
        distance: 125,
        duration: 180,
        departureTime: '02:00 PM',
        arrivalTime: '05:00 PM',
        company: 'Safe Journey Coaches',
        availableSeats: 28,
        totalSeats: 45,
        minPrice: 4500,
        maxPrice: 6500,
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockRoutes.slice(0, parseInt(limit)),
      total: mockRoutes.length,
      filters: {
        origin,
        destination,
        date,
      },
    });
  } catch (error) {
    console.error('Routes API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/routes
 * Create a new route (admin/transporter only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      routeCode,
      origin,
      destination,
      distance,
      duration,
      vehicleId,
      companyId,
    } = body;

    // Validate required fields
    if (!routeCode || !origin || !destination || !distance || !duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, verify authorization and create route in database
    const newRoute = {
      id: `route-${Date.now()}`,
      routeCode,
      origin,
      destination,
      distance,
      duration,
      vehicleId,
      companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, data: newRoute },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create route' },
      { status: 500 }
    );
  }
}
