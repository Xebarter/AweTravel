'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import {
  approveTransporter,
  createAdminTransporter,
  deleteAdminTransporter,
  listAdminTransporters,
  rejectTransporter,
  updateAdminTransporter,
  type AdminTransporterRow,
} from '@/lib/admin/transporters/client';
import type { TransporterApprovalStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

function formatJoined(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadge(status: TransporterApprovalStatus) {
  switch (status) {
    case 'approved':
      return (
        <Badge
          variant="outline"
          className="h-5 border-emerald-200/80 bg-emerald-50/80 px-1.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          Approved
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
    case 'rejected':
      return (
        <Badge
          variant="outline"
          className="h-5 border-destructive/30 bg-destructive/5 px-1.5 text-[11px] font-medium text-destructive"
        >
          Rejected
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

export default function AdminTransportersPage() {
  const [rows, setRows] = useState<AdminTransporterRow[]>([]);
  const [globalCounts, setGlobalCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminTransporterRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminTransporterRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editKyc, setEditKyc] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTransporterRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!editTarget) return;
    setEditFullName(editTarget.full_name);
    setEditEmail(editTarget.email);
    setEditPhone(editTarget.phone ?? '');
    setEditKyc(editTarget.kyc_verified);
  }, [editTarget]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [data, all] = await Promise.all([
        listAdminTransporters(filter === 'all' ? 'all' : filter),
        listAdminTransporters('all'),
      ]);
      setRows(data);
      setGlobalCounts({
        pending: all.filter((r) => r.transporter_approval_status === 'pending').length,
        approved: all.filter((r) => r.transporter_approval_status === 'approved').length,
        rejected: all.filter((r) => r.transporter_approval_status === 'rejected').length,
        total: all.length,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load transporters.');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const handleApprove = async () => {
    if (!approveId) return;
    setActionError(null);
    setApproveBusy(true);
    try {
      await approveTransporter(approveId);
      setApproveId(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed.');
    } finally {
      setApproveBusy(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setActionError(null);
    setRejectBusy(true);
    try {
      await rejectTransporter(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed.');
    } finally {
      setRejectBusy(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setActionError(null);
    setEditBusy(true);
    try {
      const patch: Parameters<typeof updateAdminTransporter>[1] = {};
      if (editFullName.trim() !== editTarget.full_name) patch.full_name = editFullName.trim();
      if (editEmail.trim().toLowerCase() !== editTarget.email.toLowerCase()) patch.email = editEmail.trim();
      const phoneVal = editPhone.trim();
      if ((editTarget.phone ?? '') !== phoneVal) patch.phone = phoneVal === '' ? null : phoneVal;
      if (editKyc !== editTarget.kyc_verified) patch.kyc_verified = editKyc;
      if (Object.keys(patch).length === 0) {
        setEditTarget(null);
        return;
      }
      await updateAdminTransporter(editTarget.id, patch);
      setEditTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleCreateSubmit = async () => {
    setActionError(null);
    setCreateBusy(true);
    try {
      await createAdminTransporter({
        email: createEmail.trim(),
        password: createPassword,
        full_name: createFullName.trim(),
        phone: createPhone.trim() || null,
      });
      setCreateOpen(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreatePhone('');
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not create operator.');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteAdminTransporter(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'pending', label: 'Pending', count: globalCounts.pending },
    { id: 'approved', label: 'Approved', count: globalCounts.approved },
    { id: 'rejected', label: 'Rejected', count: globalCounts.rejected },
    { id: 'all', label: 'All', count: globalCounts.total },
  ];

  const kpiItems = [
    { key: 'total', label: 'Total operators', value: globalCounts.total },
    { key: 'pending', label: 'Pending review', value: globalCounts.pending },
    { key: 'approved', label: 'Approved', value: globalCounts.approved },
    { key: 'rejected', label: 'Rejected', value: globalCounts.rejected },
  ] as const;

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Operators
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                Transporter management
              </h1>
              <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
                Full operator lifecycle: review approvals, edit profiles, provision accounts, and remove access.
                Traveler accounts are managed under{' '}
                <Link href="/admin/users" className="font-medium text-primary underline-offset-4 hover:underline">
                  Passengers
                </Link>
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs font-medium"
              disabled={isLoading}
              onClick={() => void reload()}
            >
              <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} aria-hidden />
              Refresh data
            </Button>
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

        {/* Compact KPI strip */}
        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
            {kpiItems.map((item) => (
              <div key={item.key} className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="h-5 w-10" />
                  ) : (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-0 border-b border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Applicant directory</CardTitle>
                <CardDescription className="text-xs">Filter by status and search the list</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-xs font-medium"
                  variant="outline"
                  onClick={() => {
                    setActionError(null);
                    setCreateEmail('');
                    setCreatePassword('');
                    setCreateFullName('');
                    setCreatePhone('');
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add operator
                </Button>
                <div className="relative w-full sm:min-w-[220px] lg:max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 border-border bg-background pl-8 text-sm shadow-none"
                    disabled={isLoading}
                    aria-label="Search transporters"
                  />
                </div>
              </div>
            </div>
            <nav
              className="mt-4 flex gap-0 border-b border-border -mb-px"
              role="tablist"
              aria-label="Approval status"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === t.id}
                  className={cn(
                    'relative -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                    filter === t.id
                      ? 'border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setFilter(t.id)}
                >
                  <span>{t.label}</span>
                  {!isLoading && typeof t.count === 'number' ? (
                    <span
                      className={cn(
                        'ml-1.5 tabular-nums text-xs font-normal text-muted-foreground',
                        filter === t.id && 'text-foreground/80',
                      )}
                    >
                      {t.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border px-4 py-3 sm:px-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="py-3">
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
                  <Inbox className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">No records in this view</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Change the status filter above or adjust your search.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((r) => (
                  <li key={r.id}>
                    <div className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-[10px] font-semibold text-muted-foreground"
                          aria-hidden
                        >
                          {initials(r.full_name)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {statusBadge(r.transporter_approval_status)}
                            {r.kyc_verified ? (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                                KYC
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-sm font-medium text-foreground">{r.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                          {r.phone ? (
                            <p className="truncate text-[11px] text-muted-foreground tabular-nums">{r.phone}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Truck className="size-3 shrink-0 opacity-50" aria-hidden />
                              {r.id}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3 shrink-0 opacity-50" aria-hidden />
                              {formatJoined(r.created_at)}
                            </span>
                          </div>
                          {r.transporter_approval_status === 'rejected' && r.transporter_rejection_reason ? (
                            <p className="mt-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-xs leading-relaxed text-foreground">
                              <span className="font-medium text-muted-foreground">Reason: </span>
                              {r.transporter_rejection_reason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setActionError(null);
                            setEditTarget(r);
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(r);
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </Button>
                        {r.transporter_approval_status === 'pending' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() => setApproveId(r.id)}
                            >
                              <CheckCircle2 className="size-3.5" aria-hidden />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
                              onClick={() => {
                                setRejectReason('');
                                setRejectTarget(r);
                              }}
                            >
                              <XCircle className="size-3.5" aria-hidden />
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {r.transporter_approval_status === 'approved' && r.transporter_approved_at ? (
                          <p className="w-full text-[11px] text-muted-foreground lg:w-auto lg:text-right">
                            Approved <span className="tabular-nums text-foreground">{formatJoined(r.transporter_approved_at)}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={approveId !== null} onOpenChange={(o) => !o && setApproveId(null)}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Approve operator access</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This account will immediately receive full access to routes, vehicles, schedules, and bookings. Confirm
              that internal verification is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={approveBusy} className="h-9 text-sm">
              Cancel
            </AlertDialogCancel>
            <Button type="button" className="h-9 text-sm font-medium" disabled={approveBusy} onClick={() => void handleApprove()}>
              {approveBusy ? 'Approving…' : 'Confirm approval'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldAlert className="size-4 text-destructive" aria-hidden />
              Reject application
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {rejectTarget ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.full_name}</span> will not be able to use
                  the operator dashboard. The reason you provide is shown on their account.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-xs font-medium">
              Reason (visible to applicant)
            </Label>
            <Textarea
              id="reject-reason"
              rows={4}
              className="min-h-[88px] resize-y text-sm"
              placeholder="Brief, professional explanation…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Minimum 3 characters.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
              disabled={rejectBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9"
              disabled={rejectBusy || rejectReason.trim().length < 3}
              onClick={() => void handleRejectSubmit()}
            >
              {rejectBusy ? 'Submitting…' : 'Reject application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      >
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit operator</DialogTitle>
            <DialogDescription className="text-sm">
              Update profile details. Changing email requires the service role key on the server.
            </DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs">
                  Full name
                </Label>
                <Input
                  id="edit-name"
                  className="h-9 text-sm"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  className="h-9 text-sm"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  className="h-9 text-sm"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="edit-kyc" checked={editKyc} onCheckedChange={(v) => setEditKyc(v === true)} />
                <Label htmlFor="edit-kyc" className="text-xs font-normal leading-none">
                  KYC verified
                </Label>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setEditTarget(null)} disabled={editBusy}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-9" disabled={editBusy} onClick={() => void handleEditSubmit()}>
              {editBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add operator</DialogTitle>
            <DialogDescription className="text-sm">
              Creates a Supabase auth user and a transporter profile (pending approval). Requires{' '}
              <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-xs">
                Full name
              </Label>
              <Input
                id="create-name"
                className="h-9 text-sm"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email" className="text-xs">
                Email
              </Label>
              <Input
                id="create-email"
                type="email"
                className="h-9 text-sm"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password" className="text-xs">
                Initial password
              </Label>
              <Input
                id="create-password"
                type="password"
                autoComplete="new-password"
                className="h-9 text-sm"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">At least 8 characters. User should change after first sign-in.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-phone" className="text-xs">
                Phone (optional)
              </Label>
              <Input
                id="create-phone"
                className="h-9 text-sm"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={
                createBusy ||
                createFullName.trim().length < 1 ||
                createEmail.trim().length < 3 ||
                createPassword.length < 8
              }
              onClick={() => void handleCreateSubmit()}
            >
              {createBusy ? 'Creating…' : 'Create operator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete operator account</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {deleteTarget ? (
                <>
                  This permanently removes <span className="font-medium text-foreground">{deleteTarget.full_name}</span> (
                  {deleteTarget.email}) from authentication and the database. Requires{' '}
                  <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-9 text-sm" disabled={deleteBusy}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="h-9 text-sm"
              disabled={deleteBusy}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
