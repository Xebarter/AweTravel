'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, HandCoins, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { getTransporterEarningSources, getTransporterEarnings, type TransporterEarningSourceItem } from '@/lib/transporter-earnings/client';
import {
  cancelTransporterPayoutRequest,
  createTransporterPayoutRequest,
  listTransporterPayoutRequests,
  type TransporterPayoutRequest,
} from '@/lib/transporter-payout-requests/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function EarningsPage() {
  const [summary, setSummary] = useState<{
    grossCompletedUgx: number;
    payoutsCompletedUgx: number;
    payoutsPendingUgx: number;
    netUgx: number;
    payoutRequestsPendingUgx: number;
    availableUgx: number;
  } | null>(null);
  const [recent, setRecent] = useState<
    { id: string; date: string; label: string; amount: number; status: string; reference: string | null }[]
  >([]);
  const [sources, setSources] = useState<TransporterEarningSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sourceRouteId, setSourceRouteId] = useState<string>('all');
  const [sourceFromDate, setSourceFromDate] = useState<string>('');
  const [sourceToDate, setSourceToDate] = useState<string>('');
  const [sourceQuery, setSourceQuery] = useState<string>('');
  const [activeSource, setActiveSource] = useState<TransporterEarningSourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<TransporterPayoutRequest[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestMethod, setRequestMethod] = useState<string>('mobile_money');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSubmitError, setRequestSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const [earnings, payoutReqs] = await Promise.all([getTransporterEarnings(), listTransporterPayoutRequests()]);
        if (cancelled) return;
        setSummary(earnings.summary);
        setRecent(
          (earnings.recent ?? []).slice(0, 25).map((r) => ({
            id: r.id,
            date: r.createdAt.slice(0, 10),
            label: r.kind === 'passenger_payment' ? 'Booking payment' : 'Payout',
            amount: r.kind === 'transporter_payout' ? -r.amountUgx : r.amountUgx,
            status: r.status,
            reference: r.reference,
          })),
        );
        setPayoutRequests(payoutReqs.items ?? []);
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load earnings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSourcesLoading(true);
    setSourcesError(null);
    void (async () => {
      try {
        const res = await getTransporterEarningSources({ limit: 250 });
        if (cancelled) return;
        setSources(res.items ?? []);
      } catch (e: unknown) {
        if (!cancelled) setSourcesError(e instanceof Error ? e.message : 'Failed to load earning sources.');
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function refreshAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [earnings, payoutReqs] = await Promise.all([getTransporterEarnings(), listTransporterPayoutRequests()]);
      setSummary(earnings.summary);
      setRecent(
        (earnings.recent ?? []).slice(0, 25).map((r) => ({
          id: r.id,
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
  }

  async function refreshSources() {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const res = await getTransporterEarningSources({ limit: 250 });
      setSources(res.items ?? []);
    } catch (e: unknown) {
      setSourcesError(e instanceof Error ? e.message : 'Failed to load earning sources.');
    } finally {
      setSourcesLoading(false);
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
      await refreshAll();
    } catch (e: unknown) {
      setRequestSubmitError(e instanceof Error ? e.message : 'Failed to submit payout request.');
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    setPayoutError(null);
    setPayoutLoading(true);
    try {
      await cancelTransporterPayoutRequest(id);
      await refreshAll();
    } catch (e: unknown) {
      setPayoutError(e instanceof Error ? e.message : 'Failed to cancel payout request.');
    } finally {
      setPayoutLoading(false);
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

  const availableRoutes = useMemo(() => {
    const seen = new Map<string, { id: string; label: string }>();
    for (const s of sources) {
      if (!s.route) continue;
      if (seen.has(s.route.id)) continue;
      seen.set(s.route.id, {
        id: s.route.id,
        label: `${s.route.routeCode} · ${s.route.origin} → ${s.route.destination}`,
      });
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [sources]);

  const filteredSources = useMemo(() => {
    const q = sourceQuery.trim().toLowerCase();
    const from = sourceFromDate ? `${sourceFromDate}T00:00:00.000Z` : null;
    const to = sourceToDate ? `${sourceToDate}T23:59:59.999Z` : null;

    return sources.filter((s) => {
      if (sourceRouteId !== 'all' && s.route?.id !== sourceRouteId) return false;

      const earnedAt = s.earnedAt ?? s.bookedAt;
      if (from && earnedAt && earnedAt < from) return false;
      if (to && earnedAt && earnedAt > to) return false;

      if (!q) return true;
      const hay = [
        s.bookingCode,
        s.paymentReference ?? '',
        s.transaction?.reference ?? '',
        s.route ? `${s.route.routeCode} ${s.route.origin} ${s.route.destination}` : '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sources, sourceRouteId, sourceFromDate, sourceToDate, sourceQuery]);

  const sourcesTotalMinor = useMemo(() => filteredSources.reduce((sum, s) => sum + Number(s.amountMinor ?? 0), 0), [filteredSources]);

  const trendData = useMemo(() => {
    // Simple 6-bucket trend from recent rows: not perfect, but gives transporters a quick feel
    // without adding a heavy aggregate query yet.
    const buckets = new Map<string, { month: string; incoming: number; outgoing: number }>();
    for (const row of recentTransactions) {
      const key = row.date.slice(0, 7); // YYYY-MM
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

  function statusBadgeVariant(status: string): React.ComponentProps<typeof Badge>['variant'] {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'approved') return 'default';
    if (s === 'pending' || s === 'processing') return 'secondary';
    if (s === 'failed' || s === 'cancelled' || s === 'rejected') return 'destructive';
    return 'outline';
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
                disabled={loading}
              >
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-sm" disabled>
                <Download className="size-4" aria-hidden />
                Download
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
                <CardDescription className="text-xs">Your latest booking payments and payouts</CardDescription>
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
                          <TableCell className="max-w-[240px] truncate text-muted-foreground">{t.reference ?? '—'}</TableCell>
                          <TableCell className={`text-right font-semibold ${t.amount < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {formatCurrency(t.amount)}
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
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base font-semibold">Earning sources</CardTitle>
                <CardDescription className="text-xs">
                  See exactly which trip/booking generated each earning, and when the payment completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourcesError ? (
                  <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {sourcesError}
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Route</label>
                    <Select value={sourceRouteId} onValueChange={setSourceRouteId}>
                      <SelectTrigger className="w-full">
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
                    <Input type="date" value={sourceFromDate} onChange={(e) => setSourceFromDate(e.target.value)} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                    <Input type="date" value={sourceToDate} onChange={(e) => setSourceToDate(e.target.value)} />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
                    <Input
                      placeholder="Booking code, reference…"
                      value={sourceQuery}
                      onChange={(e) => setSourceQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end lg:col-span-1">
                    <Button type="button" variant="secondary" className="w-full" onClick={() => void refreshSources()} disabled={sourcesLoading}>
                      {sourcesLoading ? '…' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                  <div className="text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredSources.length}</span> items
                  </div>
                  <div className="font-semibold tabular-nums">{formatCurrency(sourcesTotalMinor / 100)}</div>
                </div>

                {sourcesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : filteredSources.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No matching earnings yet.</div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Earned at</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Booking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSources.slice(0, 100).map((s) => {
                          const earnedAt = (s.earnedAt ?? s.bookedAt).slice(0, 16).replace('T', ' ');
                          const trip = s.route ? `${s.route.origin} → ${s.route.destination}` : '—';
                          const departure = s.departure?.departureTime ? ` · ${String(s.departure.departureTime).slice(0, 5)}` : '';
                          const ref = s.transaction?.reference ?? s.paymentReference ?? '—';
                          return (
                            <TableRow key={s.bookingId}>
                              <TableCell className="whitespace-nowrap">{earnedAt}</TableCell>
                              <TableCell className="font-medium">
                                <div className="truncate">
                                  {trip}
                                  <span className="text-muted-foreground">{departure}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{s.travelDate}</div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="truncate">{s.bookingCode}</div>
                                <div className="text-xs text-muted-foreground">Seat {s.seatCode}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusBadgeVariant(s.transaction?.status ?? 'completed')}>
                                  {s.transaction?.status ?? 'completed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[240px] truncate text-muted-foreground">{ref}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(s.amountMinor / 100)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="secondary" onClick={() => setActiveSource(s)}>
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="text-xs text-muted-foreground">Showing the first 100 rows. Use filters to narrow down.</div>
                  </>
                )}

                <Dialog open={!!activeSource} onOpenChange={(o) => setActiveSource(o ? activeSource : null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Trip earning details</DialogTitle>
                      <DialogDescription>See the exact source and the time the payment was completed.</DialogDescription>
                    </DialogHeader>

                    {activeSource ? (
                      <div className="space-y-4 text-sm">
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {activeSource.route
                                  ? `${activeSource.route.routeCode} · ${activeSource.route.origin} → ${activeSource.route.destination}`
                                  : 'Trip'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Travel date: {activeSource.travelDate}
                                {activeSource.departure?.departureTime
                                  ? ` · Departure: ${String(activeSource.departure.departureTime).slice(0, 5)}`
                                  : ''}
                              </div>
                            </div>
                            <div className="text-right font-semibold tabular-nums">{formatCurrency(activeSource.amountMinor / 100)}</div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border bg-background p-3">
                            <div className="text-xs font-medium text-muted-foreground">Booking</div>
                            <div className="mt-1 font-medium">{activeSource.bookingCode}</div>
                            <div className="mt-1 text-xs text-muted-foreground">Seat: {activeSource.seatCode}</div>
                          </div>
                          <div className="rounded-lg border bg-background p-3">
                            <div className="text-xs font-medium text-muted-foreground">Earnings came in</div>
                            <div className="mt-1 font-medium">
                              {(activeSource.earnedAt ?? activeSource.bookedAt).slice(0, 19).replace('T', ' ')}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Status: {activeSource.transaction?.status ?? 'completed'}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-background p-3">
                          <div className="text-xs font-medium text-muted-foreground">References</div>
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <div>
                              Payment ref: <span className="font-medium text-foreground">{activeSource.paymentReference ?? '—'}</span>
                            </div>
                            <div>
                              Transaction ref:{' '}
                              <span className="font-medium text-foreground">{activeSource.transaction?.reference ?? '—'}</span>
                            </div>
                            <div>
                              Transaction id:{' '}
                              <span className="font-medium text-foreground">{activeSource.transaction?.id ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <DialogFooter>
                      <Button variant="secondary" onClick={() => setActiveSource(null)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
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
                          <TableCell className="max-w-[320px] truncate text-muted-foreground">{r.transporterNote ?? '—'}</TableCell>
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
    </div>
  );
}
