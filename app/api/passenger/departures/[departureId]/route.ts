import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { fetchDepartureBookingPageData } from '@/lib/passenger-trip-search-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/passenger/departures/[departureId]?date=YYYY-MM-DD
 * Public read-only: trip context for the booking flow (seats + booked seat codes).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ departureId: string }> },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
  }

  const { departureId } = await context.params;
  if (!UUID_RE.test(departureId)) {
    return NextResponse.json({ success: false, error: 'Invalid departure id' }, { status: 400 });
  }

  const date = request.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: 'Query parameter date (YYYY-MM-DD) is required' },
      { status: 400 },
    );
  }

  const result = await fetchDepartureBookingPageData(admin, departureId, date);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    bookedSeatCodes: result.bookedSeatCodes,
    travelDate: date,
  });
}
