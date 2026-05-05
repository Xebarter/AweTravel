import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import type { PlatformTransactionStatus } from '@/lib/admin/transactions/types';
import { verifyPaytotaWebhookSignature } from '@/lib/paytota-webhook';

function toAmountMinor(raw: unknown): number | null {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function mapPaytotaEventToLedgerStatus(eventType: string): PlatformTransactionStatus | null {
  switch (eventType) {
    case 'purchase.paid':
    case 'payment.success':
      return 'completed';
    case 'purchase.payment_failure':
    case 'purchase.payment_failed':
    case 'payment.failed':
      return 'failed';
    case 'purchase.cancelled':
    case 'payment.cancelled':
      return 'cancelled';
    case 'purchase.pending_execute':
    case 'payment.pending':
      return 'pending';
    default:
      return null;
  }
}

async function persistLedgerRow(params: {
  idempotencyKey: string;
  bookingId: string;
  purchaseId: string;
  event: string;
  status: PlatformTransactionStatus;
  amountUgx: number;
  customerEmail: string | undefined;
  timestamp: string | undefined;
  rawStatus: unknown;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.warn('[Payment Webhook] SUPABASE_SERVICE_ROLE_KEY missing; skipping ledger write');
    return;
  }

  const idem = params.idempotencyKey.trim();
  if (!idem) return;

  const email =
    typeof params.customerEmail === 'string' && params.customerEmail.trim()
      ? params.customerEmail.trim()
      : null;

  const completedAt =
    params.status === 'completed' ? new Date().toISOString() : null;

  const row = {
    idempotency_key: idem,
    flow: 'incoming' as const,
    kind: 'passenger_payment' as const,
    status: params.status,
    amount_ugx: params.amountUgx,
    currency: 'UGX',
    counterparty_user_id: null,
    counterparty_name: null,
    counterparty_email: email,
    gateway_reference: params.purchaseId,
    external_reference: params.bookingId,
    payout_method: null,
    payout_details: {},
    metadata: {
      booking_id: params.bookingId,
      event: params.event,
      webhook_status: params.rawStatus,
      timestamp: params.timestamp ?? null,
    },
    notes: null,
    failure_reason: params.status === 'failed' ? 'Reported failed by payment provider' : null,
    created_by: null,
    completed_at: completedAt,
  };

  const { error } = await admin.from('platform_transactions').upsert(row, {
    onConflict: 'idempotency_key',
  });

  if (error) {
    console.error('[Payment Webhook] ledger upsert failed:', error);
  }
}

async function notifyAdminsPaymentEvent(params: {
  bookingId: string;
  event: string;
  amountUgx: number;
  customerEmail?: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { data: admins, error } = await admin.from('users').select('id').eq('user_type', 'admin');
  if (error || !admins || admins.length === 0) return;

  const isSuccess = params.event === 'payment.success' || params.event === 'purchase.paid';
  const title = isSuccess ? 'Payment received' : 'Payment update';
  const amount = formatUgx(params.amountUgx);
  const email = params.customerEmail?.trim() ? params.customerEmail.trim() : 'Unknown customer';

  const message = isSuccess
    ? `${amount} received for booking ${params.bookingId} (${email}).`
    : `${params.event} for booking ${params.bookingId} (${email}).`;

  const rows = admins.map((a) => ({
    recipient_id: a.id,
    actor_id: null,
    title,
    message,
    type: isSuccess ? 'success' : 'info',
    category: 'payments',
    data: {
      booking_id: params.bookingId,
      event: params.event,
      amount_ugx: params.amountUgx,
      customer_email: params.customerEmail ?? null,
      href: '/admin/transactions',
    },
  }));

  const { error: insErr } = await admin.from('notifications').insert(rows);
  if (insErr) {
    console.error('[Payment Webhook] notifications insert failed:', insErr);
  }
}

function formatUgx(amountUgx: number): string {
  try {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
      amountUgx,
    );
  } catch {
    return `UGX ${amountUgx}`;
  }
}

const webhookBodySchema = z.object({
  id: z.string().uuid(),
  reference: z.string().min(1).max(128),
  event_type: z.string(),
  status: z.string().optional(),
  payment: z
    .object({
      amount: z.union([z.number(), z.string()]).optional(),
      currency: z.string().optional(),
    })
    .nullable()
    .optional(),
  purchase: z
    .object({
      total: z.union([z.number(), z.string()]).optional(),
      currency: z.string().optional(),
    })
    .optional(),
  client: z
    .object({
      email: z.string().optional(),
    })
    .optional(),
  updated_on: z.union([z.number(), z.string()]).optional(),
});

async function syncBookingFromWebhook(payload: z.infer<typeof webhookBodySchema>) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const bookingId = payload.reference;
  const purchaseId = payload.id;

  if (payload.event_type === 'purchase.paid') {
    const { error } = await admin
      .from('bookings')
      .update({
        payment_status: 'completed',
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .eq('payment_reference', purchaseId);
    if (error) {
      console.error('[Payment Webhook] booking confirm failed:', error);
    }
    return;
  }

  if (payload.event_type === 'purchase.payment_failure' || payload.event_type === 'purchase.payment_failed') {
    const { error } = await admin
      .from('bookings')
      .update({ payment_status: 'failed' })
      .eq('id', bookingId)
      .eq('payment_reference', purchaseId);
    if (error) {
      console.error('[Payment Webhook] booking failed update:', error);
    }
    return;
  }

  if (payload.event_type === 'purchase.cancelled') {
    const { error } = await admin
      .from('bookings')
      .update({ payment_status: 'cancelled' })
      .eq('id', bookingId)
      .eq('payment_reference', purchaseId);
    if (error) {
      console.error('[Payment Webhook] booking cancelled update:', error);
    }
  }
}

/**
 * POST /api/payments/webhook
 * Paytota purchase.* webhooks — raw body must be verified when PAYTOTA_WEBHOOK_PUBLIC_KEY is set.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const publicKey = process.env.PAYTOTA_WEBHOOK_PUBLIC_KEY?.trim();
  const signature = request.headers.get('x-signature')?.trim();

  if (publicKey) {
    if (!signature) {
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 401 });
    }
    const ok = verifyPaytotaWebhookSignature(rawBody, signature, publicKey);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[Payment Webhook] PAYTOTA_WEBHOOK_PUBLIC_KEY is not set; skipping signature verification');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const bodyParse = webhookBodySchema.safeParse(parsedJson);
  if (!bodyParse.success) {
    console.warn('[Payment Webhook] unexpected payload shape:', bodyParse.error.flatten());
    return NextResponse.json({ success: true, message: 'Ignored' }, { status: 200 });
  }

  const body = bodyParse.data;
  const eventType = body.event_type;
  const ledgerStatus = mapPaytotaEventToLedgerStatus(eventType);
  const bookingRef = body.reference.trim();
  const purchaseId = body.id;

  const amountRaw =
    body.payment?.amount ??
    body.purchase?.total ??
    (parsedJson as { amount?: unknown }).amount;
  const amountMinor = toAmountMinor(amountRaw);

  console.log('[Payment Webhook]', {
    event_type: eventType,
    reference: bookingRef,
    purchase_id: purchaseId,
    status: body.status,
    amount: amountMinor,
  });

  const ledgerEvents = new Set([
    'purchase.paid',
    'purchase.payment_failure',
    'purchase.payment_failed',
    'purchase.cancelled',
  ]);
  if (ledgerEvents.has(eventType) && ledgerStatus && amountMinor !== null) {
    await persistLedgerRow({
      idempotencyKey: `paytota:${purchaseId}`,
      bookingId: bookingRef,
      purchaseId,
      event: eventType,
      status: ledgerStatus,
      amountUgx: amountMinor,
      customerEmail: body.client?.email,
      timestamp:
        typeof body.updated_on === 'number'
          ? new Date(body.updated_on * 1000).toISOString()
          : typeof body.updated_on === 'string'
            ? body.updated_on
            : undefined,
      rawStatus: body.status,
    });

    await notifyAdminsPaymentEvent({
      bookingId: bookingRef,
      event: eventType,
      amountUgx: amountMinor,
      customerEmail: body.client?.email,
    });
  } else if (ledgerEvents.has(eventType) && ledgerStatus && amountMinor === null) {
    console.warn('[Payment Webhook] skipping ledger write: invalid or missing amount', {
      reference: bookingRef,
      eventType,
    });
  }

  await syncBookingFromWebhook(body);

  return NextResponse.json({ success: true, message: 'Webhook processed' }, { status: 200 });
}
