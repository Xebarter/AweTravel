export type TransporterPayoutRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'paid';

export type TransporterPayoutRequest = {
  id: string;
  status: TransporterPayoutRequestStatus;
  amountUgx: number;
  currency: string;
  payoutMethod: string | null;
  transporterNote: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidTransactionId: string | null;
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listTransporterPayoutRequests(): Promise<{ items: TransporterPayoutRequest[] }> {
  const res = await fetch('/api/transporter/payout-requests', { method: 'GET' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { items: TransporterPayoutRequest[] };
}

export async function createTransporterPayoutRequest(input: {
  amountUgx: number;
  payoutMethod?: string | null;
  note?: string | null;
}): Promise<{ id: string }> {
  const res = await fetch('/api/transporter/payout-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { id: string };
}

export async function cancelTransporterPayoutRequest(id: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/transporter/payout-requests/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'cancel' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: true };
}

