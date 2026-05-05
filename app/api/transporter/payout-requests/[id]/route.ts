import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireTransporterSession } from '@/lib/transporter-vehicles/auth';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const auth = await requireTransporterSession(supabase);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;

  let body: any = null;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body?.action !== 'cancel') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const { error } = await supabase
    .from('transporter_payout_requests')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('transporter payout requests cancel:', error);
    return NextResponse.json({ error: 'Failed to cancel payout request' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

