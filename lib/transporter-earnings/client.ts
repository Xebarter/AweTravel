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
  passenger: { id: string; name: string | null; email: string | null } | null;
  route: { id: string; routeCode: string; origin: string; destination: string } | null;
  departure: {
    id: string;
    departureTime: string | null;
    vehicle: { id: string; registration: string } | null;
  } | null;
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

export type TransporterEarningSourcesTotals = {
  count: number;
  amountUgx: number;
  firstEarnedAt: string | null;
  lastEarnedAt: string | null;
};

export type TransporterEarningSourceGroup = {
  key: string;
  label: string;
  count: number;
  amountUgx: number;
  latestEarnedAt: string | null;
};

export type TransporterEarningSourcesGroupBy =
  | 'none'
  | 'route'
  | 'date'
  | 'departure'
  | 'month';

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
  routeId?: string;
  from?: string;
  to?: string;
  q?: string;
  groupBy?: TransporterEarningSourcesGroupBy;
  limit?: number;
  offset?: number;
}): Promise<{
  items: TransporterEarningSourceItem[];
  totals: TransporterEarningSourcesTotals;
  groups?: TransporterEarningSourceGroup[];
}> {
  const qs = new URLSearchParams();
  if (params?.routeId) qs.set('routeId', params.routeId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.q) qs.set('q', params.q);
  if (params?.groupBy && params.groupBy !== 'none') qs.set('groupBy', params.groupBy);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));

  const res = await fetch(
    `/api/transporter/earnings/sources${qs.size ? `?${qs.toString()}` : ''}`,
  );
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    items: TransporterEarningSourceItem[];
    totals: TransporterEarningSourcesTotals;
    groups?: TransporterEarningSourceGroup[];
  };
}
