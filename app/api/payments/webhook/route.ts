import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import type { PlatformTransactionStatus } from '@/lib/admin/transactions/types';

function toAmountUgx(raw: unknown): number | null {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function mapEventToStatus(event: string): PlatformTransactionStatus | null {
  switch (event) {
    case 'payment.success':
      return 'completed';
    case 'payment.failed':
      return 'failed';
    case 'payment.cancelled':
      return 'cancelled';
    case 'payment.pending':
      return 'pending';
    default:
      return null;
  }
}

async function persistLedgerRow(params: {
  reference: string;
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

  const ref = params.reference.trim();
  if (!ref) return;

  const email =
    typeof params.customerEmail === 'string' && params.customerEmail.trim()
      ? params.customerEmail.trim()
      : null;

  const completedAt =
    params.status === 'completed' ? new Date().toISOString() : null;

  const row = {
    idempotency_key: ref,
    flow: 'incoming' as const,
    kind: 'passenger_payment' as const,
    status: params.status,
    amount_ugx: params.amountUgx,
    currency: 'UGX',
    counterparty_user_id: null,
    counterparty_name: null,
    counterparty_email: email,
    gateway_reference: ref,
    external_reference: null,
    payout_method: null,
    payout_details: {},
    metadata: {
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
  reference: string;
  event: string;
  amountUgx: number;
  customerEmail?: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { data: admins, error } = await admin.from('users').select('id').eq('user_type', 'admin');
  if (error || !admins || admins.length === 0) return;

  const title = params.event === 'payment.success' ? 'Payment received' : 'Payment update';
  const amount = formatUgx(params.amountUgx);
  const email = params.customerEmail?.trim() ? params.customerEmail.trim() : 'Unknown customer';

  const message =
    params.event === 'payment.success'
      ? `${amount} received for reference ${params.reference} (${email}).`
      : `${params.event} for reference ${params.reference} (${email}).`;

  const rows = admins.map((a) => ({
    recipient_id: a.id,
    actor_id: null,
    title,
    message,
    type: params.event === 'payment.success' ? 'success' : 'info',
    category: 'payments',
    data: {
      reference: params.reference,
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

/**
 * POST /api/payments/webhook
 * Handle Paytota payment notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      event,
      reference,
      status,
      amount,
      customer_email,
      timestamp,
    } = body;

    console.log('[Payment Webhook]', {
      event,
      reference,
      status,
      amount,
      timestamp,
    });

    const txStatus = typeof event === 'string' ? mapEventToStatus(event) : null;
    const ref = typeof reference === 'string' ? reference : '';

    if (txStatus && ref.trim()) {
      const amountUgx = toAmountUgx(amount);
      if (amountUgx !== null) {
        await persistLedgerRow({
          reference: ref,
          event: String(event),
          status: txStatus,
          amountUgx,
          customerEmail: customer_email,
          timestamp: typeof timestamp === 'string' ? timestamp : undefined,
          rawStatus: status,
        });

        // Minimal producer: push admin notifications for payment events.
        await notifyAdminsPaymentEvent({
          reference: ref.trim(),
          event: String(event),
          amountUgx,
          customerEmail: typeof customer_email === 'string' ? customer_email : undefined,
        });
      } else {
        console.warn('[Payment Webhook] skipping ledger write: invalid or missing amount', {
          reference: ref,
          event,
        });
      }
    }

    switch (event) {
      case 'payment.success':
        console.log(`Payment ${reference} successful for ${customer_email}`);
        break;

      case 'payment.failed':
        console.log(`Payment ${reference} failed for ${customer_email}`);
        break;

      case 'payment.cancelled':
        console.log(`Payment ${reference} cancelled for ${customer_email}`);
        break;

      case 'payment.pending':
        console.log(`Payment ${reference} pending for ${customer_email}`);
        break;

      default:
        console.warn(`Unknown event: ${event}`);
    }

    return NextResponse.json(
      { success: true, message: 'Webhook processed' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}
