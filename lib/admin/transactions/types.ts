export type PlatformTransactionFlow = 'incoming' | 'outgoing';

export type PlatformTransactionKind =
  | 'passenger_payment'
  | 'transporter_payout'
  | 'refund'
  | 'adjustment';

export type PlatformTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PayoutMethod = 'mobile_money' | 'bank_transfer' | 'cash' | 'other';

export type PlatformTransactionRow = {
  id: string;
  flow: PlatformTransactionFlow;
  kind: PlatformTransactionKind;
  status: PlatformTransactionStatus;
  amount_ugx: number;
  currency: string;
  counterparty_user_id: string | null;
  counterparty_name: string | null;
  counterparty_email: string | null;
  gateway_reference: string | null;
  external_reference: string | null;
  idempotency_key: string | null;
  payout_method: PayoutMethod | null;
  payout_details: Record<string, unknown>;
  metadata: Record<string, unknown>;
  notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  completed_at: string | null;
};

export type AdminTransactionsSummary = {
  incomingCompletedUgx: number;
  outgoingCompletedUgx: number;
  netUgx: number;
  pendingOutgoingCount: number;
  pendingOutgoingUgx: number;
};

export type ListAdminTransactionsResponse = {
  items: PlatformTransactionRow[];
  total: number;
  page: number;
  limit: number;
  summary: AdminTransactionsSummary;
};
