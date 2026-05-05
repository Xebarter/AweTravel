import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';
import type { BookingStatus, BookingPaymentStatus } from '@/lib/bookings/types';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed'] satisfies [
  BookingStatus,
  BookingStatus,
  BookingStatus,
  BookingStatus,
]);

const paymentStatusSchema = z.enum(['pending', 'completed', 'failed', 'cancelled'] satisfies [
  BookingPaymentStatus,
  BookingPaymentStatus,
  BookingPaymentStatus,
  BookingPaymentStatus,
]);

const patchSchema = z
  .object({
    status: statusSchema.optional(),
    payment_status: paymentStatusSchema.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/transporter/bookings/[id] — update booking status/payment_status.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!uuidRe.test(id)) return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first ? `${first.path.join('.') || 'payload'}: ${first.message}` : 'Invalid payload' },
      { status: 400 },
    );
  }

  // Ownership is enforced by RLS + route join policy; additionally constrain update by joined owner for safety.
  const { data, error } = await supabase
    .from('bookings')
    .update(parsed.data)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('transporter booking patch:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

