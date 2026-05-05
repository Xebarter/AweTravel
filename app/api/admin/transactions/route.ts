import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { requireAdminSession } from '@/lib/admin/auth';
import type {
  AdminTransactionsSummary,
  ListAdminTransactionsResponse,
  PlatformTransactionRow,
} from '@/lib/admin/transactions/types';

const listQuerySchema = z.object({
  flow: z.enum(['incoming', 'outgoing', 'all']).optional().default('all'),
  kind: z
    .enum(['passenger_payment', 'transporter_payout', 'refund', 'adjustment', 'all'])
    .optional()
    .default('all'),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'all'])
    .optional()
    .default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

const createBodySchema = z
  .object({
    kind: z.enum(['transporter_payout', 'adjustment']),
    amount_ugx: z.coerce.number().int().positive(),
    counterparty_user_id: z.string().uuid().optional().nullable(),
    payout_method: z.enum(['mobile_money', 'bank_transfer', 'cash', 'other']).optional().nullable(),
    payout_details: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().max(2000).optional().nullable(),
    status: z.enum(['pending', 'processing']).optional().default('pending'),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'transporter_payout') {
      if (!data.counterparty_user_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'counterparty_user_id is required for transporter_payout',
          path: ['counterparty_user_id'],
        });
      }
      if (!data.payout_method) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'payout_method is required for transporter_payout',
          path: ['payout_method'],
        });
      }
    }
  });

function parseRangeBounds(from?: string, to?: string): { fromIso: string | null; toIso: string | null } {
  let fromIso: string | null = null;
  let toIso: string | null = null;
  if (from) {
    const d = new Date(from.length <= 10 ? `${from}T00:00:00.000Z` : from);
    if (!Number.isNaN(d.getTime())) fromIso = d.toISOString();
  }
  if (to) {
    const d = new Date(to.length <= 10 ? `${to}T23:59:59.999Z` : to);
    if (!Number.isNaN(d.getTime())) toIso = d.toISOString();
  }
  return { fromIso, toIso };
}

function sanitizeIlike(q: string): string {
  return q.replace(/%/g, '').replace(/,/g, ' ').trim();
}

/**
 * GET /api/admin/transactions — list ledger rows + period summary (admin only).
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const adminAuth = await requireAdminSession(supabase);
  if ('response' in adminAuth) return adminAuth.response;

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid query' }, { status: 400 });
  }

  const { flow, kind, status, from, to, q, page, limit } = parsed.data;
  const { fromIso, toIso } = parseRangeBounds(from, to);
  const offset = (page - 1) * limit;

  let listQuery = supabase.from('platform_transactions').select('*', { count: 'exact' });
  if (fromIso) listQuery = listQuery.gte('created_at', fromIso);
  if (toIso) listQuery = listQuery.lte('created_at', toIso);
  if (flow !== 'all') listQuery = listQuery.eq('flow', flow);
  if (kind !== 'all') listQuery = listQuery.eq('kind', kind);
  if (status !== 'all') listQuery = listQuery.eq('status', status);
  if (q && sanitizeIlike(q).length > 0) {
    const pat = `%${sanitizeIlike(q)}%`;
    listQuery = listQuery.or(
      `gateway_reference.ilike.${pat},external_reference.ilike.${pat},counterparty_name.ilike.${pat},counterparty_email.ilike.${pat},notes.ilike.${pat}`,
    );
  }

  listQuery = listQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: items, error: listErr, count } = await listQuery;

  if (listErr) {
    console.error('admin transactions list:', listErr);
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }

  const summaryFrom = fromIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const summaryTo = toIso ?? new Date().toISOString();

  const incomingCompleted = await supabase
    .from('platform_transactions')
    .select('amount_ugx')
    .eq('flow', 'incoming')
    .eq('status', 'completed')
    .gte('created_at', summaryFrom)
    .lte('created_at', summaryTo);

  const outgoingCompleted = await supabase
    .from('platform_transactions')
    .select('amount_ugx')
    .eq('flow', 'outgoing')
    .eq('status', 'completed')
    .gte('created_at', summaryFrom)
    .lte('created_at', summaryTo);

  const pendingOutgoing = await supabase
    .from('platform_transactions')
    .select('amount_ugx')
    .eq('flow', 'outgoing')
    .in('status', ['pending', 'processing'])
    .gte('created_at', summaryFrom)
    .lte('created_at', summaryTo);

  if (incomingCompleted.error || outgoingCompleted.error || pendingOutgoing.error) {
    console.error('admin transactions summary:', incomingCompleted.error, outgoingCompleted.error, pendingOutgoing.error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }

  const incomingCompletedUgx = (incomingCompleted.data ?? []).reduce((s, r) => s + Number(r.amount_ugx), 0);
  const outgoingCompletedUgx = (outgoingCompleted.data ?? []).reduce((s, r) => s + Number(r.amount_ugx), 0);
  const pendingRows = pendingOutgoing.data ?? [];
  const pendingOutgoingUgx = pendingRows.reduce((s, r) => s + Number(r.amount_ugx), 0);

  const summary: AdminTransactionsSummary = {
    incomingCompletedUgx,
    outgoingCompletedUgx,
    netUgx: incomingCompletedUgx - outgoingCompletedUgx,
    pendingOutgoingCount: pendingRows.length,
    pendingOutgoingUgx,
  };

  const body: ListAdminTransactionsResponse = {
    items: (items ?? []) as PlatformTransactionRow[],
    total: count ?? 0,
    page,
    limit,
    summary,
  };

  return NextResponse.json(body);
}

/**
 * POST /api/admin/transactions — create outgoing payout or adjustment (admin only).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const auth = await requireAdminSession(supabase);
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const { kind, amount_ugx, counterparty_user_id, payout_method, payout_details, notes, status } =
    parsed.data;

  let counterparty_name: string | null = null;
  let counterparty_email: string | null = null;

  if (counterparty_user_id) {
    const { data: cp, error: cpErr } = await supabase
      .from('users')
      .select('id, full_name, email, user_type, transporter_approval_status')
      .eq('id', counterparty_user_id)
      .single();

    if (cpErr || !cp) {
      return NextResponse.json({ error: 'Counterparty not found' }, { status: 400 });
    }

    if (kind === 'transporter_payout') {
      if (cp.user_type !== 'transporter') {
        return NextResponse.json({ error: 'Disbursements require a transporter account' }, { status: 400 });
      }
      if (cp.transporter_approval_status !== 'approved') {
        return NextResponse.json(
          { error: 'Disbursements require an approved transporter' },
          { status: 400 },
        );
      }
    }

    counterparty_name = cp.full_name;
    counterparty_email = cp.email;
  }

  const insertRow = {
    flow: 'outgoing' as const,
    kind,
    status,
    amount_ugx,
    currency: 'UGX',
    counterparty_user_id: counterparty_user_id ?? null,
    counterparty_name,
    counterparty_email,
    payout_method: payout_method ?? null,
    payout_details: payout_details ?? {},
    notes: notes?.trim() ? notes.trim() : null,
    created_by: auth.userId,
    gateway_reference: null,
    external_reference: null,
    idempotency_key: null,
    metadata: {},
    failure_reason: null,
    completed_at: null,
  };

  const { data: row, error: insErr } = await supabase
    .from('platform_transactions')
    .insert(insertRow)
    .select('*')
    .single();

  if (insErr) {
    console.error('admin transactions insert:', insErr);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }

  return NextResponse.json({ transaction: row as PlatformTransactionRow }, { status: 201 });
}
