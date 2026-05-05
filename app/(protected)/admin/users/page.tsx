'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Ban,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  createAdminPassenger,
  deleteAdminPassenger,
  listAdminPassengers,
  updateAdminPassenger,
  type AdminPassengerRow,
} from '@/lib/admin/passengers/client';
import { cn } from '@/lib/utils';

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

export default function AdminPassengersPage() {
  const [rows, setRows] = useState<AdminPassengerRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<AdminPassengerRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editKyc, setEditKyc] = useState(false);
  const [editSuspended, setEditSuspended] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminPassengerRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!editTarget) return;
    setEditFullName(editTarget.full_name);
    setEditEmail(editTarget.email);
    setEditPhone(editTarget.phone ?? '');
    setEditProfileImage(editTarget.profile_image ?? '');
    setEditKyc(editTarget.kyc_verified);
    setEditSuspended(editTarget.account_suspended);
  }, [editTarget]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await listAdminPassengers();
      setRows(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load passengers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'active') list = list.filter((r) => !r.account_suspended);
    if (statusFilter === 'suspended') list = list.filter((r) => r.account_suspended);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const suspended = rows.filter((r) => r.account_suspended).length;
    return {
      total: rows.length,
      active: rows.length - suspended,
      suspended,
    };
  }, [rows]);

  const openEdit = (r: AdminPassengerRow) => {
    setActionError(null);
    setEditTarget(r);
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setActionError(null);
    setEditBusy(true);
    try {
      const patch: Parameters<typeof updateAdminPassenger>[1] = {};
      if (editFullName.trim() !== editTarget.full_name) patch.full_name = editFullName.trim();
      if (editEmail.trim().toLowerCase() !== editTarget.email.toLowerCase()) patch.email = editEmail.trim();
      const phoneVal = editPhone.trim();
      if ((editTarget.phone ?? '') !== phoneVal) patch.phone = phoneVal === '' ? null : phoneVal;
      const imgVal = editProfileImage.trim();
      if ((editTarget.profile_image ?? '') !== imgVal) patch.profile_image = imgVal === '' ? null : imgVal;
      if (editKyc !== editTarget.kyc_verified) patch.kyc_verified = editKyc;
      if (editSuspended !== editTarget.account_suspended) patch.account_suspended = editSuspended;
      if (Object.keys(patch).length === 0) {
        setEditTarget(null);
        return;
      }
      await updateAdminPassenger(editTarget.id, patch);
      setEditTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setEditBusy(false);
    }
  };

  const toggleSuspendedQuick = async (r: AdminPassengerRow, next: boolean) => {
    if (next === r.account_suspended) return;
    setActionError(null);
    try {
      await updateAdminPassenger(r.id, { account_suspended: next });
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update suspension.');
    }
  };

  const handleCreateSubmit = async () => {
    setActionError(null);
    setCreateBusy(true);
    try {
      await createAdminPassenger({
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
      setActionError(e instanceof Error ? e.message : 'Could not create passenger.');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteAdminPassenger(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Passengers</span>
          </nav>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Administration · Travelers
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight">
                Passenger accounts
              </h1>
              <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
                Manage traveler profiles, access, and verification. Suspended passengers cannot use{' '}
                <span className="font-medium text-foreground">/passenger</span> or the rest of the signed-in app until
                restored. Operator accounts are managed on{' '}
                <Link href="/admin/transporters" className="font-medium text-primary underline-offset-4 hover:underline">
                  Transporters
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total passengers</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{stats.total}</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Active access</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {stats.active}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suspended</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{stats.suspended}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-0 border-b border-border bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Directory</CardTitle>
                <CardDescription className="text-xs">Search and filter traveler accounts</CardDescription>
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
                  Add passenger
                </Button>
                <div className="relative w-full sm:min-w-[220px] lg:max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 border-border bg-background pl-8 text-sm shadow-none"
                    disabled={isLoading}
                    aria-label="Search passengers"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  { id: 'all' as const, label: 'All' },
                  { id: 'active' as const, label: 'Active' },
                  { id: 'suspended' as const, label: 'Suspended' },
                ] as const
              ).map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={statusFilter === t.id ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setStatusFilter(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
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
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">No passengers in this view</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">Adjust filters or add a new account.</p>
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
                            {r.account_suspended ? (
                              <Badge
                                variant="outline"
                                className="h-5 border-destructive/30 bg-destructive/5 px-1.5 text-[11px] font-medium text-destructive"
                              >
                                Suspended
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-5 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200"
                              >
                                Active
                              </Badge>
                            )}
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
                            <span className="font-mono tabular-nums">{r.id}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3 shrink-0 opacity-50" aria-hidden />
                              Joined {formatJoined(r.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.account_suspended}
                            onCheckedChange={(on) => void toggleSuspendedQuick(r, on)}
                            aria-label={r.account_suspended ? 'Restore access' : 'Suspend passenger'}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {r.account_suspended ? 'Suspended' : 'Access on'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => openEdit(r)}
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
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      >
        <DialogContent className="border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit passenger</DialogTitle>
            <DialogDescription className="text-sm">
              Update profile fields or suspend access. Email changes require the service role on the server.
            </DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="p-edit-name" className="text-xs">
                  Full name
                </Label>
                <Input
                  id="p-edit-name"
                  className="h-9 text-sm"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-edit-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="p-edit-email"
                  type="email"
                  className="h-9 text-sm"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-edit-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="p-edit-phone"
                  className="h-9 text-sm"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-edit-avatar" className="text-xs">
                  Profile image URL
                </Label>
                <Input
                  id="p-edit-avatar"
                  className="h-9 text-sm"
                  value={editProfileImage}
                  onChange={(e) => setEditProfileImage(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="p-edit-kyc" checked={editKyc} onCheckedChange={(v) => setEditKyc(v === true)} />
                <Label htmlFor="p-edit-kyc" className="text-xs font-normal leading-none">
                  KYC verified
                </Label>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Ban className="mt-0.5 size-4 text-destructive" aria-hidden />
                  <div>
                    <Label htmlFor="p-edit-suspend" className="text-xs font-medium">
                      Suspend account
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Blocks app access for this traveler.</p>
                  </div>
                </div>
                <Switch id="p-edit-suspend" checked={editSuspended} onCheckedChange={setEditSuspended} />
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
            <DialogTitle className="text-base font-semibold">Add passenger</DialogTitle>
            <DialogDescription className="text-sm">
              Creates a Supabase auth user and a passenger profile. Requires{' '}
              <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-create-name" className="text-xs">
                Full name
              </Label>
              <Input
                id="p-create-name"
                className="h-9 text-sm"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-create-email" className="text-xs">
                Email
              </Label>
              <Input
                id="p-create-email"
                type="email"
                className="h-9 text-sm"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-create-password" className="text-xs">
                Initial password
              </Label>
              <Input
                id="p-create-password"
                type="password"
                autoComplete="new-password"
                className="h-9 text-sm"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-create-phone" className="text-xs">
                Phone (optional)
              </Label>
              <Input
                id="p-create-phone"
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
              {createBusy ? 'Creating…' : 'Create passenger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete passenger account</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {deleteTarget ? (
                <>
                  Permanently removes <span className="font-medium text-foreground">{deleteTarget.full_name}</span> (
                  {deleteTarget.email}) from authentication and the database. Requires service role configuration.
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
