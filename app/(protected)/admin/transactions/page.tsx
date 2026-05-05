'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import {
  Download,
  Eye,
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatCurrency } from '@/lib/currency';
import {
  createOutgoingTransaction,
  listAdminTransactions,
  patchAdminTransaction,
  type ListAdminTransactionsResponse,
  type PlatformTransactionRow,
} from '@/lib/admin/transactions/client';
import { listAdminTransporters, type AdminTransporterRow } from '@/lib/admin/transporters/client';
import { cn } from '@/lib/utils';

const FLOW_TABS: { id: 'all' | 'incoming' | 'outgoing'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Disbursements' },
];

function kindLabel(kind: PlatformTransactionRow['kind']): string {
  switch (kind) {
    case 'passenger_payment':
      return 'Passenger payment';
    case 'transporter_payout':
      return 'Transporter payout';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    default:
      return kind;
  }
}

function statusBadge(status: PlatformTransactionRow['status']) {
  switch (status) {
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="h-5 border-emerald-200/80 bg-emerald-50/80 px-1.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          Completed
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="h-5 border-amber-200/80 bg-amber-50/80 px-1.5 text-[11px] font-medium text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-50"
        >
          Pending
        </Badge>
      );
    case 'processing':
      return (
        <Badge
          variant="outline"
          className="h-5 border-sky-200/80 bg-sky-50/80 px-1.5 text-[11px] font-medium text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100"
        >
          Processing
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="outline"
          className="h-5 border-destructive/30 bg-destructive/5 px-1.5 text-[11px] font-medium text-destructive"
        >
          Failed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium text-muted-foreground">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
          {status}
        </Badge>
      );
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsvCell(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: PlatformTransactionRow[]) {
  const headers = [
    'id',
    'created_at',
    'flow',
    'kind',
    'status',
    'amount_ugx',
    'counterparty_name',
    'counterparty_email',
    'gateway_reference',
    'external_reference',
    'notes',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.created_at,
        r.flow,
        r.kind,
        r.status,
        String(r.amount_ugx),
        r.counterparty_name ?? '',
        r.counterparty_email ?? '',
        r.gateway_reference ?? '',
        r.external_reference ?? '',
        r.notes ?? '',
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTransactionsPage() {
  const defaultTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const defaultFrom = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [flowTab, setFlowTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | PlatformTransactionRow['status']
  >('all');
  const [searchQ, setSearchQ] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [data, setData] = useState<ListAdminTransactionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [detailRow, setDetailRow] = useState<PlatformTransactionRow | null>(null);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [transporters, setTransporters] = useState<AdminTransporterRow[]>([]);
  const [transportersLoading, setTransportersLoading] = useState(false);

  const [createKind, setCreateKind] = useState<'transporter_payout' | 'adjustment'>('transporter_payout');
  const [createAmount, setCreateAmount] = useState('');
  const [createTransporterId, setCreateTransporterId] = useState('');
  const [createPayoutMethod, setCreatePayoutMethod] = useState<
    'mobile_money' | 'bank_transfer' | 'cash' | 'other'
  >('mobile_money');
  const [createPhone, setCreatePhone] = useState('');
  const [createBankName, setCreateBankName] = useState('');
  const [createAccountNumber, setCreateAccountNumber] = useState('');
  const [createAccountName, setCreateAccountName] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [completeTarget, setCompleteTarget] = useState<PlatformTransactionRow | null>(null);
  const [completeRef, setCompleteRef] = useState('');
  const [completeBusy, setCompleteBusy] = useState(false);

  const [failTarget, setFailTarget] = useState<PlatformTransactionRow | null>(null);
  const [failReason, setFailReason] = useState('');
  const [failBusy, setFailBusy] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<PlatformTransactionRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, flowTab, statusFilter, searchQ]);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchQ(searchDraft.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const res = await listAdminTransactions({
        from: fromDate,
        to: toDate,
        flow: flowTab,
        status: statusFilter,
        q: searchQ.trim() || undefined,
        page,
        limit,
      });
      setData(res);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, flowTab, statusFilter, searchQ, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!disburseOpen) return;
    let cancelled = false;
    setTransportersLoading(true);
    void (async () => {
      try {
        const rows = await listAdminTransporters('approved');
        if (!cancelled) setTransporters(rows);
      } catch {
        if (!cancelled) setTransporters([]);
      } finally {
        if (!cancelled) setTransportersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [disburseOpen]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const openCreate = () => {
    setActionError(null);
    setCreateKind('transporter_payout');
    setCreateAmount('');
    setCreateTransporterId('');
    setCreatePayoutMethod('mobile_money');
    setCreatePhone('');
    setCreateBankName('');
    setCreateAccountNumber('');
    setCreateAccountName('');
    setCreateNotes('');
    setCreateError(null);
    setDisburseOpen(true);
  };

  const submitCreate = async () => {
    setCreateError(null);
    const amount = Math.round(Number(createAmount.replace(/,/g, '')));
    if (!Number.isFinite(amount) || amount < 1) {
      setCreateError('Enter a valid amount in UGX.');
      return;
    }
    if (createKind === 'transporter_payout' && !createTransporterId) {
      setCreateError('Select a transporter.');
      return;
    }
    const payout_details: Record<string, unknown> =
      createPayoutMethod === 'mobile_money'
        ? { phone: createPhone.trim() || undefined }
        : createPayoutMethod === 'bank_transfer'
          ? {
              bankName: createBankName.trim() || undefined,
              accountNumber: createAccountNumber.trim() || undefined,
              accountName: createAccountName.trim() || undefined,
            }
          : {};

    setCreateBusy(true);
    try {
      await createOutgoingTransaction({
        kind: createKind,
        amount_ugx: amount,
        counterparty_user_id: createKind === 'transporter_payout' ? createTransporterId : null,
        payout_method: createKind === 'transporter_payout' ? createPayoutMethod : null,
        payout_details: createKind === 'transporter_payout' ? payout_details : {},
        notes: createNotes.trim() || null,
        status: 'pending',
      });
      setDisburseOpen(false);
      await reload();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreateBusy(false);
    }
  };

  const submitComplete = async () => {
    if (!completeTarget || !completeRef.trim()) return;
    setActionError(null);
    setCompleteBusy(true);
    try {
      await patchAdminTransaction(completeTarget.id, {
        status: 'completed',
        external_reference: completeRef.trim(),
      });
      setCompleteTarget(null);
      setCompleteRef('');
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update transaction');
    } finally {
      setCompleteBusy(false);
    }
  };

  const submitFail = async () => {
    if (!failTarget || !failReason.trim()) return;
    setActionError(null);
    setFailBusy(true);
    try {
      await patchAdminTransaction(failTarget.id, {
        status: 'failed',
        failure_reason: failReason.trim(),
      });
      setFailTarget(null);
      setFailReason('');
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update transaction');
    } finally {
      setFailBusy(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    setActionError(null);
    setCancelBusy(true);
    try {
      await patchAdminTransaction(cancelTarget.id, { status: 'cancelled' });
      setCancelTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update transaction');
    } finally {
      setCancelBusy(false);
    }
  };

  const summary = data?.summary;

  const kpiStrip = [
    { key: 'in', label: 'Incoming (done)', value: formatCurrency(summary?.incomingCompletedUgx ?? 0) },
    { key: 'out', label: 'Disbursed (done)', value: formatCurrency(summary?.outgoingCompletedUgx ?? 0) },
    { key: 'net', label: 'Net (in − out)', value: formatCurrency(summary?.netUgx ?? 0) },
  ] as const;

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Finance
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                Transactions
              </h1>
              <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
                Incoming passenger payments and outgoing disbursements. KPIs use the date range below (defaults to the
                last 30 days). Return to{' '}
                <Link href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
                  Admin home
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                disabled={isLoading}
                onClick={() => void reload()}
              >
                <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} aria-hidden />
                Refresh data
              </Button>
              <Button type="button" size="sm" className="h-8 gap-1.5 text-xs font-medium" onClick={openCreate}>
                <Plus className="size-3.5" aria-hidden />
                New disbursement
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loadError ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Could not load data</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void reload()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!loadError && actionError ? (
          <Alert variant="destructive" className="border-destructive/30">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {kpiStrip.map((item) => (
              <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <div className="mt-0.5">
                  {isLoading && !summary ? (
                    <Skeleton className="h-5 w-24" />
                  ) : (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pending out</p>
              <div className="mt-0.5">
                {isLoading && !summary ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <>
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {summary?.pendingOutgoingCount ?? 0}
                    </p>
                    <p className="text-xs font-medium tabular-nums text-muted-foreground">
                      {formatCurrency(summary?.pendingOutgoingUgx ?? 0)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-0 border-b border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Ledger</CardTitle>
                <CardDescription className="text-xs">
                  Filter by flow, status, and date range. Search updates after you pause typing.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs font-medium"
                disabled={!data?.items.length}
                onClick={() => data && downloadCsv(data.items)}
              >
                <Download className="size-3.5" aria-hidden />
                Export CSV
              </Button>
            </div>

            <nav
              className="mt-4 flex gap-0 overflow-x-auto border-b border-border -mb-px pb-px"
              role="tablist"
              aria-label="Transaction flow"
            >
              {FLOW_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={flowTab === t.id}
                  className={cn(
                    'relative shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                    flowTab === t.id
                      ? 'border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setFlowTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="tx-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="tx-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-full border-border bg-background text-sm shadow-none md:w-44"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="tx-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-full border-border bg-background text-sm shadow-none md:w-44"
                />
              </div>
              <div className="space-y-1.5 min-w-40">
                <Label className="text-xs">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className="h-8 w-full border-border bg-background text-sm shadow-none md:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-48">
                <Label htmlFor="tx-search" className="text-xs">
                  Search
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tx-search"
                    placeholder="Reference, email, name…"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    className="h-8 border-border bg-background pl-8 text-sm shadow-none"
                    disabled={isLoading}
                    aria-label="Search transactions"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    When
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Flow
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kind
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Counterparty
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex items-center gap-2 px-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <div className="flex flex-col items-center px-6 py-14 text-center">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
                          <Inbox className="size-4 text-muted-foreground" aria-hidden />
                        </div>
                        <p className="text-sm font-medium text-foreground">No records in this view</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                          Widen the date range, change flow or status, or clear search.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  data?.items.map((row) => (
                    <TableRow key={row.id} className="border-b transition-colors hover:bg-muted/40">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatWhen(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs font-medium uppercase tracking-wide',
                            row.flow === 'incoming' ? 'text-emerald-700' : 'text-amber-800',
                          )}
                        >
                          {row.flow === 'incoming' ? 'In' : 'Out'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-40 truncate">{kindLabel(row.kind)}</TableCell>
                      <TableCell className="max-w-48">
                        <div className="truncate font-medium">{row.counterparty_name ?? '—'}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {row.counterparty_email ?? ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(row.amount_ugx)}
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="max-w-36 truncate font-mono text-xs text-muted-foreground">
                        {row.gateway_reference ?? row.external_reference ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDetailRow(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {row.flow === 'outgoing' &&
                            (row.status === 'pending' || row.status === 'processing') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setCompleteTarget(row);
                                      setCompleteRef('');
                                    }}
                                  >
                                    Mark completed…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setFailTarget(row);
                                      setFailReason('');
                                    }}
                                  >
                                    Mark failed…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setCancelTarget(row)}
                                  >
                                    Cancel payout
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {data && data.total > limit ? (
              <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="tabular-nums">
                  Page {page} of {totalPages} · {data.total} total
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transaction detail</DialogTitle>
            <DialogDescription>{detailRow && formatWhen(detailRow.created_at)}</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">Flow</p>
                  <p className="font-medium">{detailRow.flow}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kind</p>
                  <p className="font-medium">{kindLabel(detailRow.kind)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <div className="pt-0.5">{statusBadge(detailRow.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-semibold">{formatCurrency(detailRow.amount_ugx)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Counterparty</p>
                <p className="font-medium">{detailRow.counterparty_name ?? '—'}</p>
                <p className="text-muted-foreground">{detailRow.counterparty_email ?? ''}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 font-mono text-xs break-all">
                <div>
                  <span className="text-muted-foreground">Gateway ref: </span>
                  {detailRow.gateway_reference ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">External ref: </span>
                  {detailRow.external_reference ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Idempotency: </span>
                  {detailRow.idempotency_key ?? '—'}
                </div>
              </div>
              {detailRow.payout_method && (
                <div>
                  <p className="text-muted-foreground text-xs">Payout method</p>
                  <p className="font-medium capitalize">{detailRow.payout_method.replace('_', ' ')}</p>
                  <pre className="mt-1 rounded-md bg-muted/50 p-2 text-xs overflow-x-auto">
                    {JSON.stringify(detailRow.payout_details ?? {}, null, 2)}
                  </pre>
                </div>
              )}
              {detailRow.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p>{detailRow.notes}</p>
                </div>
              )}
              {detailRow.failure_reason && (
                <div>
                  <p className="text-muted-foreground text-xs">Failure reason</p>
                  <p className="text-destructive">{detailRow.failure_reason}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Metadata</p>
                <pre className="rounded-md bg-muted/50 p-2 text-xs overflow-x-auto max-h-40">
                  {JSON.stringify(detailRow.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={disburseOpen} onOpenChange={setDisburseOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New disbursement</DialogTitle>
            <DialogDescription>
              Record an outgoing payout. Mark it completed after funds are sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={createKind}
                onValueChange={(v) => setCreateKind(v as typeof createKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transporter_payout">Transporter payout</SelectItem>
                  <SelectItem value="adjustment">Adjustment (manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createKind === 'transporter_payout' && (
              <div className="space-y-2">
                <Label>Transporter</Label>
                {transportersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={createTransporterId} onValueChange={setCreateTransporterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select approved transporter" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {transporters.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name} · {t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-amt">Amount (UGX)</Label>
              <Input
                id="create-amt"
                inputMode="numeric"
                placeholder="e.g. 500000"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
              />
            </div>
            {createKind === 'transporter_payout' && (
              <>
                <div className="space-y-2">
                  <Label>Payout method</Label>
                  <Select
                    value={createPayoutMethod}
                    onValueChange={(v) => setCreatePayoutMethod(v as typeof createPayoutMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile money</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createPayoutMethod === 'mobile_money' && (
                  <div className="space-y-2">
                    <Label htmlFor="mm-phone">Phone number</Label>
                    <Input
                      id="mm-phone"
                      placeholder="+256…"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                    />
                  </div>
                )}
                {createPayoutMethod === 'bank_transfer' && (
                  <div className="space-y-2">
                    <Label htmlFor="bnk-name">Bank name</Label>
                    <Input
                      id="bnk-name"
                      value={createBankName}
                      onChange={(e) => setCreateBankName(e.target.value)}
                    />
                    <Label htmlFor="bnk-acct">Account number</Label>
                    <Input
                      id="bnk-acct"
                      value={createAccountNumber}
                      onChange={(e) => setCreateAccountNumber(e.target.value)}
                    />
                    <Label htmlFor="bnk-hold">Account name</Label>
                    <Input
                      id="bnk-hold"
                      value={createAccountName}
                      onChange={(e) => setCreateAccountName(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-notes">Internal notes</Label>
              <Textarea
                id="create-notes"
                rows={3}
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDisburseOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={createBusy}>
              {createBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completeTarget} onOpenChange={(o) => !o && setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark completed</DialogTitle>
            <DialogDescription>
              Enter the bank or mobile-money confirmation reference shown after the transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ext-ref">External reference</Label>
            <Input
              id="ext-ref"
              value={completeRef}
              onChange={(e) => setCompleteRef(e.target.value)}
              placeholder="Transaction ID / receipt number"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitComplete()}
              disabled={completeBusy || !completeRef.trim()}
            >
              {completeBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!failTarget} onOpenChange={(o) => !o && setFailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark failed</DialogTitle>
            <DialogDescription>Document why this payout could not be completed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fail-reason">Reason</Label>
            <Textarea
              id="fail-reason"
              rows={4}
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFailTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitFail()}
              disabled={failBusy || !failReason.trim()}
            >
              {failBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the disbursement as cancelled. It cannot be completed later from this record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void submitCancel()} disabled={cancelBusy}>
              {cancelBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel payout
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
