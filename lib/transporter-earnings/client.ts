export type TransporterEarningsSummary = {
  grossCompletedUgx: number;
  payoutsCompletedUgx: number;
  payoutsPendingUgx: number;
  netUgx: number;
};

export type TransporterLedgerRow = {
  id: string;
  kind: 'passenger_payment' | 'transporter_payout';
  status: string;
  amountUgx: number;
  currency: string;
  createdAt: string;
  completedAt: string | null;
  reference: string | null;
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getTransporterEarnings(): Promise<{
  summary: TransporterEarningsSummary;
  recent: TransporterLedgerRow[];
}> {
  const res = await fetch('/api/transporter/earnings');
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { summary: TransporterEarningsSummary; recent: TransporterLedgerRow[] };
}

