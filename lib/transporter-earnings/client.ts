export type TransporterEarningsSummary = {
  grossCompletedUgx: number;
  payoutsCompletedUgx: number;
  payoutsPendingUgx: number;
  netUgx: number;
  payoutRequestsPendingUgx: number;
  availableUgx: number;
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

export type TransporterEarningSourceItem = {
  bookingId: string;
  bookingCode: string;
  travelDate: string;
  seatCode: string;
  bookingStatus: string;
  amountMinor: number;
  currency: string;
  paymentReference: string | null;
  bookedAt: string;
  route: { id: string; routeCode: string; origin: string; destination: string } | null;
  departure: { id: string; departureTime: string | null } | null;
  transaction:
    | {
        id: string;
        kind: string;
        status: string;
        amountUgx: number;
        currency: string;
        createdAt: string;
        completedAt: string | null;
        reference: string | null;
      }
    | null;
  earnedAt: string | null;
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

export async function getTransporterEarningSources(params?: {
  limit?: number;
}): Promise<{ items: TransporterEarningSourceItem[] }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`/api/transporter/earnings/sources${qs.size ? `?${qs.toString()}` : ''}`);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { items: TransporterEarningSourceItem[] };
}

