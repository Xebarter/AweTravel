import type {
  ListAdminTransactionsResponse,
  PlatformTransactionRow,
  PlatformTransactionStatus,
} from '@/lib/admin/transactions/types';

export type {
  AdminTransactionsSummary,
  ListAdminTransactionsResponse,
  PlatformTransactionFlow,
  PlatformTransactionKind,
  PlatformTransactionRow,
  PlatformTransactionStatus,
  PayoutMethod,
} from '@/lib/admin/transactions/types';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export type ListAdminTransactionsParams = {
  flow?: 'incoming' | 'outgoing' | 'all';
  kind?: 'passenger_payment' | 'transporter_payout' | 'refund' | 'adjustment' | 'all';
  status?: PlatformTransactionStatus | 'all';
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export async function listAdminTransactions(
  params: ListAdminTransactionsParams = {},
): Promise<ListAdminTransactionsResponse> {
  const sp = new URLSearchParams();
  if (params.flow) sp.set('flow', params.flow);
  if (params.kind) sp.set('kind', params.kind);
  if (params.status) sp.set('status', params.status);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));

  const q = sp.toString();
  const res = await fetch(`/api/admin/transactions${q ? `?${q}` : ''}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ListAdminTransactionsResponse;
}

export type CreateOutgoingTransactionPayload = {
  kind: 'transporter_payout' | 'adjustment';
  amount_ugx: number;
  counterparty_user_id?: string | null;
  payout_method?: 'mobile_money' | 'bank_transfer' | 'cash' | 'other' | null;
  payout_details?: Record<string, unknown>;
  notes?: string | null;
  status?: 'pending' | 'processing';
};

export async function createOutgoingTransaction(
  payload: CreateOutgoingTransactionPayload,
): Promise<PlatformTransactionRow> {
  const res = await fetch('/api/admin/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transaction: PlatformTransactionRow };
  return j.transaction;
}

export type PatchAdminTransactionPayload = {
  status: 'completed' | 'failed' | 'cancelled' | 'processing';
  external_reference?: string | null;
  failure_reason?: string | null;
  notes?: string | null;
};

export async function patchAdminTransaction(
  id: string,
  payload: PatchAdminTransactionPayload,
): Promise<PlatformTransactionRow> {
  const res = await fetch(`/api/admin/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transaction: PlatformTransactionRow };
  return j.transaction;
}
