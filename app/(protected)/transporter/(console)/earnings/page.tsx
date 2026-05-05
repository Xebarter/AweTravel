'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  HandCoins,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  getTransporterEarnings,
  getTransporterEarningSources,
  type TransporterEarningSourceGroup,
  type TransporterEarningSourceItem,
  type TransporterEarningSourcesGroupBy,
  type TransporterEarningSourcesTotals,
} from '@/lib/transporter-earnings/client';
import {
  cancelTransporterPayoutRequest,
  createTransporterPayoutRequest,
  listTransporterPayoutRequests,
  type TransporterPayoutRequest,
} from '@/lib/transporter-payout-requests/client';

type SourceFilters = {
  routeId: string;
  from: string;
  to: string;
  q: string;
  groupBy: TransporterEarningSourcesGroupBy;
};

const EMPTY_FILTERS: SourceFilters = {
  routeId: 'all',
  from: '',
  to: '',
  q: '',
  groupBy: 'none',
};

const GROUP_BY_OPTIONS: { id: TransporterEarningSourcesGroupBy; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'route', label: 'Route' },
  { id: 'date', label: 'Date' },
  { id: 'departure', label: 'Departure' },
  { id: 'month', label: 'Month' },
];

function formatLocalDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatElapsed(fromIso: string | null, toIso: string | null): string {
  if (!fromIso || !toIso) return '';
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return '';
  const ms = Math.max(0, to - from);
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EarningsPage() {
  // Page-level summary + ledger
  const [summary, setSummary] = useState<{
    grossCompletedUgx: number;
    payoutsCompletedUgx: number;
    payoutsPendingUgx: number;
    netUgx: number;
    payoutRequestsPendingUgx: number;
    availableUgx: number;
  } | null>(null);
  const [recent, setRecent] = useState<
    {
      id: string;
      kind: 'passenger_payment' | 'transporter_payout';
      date: string;
      label: string;
      amount: number;
      status: string;
      reference: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sources
  const [sources, setSources] = useState<TransporterEarningSourceItem[]>([]);
  const [sourceTotals, setSourceTotals] = useState<TransporterEarningSourcesTotals>({
    count: 0,
    amountUgx: 0,
    firstEarnedAt: null,
    lastEarnedAt: null,
  });
  const [sourceGroups, setSourceGroups] = useState<TransporterEarningSourceGroup[] | null>(null);
  const [topRoutes, setTopRoutes] = useState<TransporterEarningSourceGroup[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SourceFilters>(EMPTY_FILTERS);
  const [activeSource, setActiveSource] = useState<TransporterEarningSourceItem | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Routes index (stable list of routes seen in any fetch, for the route filter dropdown)
  const routeIndexRef = useRef<Map<string, { id: string; label: string }>>(new Map());
  const [, bumpRouteIndex] = useState(0);

  // Payout requests
  const [payoutRequests, setPayoutRequests] = useState<TransporterPayoutRequest[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestMethod, setRequestMethod] = useState<string>('mobile_money');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSubmitError, setRequestSubmitError] = useState<string | null>(null);

  function indexRoutes(items: TransporterEarningSourceItem[]) {
    let added = false;
    for (const it of items) {
      if (!it.route) continue;
      if (routeIndexRef.current.has(it.route.id)) continue;
      routeIndexRef.current.set(it.route.id, {
        id: it.route.id,
        label: `${it.route.routeCode} · ${it.route.origin} → ${it.route.destination}`,
      });
      added = true;
    }
    if (added) bumpRouteIndex((n) => n + 1);
  }

  const availableRoutes = useMemo(
    () =>
      Array.from(routeIndexRef.current.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    // re-derive whenever bumpRouteIndex fires (we read .current outside the dep array on purpose)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeIndexRef.current.size],
  );

  // Fetchers
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [earnings, payoutReqs] = await Promise.all([
        getTransporterEarnings(),
        listTransporterPayoutRequests(),
      ]);
      setSummary(earnings.summary);
      setRecent(
        (earnings.recent ?? []).slice(0, 25).map((r) => ({
          id: r.id,
          kind: r.kind,
          date: r.createdAt.slice(0, 10),
          label: r.kind === 'passenger_payment' ? 'Booking payment' : 'Payout',
          amount: r.kind === 'transporter_payout' ? -r.amountUgx : r.amountUgx,
          status: r.status,
          reference: r.reference,
        })),
      );
      setPayoutRequests(payoutReqs.items ?? []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSources = useCallback(
    async (f: SourceFilters) => {
      setSourcesLoading(true);
      setSourcesError(null);
      try {
        const res = await getTransporterEarningSources({
          routeId: f.routeId !== 'all' ? f.routeId : undefined,
          from: f.from || undefined,
          to: f.to || undefined,
          q: f.q.trim() || undefined,
          groupBy: f.groupBy,
          limit: 250,
        });
        setSources(res.items ?? []);
        setSourceTotals(
          res.totals ?? { count: 0, amountUgx: 0, firstEarnedAt: null, lastEarnedAt: null },
        );
        setSourceGroups(f.groupBy !== 'none' ? res.groups ?? [] : null);
        indexRoutes(res.items ?? []);
      } catch (e: unknown) {
        setSourcesError(e instanceof Error ? e.message : 'Failed to load earning sources.');
      } finally {
        setSourcesLoading(false);
      }
    },
    [],
  );

  const loadTopRoutes = useCallback(async () => {
    try {
      const res = await getTransporterEarningSources({ groupBy: 'route', limit: 250 });
      setTopRoutes((res.groups ?? []).slice(0, 5));
      indexRoutes(res.items ?? []);
    } catch {
      // non-fatal
    }
  }, []);

  // Initial loads
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadTopRoutes();
  }, [loadTopRoutes]);

  // Debounced fetch on filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      void loadSources(filters);
    }, 250);
    return () => clearTimeout(t);
  }, [filters, loadSources]);

  async function refreshAll() {
    await Promise.all([loadSummary(), loadSources(filters), loadTopRoutes()]);
  }

  async function refreshPayoutRequests() {
    setPayoutLoading(true);
    setPayoutError(null);
    try {
      const res = await listTransporterPayoutRequests();
      setPayoutRequests(res.items ?? []);
    } catch (e: unknown) {
      setPayoutError(e instanceof Error ? e.message : 'Failed to load payout requests.');
    } finally {
      setPayoutLoading(false);
    }
  }

  async function submitPayoutRequest() {
    if (!summary) return;
    setRequestSubmitting(true);
    setRequestSubmitError(null);
    try {
      const amount = Number(requestAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setRequestSubmitError('Enter a valid amount.');
        return;
      }
      await createTransporterPayoutRequest({
        amountUgx: Math.floor(amount),
        payoutMethod: requestMethod,
        note: requestNote?.trim() ? requestNote.trim() : null,
      });
      setRequestOpen(false);
      setRequestAmount('');
      setRequestNote('');
      await loadSummary();
    } catch (e: unknown) {
      setRequestSubmitError(
        e instanceof Error ? e.message : 'Failed to submit payout request.',
      );
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    setPayoutError(null);
    setPayoutLoading(true);
    try {
      await cancelTransporterPayoutRequest(id);
      await loadSummary();
    } catch (e: unknown) {
      setPayoutError(e instanceof Error ? e.message : 'Failed to cancel payout request.');
    } finally {
      setPayoutLoading(false);
    }
  }

  // Cross-tab drill-down: open source sheet for a passenger_payment transaction id.
  async function openSourceForTransaction(transactionId: string) {
    const fromCache = sources.find((s) => s.transaction?.id === transactionId) ?? null;
    if (fromCache) {
      setActiveSource(fromCache);
      return;
    }
    setDrilldownLoading(true);
    try {
      const res = await getTransporterEarningSources({ limit: 500 });
      indexRoutes(res.items ?? []);
      const match = (res.items ?? []).find((s) => s.transaction?.id === transactionId) ?? null;
      if (match) {
        setActiveSource(match);
      } else {
        setSourcesError(
          'Could not locate the booking for that transaction. Try filtering Sources by date.',
        );
      }
    } catch (e: unknown) {
      setSourcesError(
        e instanceof Error ? e.message : 'Failed to look up the source booking.',
      );
    } finally {
      setDrilldownLoading(false);
    }
  }

  const earningsSummary = useMemo(() => {
    if (!summary) {
      return {
        totalEarnings: 0,
        netEarnings: 0,
        available: 0,
        pendingPayouts: 0,
        pendingRequests: 0,
        paidOut: 0,
      };
    }
    return {
      totalEarnings: summary.grossCompletedUgx,
      netEarnings: summary.netUgx,
      available: summary.availableUgx,
      pendingPayouts: summary.payoutsPendingUgx,
      pendingRequests: summary.payoutRequestsPendingUgx,
      paidOut: summary.payoutsCompletedUgx,
    };
  }, [summary]);

  const recentTransactions = recent;

  // Recent cashflow trend for Overview
  const trendData = useMemo(() => {
    const buckets = new Map<string, { month: string; incoming: number; outgoing: number }>();
    for (const row of recentTransactions) {
      const key = row.date.slice(0, 7);
      if (!buckets.has(key)) buckets.set(key, { month: key, incoming: 0, outgoing: 0 });
      const b = buckets.get(key)!;
      if (row.amount >= 0) b.incoming += row.amount;
      else b.outgoing += Math.abs(row.amount);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-6)
      .map(([, v]) => v);
  }, [recentTransactions]);

  // Daily timeline for Sources
  const dailyEarnings = useMemo(() => {
    const buckets = new Map<string, { date: string; amount: number; count: number }>();
    for (const it of sources) {
      const earnedAt = it.earnedAt ?? it.bookedAt;
      const key = earnedAt ? earnedAt.slice(0, 10) : '—';
      if (!buckets.has(key)) buckets.set(key, { date: key, amount: 0, count: 0 });
      const b = buckets.get(key)!;
      b.amount += it.amountMinor;
      b.count += 1;
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [sources]);

  // Hour-of-day heat strip
  const hourBuckets = useMemo(() => {
    const counts = new Array(24).fill(0) as number[];
    const amounts = new Array(24).fill(0) as number[];
    for (const it of sources) {
      const earnedAt = it.earnedAt ?? it.bookedAt;
      if (!earnedAt) continue;
      const hour = new Date(earnedAt).getHours();
      if (Number.isFinite(hour) && hour >= 0 && hour < 24) {
        counts[hour] += 1;
        amounts[hour] += it.amountMinor;
      }
    }
    const max = amounts.reduce((m, v) => Math.max(m, v), 0);
    return { counts, amounts, max };
  }, [sources]);

  function statusBadgeVariant(status: string): React.ComponentProps<typeof Badge>['variant'] {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'approved') return 'default';
    if (s === 'pending' || s === 'processing') return 'secondary';
    if (s === 'failed' || s === 'cancelled' || s === 'rejected') return 'destructive';
    return 'outline';
  }

  const filtersActive =
    filters.routeId !== 'all' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.q.trim() !== '' ||
    filters.groupBy !== 'none';

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function exportSourcesCsv() {
    const header = [
      'earned_at',
      'travel_date',
      'departure_time',
      'route_code',
      'origin',
      'destination',
      'booking_code',
      'seat',
      'passenger_name',
      'passenger_email',
      'amount_ugx',
      'status',
      'payment_reference',
      'transaction_reference',
      'transaction_id',
    ];
    const rows = sources.map((s) => [
      formatLocalDateTime(s.earnedAt ?? s.bookedAt),
      s.travelDate,
      s.departure?.departureTime ? String(s.departure.departureTime).slice(0, 5) : '',
      s.route?.routeCode ?? '',
      s.route?.origin ?? '',
      s.route?.destination ?? '',
      s.bookingCode,
      s.seatCode,
      s.passenger?.name ?? '',
      s.passenger?.email ?? '',
      String(s.amountMinor),
      s.transaction?.status ?? 'completed',
      s.paymentReference ?? '',
      s.transaction?.reference ?? '',
      s.transaction?.id ?? '',
    ]);
    const filename = `earnings-sources-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, [header, ...rows]);
  }

  function copyToClipboard(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Transporter console · Earnings
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Earnings & payouts
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Track revenue, available balance, and payout requests. Built for quick weekly checks and cashflow planning.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-border/80 bg-background shadow-sm"
                onClick={() => void refreshAll()}
                disabled={loading || sourcesLoading}
              >
                <RefreshCw
                  className={cn('size-4', (loading || sourcesLoading) && 'animate-spin')}
                  aria-hidden
                />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-border/80 bg-background shadow-sm"
                onClick={exportSourcesCsv}
                disabled={sources.length === 0}
                title={sources.length === 0 ? 'No source rows to export' : 'Export filtered sources to CSV'}
              >
                <Download className="size-4" aria-hidden />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        {/* KPI strip */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'available', label: 'Available', value: formatCurrency(earningsSummary.available) },
            { key: 'net', label: 'Net earned', value: formatCurrency(earningsSummary.netEarnings) },
            { key: 'pending', label: 'Pending payouts', value: formatCurrency(earningsSummary.pendingPayouts) },
            { key: 'paid', label: 'Paid out', value: formatCurrency(earningsSummary.paidOut) },
          ].map((k) => (
            <Card key={k.key} className="border-border/80 shadow-sm">
              <CardContent className="p-2.5">
                <p className="text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                  {loading ? '—' : k.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 h-9 rounded-lg border border-border/70 bg-background p-1 shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-12">
              <Card className="border-border/80 shadow-sm md:col-span-7">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-base font-semibold">Balance</CardTitle>
                  <CardDescription className="text-xs">
                    What you can request right now, and what’s already in motion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm text-muted-foreground">Available to request</p>
                      <p className="mt-2 text-3xl font-bold">{formatCurrency(earningsSummary.available)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Computed as earned − completed payouts − pending payouts − pending requests
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm text-muted-foreground">Net earnings</p>
                      <p className="mt-2 text-3xl font-bold">{formatCurrency(earningsSummary.netEarnings)}</p>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total earned</span>
                          <span className="font-medium">{formatCurrency(earningsSummary.totalEarnings)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Paid out</span>
                          <span className="font-medium">{formatCurrency(earningsSummary.paidOut)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Pending payouts</span>
                          <span className="font-medium">{formatCurrency(earningsSummary.pendingPayouts)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Pending requests</span>
                          <span className="font-medium">{formatCurrency(earningsSummary.pendingRequests)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm md:col-span-5">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
                  <CardDescription className="text-xs">Manage your payouts and cashflow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full gap-2" disabled={loading || !summary || earningsSummary.available <= 0}>
                        <HandCoins className="h-4 w-4" />
                        Request payout
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request payout</DialogTitle>
                        <DialogDescription>
                          Available: {formatCurrency(earningsSummary.available)}. Admin will review and process your request.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount (UGX)</label>
                          <Input
                            inputMode="numeric"
                            placeholder="e.g. 50000"
                            value={requestAmount}
                            onChange={(e) => setRequestAmount(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Payout method</label>
                          <Select value={requestMethod} onValueChange={setRequestMethod}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mobile_money">Mobile money</SelectItem>
                              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Note (optional)</label>
                          <Textarea
                            placeholder="Add any details to help the admin process your request."
                            value={requestNote}
                            onChange={(e) => setRequestNote(e.target.value)}
                          />
                        </div>

                        {requestSubmitError ? (
                          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {requestSubmitError}
                          </div>
                        ) : null}
                      </div>

                      <DialogFooter>
                        <Button variant="secondary" onClick={() => setRequestOpen(false)} disabled={requestSubmitting}>
                          Close
                        </Button>
                        <Button onClick={() => void submitPayoutRequest()} disabled={requestSubmitting}>
                          {requestSubmitting ? 'Submitting…' : 'Submit request'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="secondary" className="w-full" onClick={() => void refreshPayoutRequests()} disabled={payoutLoading}>
                    {payoutLoading ? 'Refreshing…' : 'Refresh payout requests'}
                  </Button>

                  {payoutError ? (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {payoutError}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-12">
              <Card className="border-border/80 shadow-sm md:col-span-12">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-base font-semibold">Recent cashflow</CardTitle>
                  <CardDescription className="text-xs">
                    Incoming payments vs outgoing payouts (based on recent activity)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : trendData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Not enough activity yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="incoming" fill="hsl(var(--primary))" name="Incoming" />
                        <Bar dataKey="outgoing" fill="hsl(var(--destructive))" name="Outgoing" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base font-semibold">Transactions</CardTitle>
                <CardDescription className="text-xs">
                  Your latest booking payments and payouts. Click a booking payment to see the trip that produced it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : recentTransactions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No ledger activity yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.date}</TableCell>
                          <TableCell className="font-medium">{t.label}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(t.status)}>{t.status}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate text-muted-foreground">
                            {t.reference ?? '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              t.amount < 0 ? 'text-destructive' : 'text-foreground',
                            )}
                          >
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.kind === 'passenger_payment' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() => void openSourceForTransaction(t.id)}
                                disabled={drilldownLoading}
                                title="Open the booking that produced this earning"
                              >
                                <Receipt className="h-3.5 w-3.5" aria-hidden />
                                View trip
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-6">
              {/* Toolbar */}
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border/60 bg-muted/20 sm:items-center">
                  <div>
                    <CardTitle className="text-base font-semibold">Earning sources</CardTitle>
                    <CardDescription className="text-xs">
                      See exactly which trip generated each earning, and when the payment came in.
                    </CardDescription>
                  </div>
                  {filtersActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  {sourcesError ? (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {sourcesError}
                    </div>
                  ) : null}

                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Route</label>
                      <Select
                        value={filters.routeId}
                        onValueChange={(v) => setFilters((f) => ({ ...f, routeId: v }))}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="All routes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All routes</SelectItem>
                          {availableRoutes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                      <Input
                        type="date"
                        className="h-9"
                        value={filters.from}
                        onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                      <Input
                        type="date"
                        className="h-9"
                        value={filters.to}
                        onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
                      <Input
                        className="h-9"
                        placeholder="Code, ref, seat…"
                        value={filters.q}
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Group by</label>
                      <div
                        role="tablist"
                        className="inline-flex h-9 w-full items-center gap-0.5 rounded-md border border-border/80 bg-card p-0.5 shadow-sm"
                      >
                        {GROUP_BY_OPTIONS.map((opt) => {
                          const active = filters.groupBy === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              className={cn(
                                'inline-flex h-7 flex-1 items-center justify-center rounded text-[11px] font-medium transition-colors',
                                active
                                  ? 'bg-muted text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                              onClick={() => setFilters((f) => ({ ...f, groupBy: opt.id }))}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                    <div className="text-muted-foreground">
                      {sourcesLoading ? (
                        <span>Loading…</span>
                      ) : (
                        <>
                          <span className="font-medium text-foreground tabular-nums">
                            {sourceTotals.count}
                          </span>{' '}
                          earning{sourceTotals.count === 1 ? '' : 's'}
                          {sourceTotals.firstEarnedAt && sourceTotals.lastEarnedAt ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {sourceTotals.firstEarnedAt.slice(0, 10)} →{' '}
                              {sourceTotals.lastEarnedAt.slice(0, 10)}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="font-semibold tabular-nums">
                      {formatCurrency(sourceTotals.amountUgx)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline + Top trips (only when groupBy is none) */}
              {filters.groupBy === 'none' ? (
                <div className="grid gap-6 lg:grid-cols-12">
                  <Card className="border-border/80 shadow-sm lg:col-span-8">
                    <CardHeader className="border-b border-border/60 bg-muted/20">
                      <CardTitle className="text-base font-semibold">When earnings came in</CardTitle>
                      <CardDescription className="text-xs">
                        Daily earnings within the current filter, plus a 24-hour heat strip showing peak hours.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      {dailyEarnings.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No earnings to plot.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={dailyEarnings}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                              width={70}
                              tickFormatter={(v) => formatCurrency(Number(v))}
                            />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === 'amount') return formatCurrency(Number(value));
                                return value as unknown as string;
                              }}
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid hsl(var(--border))',
                                background: 'hsl(var(--background))',
                              }}
                            />
                            <Bar
                              dataKey="amount"
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                              name="amount"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}

                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                          <span>Hour of day</span>
                          <span>0h → 23h</span>
                        </div>
                        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                          {hourBuckets.amounts.map((amount, hour) => {
                            const intensity =
                              hourBuckets.max > 0 ? amount / hourBuckets.max : 0;
                            return (
                              <div
                                key={hour}
                                title={`${String(hour).padStart(2, '0')}:00 — ${formatCurrency(amount)} (${hourBuckets.counts[hour]} bookings)`}
                                className="h-6 rounded-sm border border-border/40"
                                style={{
                                  backgroundColor:
                                    intensity === 0
                                      ? 'transparent'
                                      : `color-mix(in oklab, hsl(var(--primary)) ${Math.round(
                                          intensity * 80 + 12,
                                        )}%, transparent)`,
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                          <span>00</span>
                          <span>06</span>
                          <span>12</span>
                          <span>18</span>
                          <span>23</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 shadow-sm lg:col-span-4">
                    <CardHeader className="border-b border-border/60 bg-muted/20">
                      <CardTitle className="text-base font-semibold">Top earning trips</CardTitle>
                      <CardDescription className="text-xs">By total earnings (all time).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3">
                      {topRoutes.length === 0 ? (
                        <p className="px-2 py-4 text-sm text-muted-foreground">No trips yet.</p>
                      ) : (
                        <ul className="divide-y divide-border/60">
                          {topRoutes.map((g, idx) => (
                            <li key={g.key}>
                              <button
                                type="button"
                                className="group flex w-full items-center justify-between gap-3 rounded-md p-2.5 text-left hover:bg-muted/40"
                                onClick={() =>
                                  setFilters((f) => ({ ...f, routeId: g.key, groupBy: 'none' }))
                                }
                                title="Filter Sources to this route"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                    {idx + 1}
                                  </span>
                                  <span className="truncate text-sm font-medium">{g.label}</span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 text-right">
                                  <span className="text-sm font-semibold tabular-nums">
                                    {formatCurrency(g.amountUgx)}
                                  </span>
                                  <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* Group view */}
              {filters.groupBy !== 'none' && sourceGroups ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-base font-semibold capitalize">
                      Grouped by {filters.groupBy}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click a group to drill into its bookings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {sourceGroups.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground">No groups in current filter.</div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sourceGroups.map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            className="group flex flex-col rounded-lg border border-border/80 bg-background p-3 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30"
                            onClick={() => {
                              if (filters.groupBy === 'route') {
                                setFilters((f) => ({ ...f, routeId: g.key, groupBy: 'none' }));
                              } else if (filters.groupBy === 'date') {
                                setFilters((f) => ({
                                  ...f,
                                  from: g.key,
                                  to: g.key,
                                  groupBy: 'none',
                                }));
                              } else if (filters.groupBy === 'month') {
                                const [y, m] = g.key.split('-');
                                if (y && m) {
                                  const lastDay = new Date(Number(y), Number(m), 0).getDate();
                                  setFilters((f) => ({
                                    ...f,
                                    from: `${y}-${m}-01`,
                                    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
                                    groupBy: 'none',
                                  }));
                                }
                              } else if (filters.groupBy === 'departure') {
                                const [routeId] = g.key.split('::');
                                if (routeId && routeId !== 'unknown') {
                                  setFilters((f) => ({ ...f, routeId, groupBy: 'none' }));
                                }
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 truncate text-sm font-medium text-foreground">
                                {g.label}
                              </p>
                              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                            <p className="mt-2 text-base font-semibold tabular-nums">
                              {formatCurrency(g.amountUgx)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              <span className="tabular-nums">{g.count}</span> booking{g.count === 1 ? '' : 's'}
                              {g.latestEarnedAt ? (
                                <>
                                  <span aria-hidden> · </span>last {g.latestEarnedAt.slice(11, 16)}
                                </>
                              ) : null}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Source list (always visible when groupBy=none) */}
              {filters.groupBy === 'none' ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-base font-semibold">Sources</CardTitle>
                    <CardDescription className="text-xs">
                      Each row is a completed booking that produced an earning.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sourcesLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                    ) : sources.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No matching earnings.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Earned at</TableHead>
                              <TableHead>Trip</TableHead>
                              <TableHead>Booking</TableHead>
                              <TableHead>Passenger</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sources.slice(0, 100).map((s) => {
                              const earnedAt = formatLocalDateTime(s.earnedAt ?? s.bookedAt);
                              const trip = s.route ? `${s.route.origin} → ${s.route.destination}` : '—';
                              const departure = s.departure?.departureTime
                                ? ` · ${String(s.departure.departureTime).slice(0, 5)}`
                                : '';
                              return (
                                <TableRow key={s.bookingId}>
                                  <TableCell className="whitespace-nowrap tabular-nums">{earnedAt}</TableCell>
                                  <TableCell className="font-medium">
                                    <div className="truncate">
                                      {trip}
                                      <span className="text-muted-foreground">{departure}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground tabular-nums">
                                      {s.travelDate}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-mono text-xs font-medium">{s.bookingCode}</div>
                                    <div className="text-xs text-muted-foreground">Seat {s.seatCode}</div>
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {s.passenger?.name ?? '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={statusBadgeVariant(s.transaction?.status ?? 'completed')}>
                                      {s.transaction?.status ?? 'completed'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold tabular-nums">
                                    {formatCurrency(s.amountMinor)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setActiveSource(s)}>
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {sources.length > 100 ? (
                      <div className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
                        Showing the first 100 rows. Narrow your filters to load fewer.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base font-semibold">Payout requests</CardTitle>
                <CardDescription className="text-xs">Requests you’ve sent to admin for processing</CardDescription>
              </CardHeader>
              <CardContent>
                {payoutError ? (
                  <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {payoutError}
                  </div>
                ) : null}

                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : payoutRequests.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No payout requests yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.createdAt.slice(0, 10)}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.payoutMethod ?? '—'}</TableCell>
                          <TableCell className="max-w-[320px] truncate text-muted-foreground">
                            {r.transporterNote ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(r.amountUgx)}</TableCell>
                          <TableCell className="text-right">
                            {r.status === 'pending' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void cancelRequest(r.id)}
                                disabled={payoutLoading}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Source detail Sheet */}
      <Sheet open={!!activeSource} onOpenChange={(o) => !o && setActiveSource(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-[480px]"
        >
          {activeSource ? (
            <>
              <SheetHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Earning detail
                    </p>
                    <SheetTitle className="mt-0.5 truncate text-base">
                      {activeSource.route
                        ? `${activeSource.route.routeCode} · ${activeSource.route.origin} → ${activeSource.route.destination}`
                        : 'Trip'}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-xs">
                      Booking {activeSource.bookingCode}
                    </SheetDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {formatCurrency(activeSource.amountMinor)}
                    </p>
                    <Badge
                      variant={statusBadgeVariant(activeSource.transaction?.status ?? 'completed')}
                      className="mt-1"
                    >
                      {activeSource.transaction?.status ?? 'completed'}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-3 px-4 pb-4 text-sm">
                {/* Trip */}
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Trip
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Travel date</dt>
                    <dd className="text-right tabular-nums">{activeSource.travelDate}</dd>
                    <dt className="text-muted-foreground">Departure</dt>
                    <dd className="text-right tabular-nums">
                      {activeSource.departure?.departureTime
                        ? String(activeSource.departure.departureTime).slice(0, 5)
                        : '—'}
                    </dd>
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd className="text-right">
                      {activeSource.departure?.vehicle?.registration ?? '—'}
                    </dd>
                  </dl>
                </div>

                {/* Booking */}
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Booking
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Code</dt>
                    <dd className="text-right">
                      <span className="font-mono">{activeSource.bookingCode}</span>
                    </dd>
                    <dt className="text-muted-foreground">Seat</dt>
                    <dd className="text-right">{activeSource.seatCode}</dd>
                    <dt className="text-muted-foreground">Booking status</dt>
                    <dd className="text-right capitalize">{activeSource.bookingStatus}</dd>
                  </dl>
                </div>

                {/* Passenger */}
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Passenger
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-right">{activeSource.passenger?.name ?? '—'}</dd>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate text-right">
                      {activeSource.passenger?.email ?? '—'}
                    </dd>
                  </dl>
                </div>

                {/* Payment timeline */}
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Payment timeline
                  </p>
                  <ol className="mt-2 space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">Booking created</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatLocalDateTime(activeSource.bookedAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                    {activeSource.transaction?.createdAt ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Payment created</span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatLocalDateTime(activeSource.transaction.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {formatElapsed(activeSource.bookedAt, activeSource.transaction.createdAt)} after booking
                          </p>
                        </div>
                      </li>
                    ) : null}
                    {activeSource.transaction?.completedAt ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">Payment completed</span>
                            <span className="tabular-nums text-muted-foreground">
                              {formatLocalDateTime(activeSource.transaction.completedAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Earnings landed{' '}
                            {formatElapsed(
                              activeSource.transaction.createdAt,
                              activeSource.transaction.completedAt,
                            )}{' '}
                            after payment created
                          </p>
                        </div>
                      </li>
                    ) : null}
                  </ol>
                </div>

                {/* References */}
                <div className="rounded-lg border border-border/70 bg-background p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    References
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {[
                      { label: 'Payment ref', value: activeSource.paymentReference ?? '' },
                      { label: 'Transaction ref', value: activeSource.transaction?.reference ?? '' },
                      { label: 'Transaction id', value: activeSource.transaction?.id ?? '' },
                    ].map((row) => (
                      <li key={row.label} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate font-mono text-foreground">
                            {row.value || '—'}
                          </span>
                          {row.value ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0"
                              title={`Copy ${row.label}`}
                              onClick={() => copyToClipboard(row.value)}
                            >
                              <Copy className="size-3" aria-hidden />
                            </Button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <SheetFooter className="border-t border-border/60">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Link
                      href={`/transporter/bookings?q=${encodeURIComponent(activeSource.bookingCode)}`}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open booking
                    </Link>
                  </Button>
                  {activeSource.route ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <Link href={`/transporter/routes/${activeSource.route.id}`}>
                        <ExternalLink className="size-3.5" aria-hidden />
                        Open route
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
