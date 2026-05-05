import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

export async function GET(req: Request) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { userId } = auth;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.max(1, Math.min(500, Number(limitRaw ?? 200) || 200));

  // Booking payment rows become the "earning sources" transporters can drill into.
  // We join to route for ownership filtering and to platform_transactions for earned timestamps.
  const { data, error } = await supabase
    .from('bookings')
    .select(
      [
        'id',
        'booking_code',
        'travel_date',
        'seat_code',
        'status',
        'amount_minor',
        'currency',
        'payment_status',
        'payment_reference',
        'created_at',
        'route:transporter_routes!inner(id,owner_user_id,route_code,origin,destination)',
        'departure:transporter_route_departures(id,departure_time)',
        'platform_transaction:platform_transactions(id,kind,status,amount_ugx,currency,created_at,completed_at,gateway_reference,external_reference)',
      ].join(','),
    )
    .eq('payment_status', 'completed')
    .eq('route.owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('transporter earnings sources:', error);
    return NextResponse.json({ error: 'Failed to load earning sources' }, { status: 500 });
  }

  const items = (data ?? [])
    .map((row: any) => {
      const tx = row.platform_transaction ?? null;
      // "When earnings came in" is when the underlying payment completed (fallback to its create time).
      const earnedAt: string | null = tx?.completed_at ?? tx?.created_at ?? row.created_at ?? null;
      return {
        bookingId: row.id as string,
        bookingCode: row.booking_code as string,
        travelDate: row.travel_date as string,
        seatCode: row.seat_code as string,
        bookingStatus: row.status as string,
        amountMinor: Number(row.amount_minor ?? 0),
        currency: (row.currency ?? 'UGX') as string,
        paymentReference: (row.payment_reference ?? null) as string | null,
        bookedAt: row.created_at as string,
        route: row.route
          ? {
              id: row.route.id as string,
              routeCode: row.route.route_code as string,
              origin: row.route.origin as string,
              destination: row.route.destination as string,
            }
          : null,
        departure: row.departure
          ? {
              id: row.departure.id as string,
              departureTime: (row.departure.departure_time ?? null) as string | null,
            }
          : null,
        transaction: tx
          ? {
              id: tx.id as string,
              kind: tx.kind as string,
              status: tx.status as string,
              amountUgx: Number(tx.amount_ugx ?? 0),
              currency: (tx.currency ?? 'UGX') as string,
              createdAt: tx.created_at as string,
              completedAt: (tx.completed_at ?? null) as string | null,
              reference: (tx.gateway_reference ?? tx.external_reference ?? null) as string | null,
            }
          : null,
        earnedAt,
      };
    })
    // Defensive: only keep rows that are actually passenger payments (if linked).
    .filter((r) => !r.transaction || r.transaction.kind === 'passenger_payment');

  return NextResponse.json({ items });
}

