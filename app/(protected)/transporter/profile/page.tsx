'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Building2, Loader2, Lock, Mail, Phone, Shield, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { APP_CURRENCY_CODE } from '@/lib/currency';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const PREFS_STORAGE_KEY = 'awetravel-transporter-prefs-v1';

const TAB_VALUES = ['profile', 'preferences', 'security'] as const;
type TabValue = (typeof TAB_VALUES)[number];

type TransporterPrefs = {
  timeZone: string;
  locale: string;
  emailDigest: 'off' | 'daily' | 'weekly';
  notifyNewBooking: boolean;
  notifyCancellations: boolean;
  notifyPayments: boolean;
  compactDataDensity: boolean;
  showEarningsHints: boolean;
};

const defaultPrefs = (): TransporterPrefs => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Kampala',
  locale: typeof navigator !== 'undefined' ? navigator.language : 'en-UG',
  emailDigest: 'daily',
  notifyNewBooking: true,
  notifyCancellations: true,
  notifyPayments: true,
  compactDataDensity: false,
  showEarningsHints: true,
});

function loadPrefs(): TransporterPrefs {
  if (typeof window === 'undefined') return defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<TransporterPrefs>;
    return { ...defaultPrefs(), ...parsed };
  } catch {
    return defaultPrefs();
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function parseTab(value: string | null): TabValue {
  if (value === 'preferences' || value === 'security') return value;
  return 'profile';
}

function TransporterProfilePageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, isLoading, signOut } = useAuth();

  const activeTab = useMemo(() => parseTab(searchParams.get('tab')), [searchParams]);

  const setTab = useCallback(
    (tab: TabValue) => {
      const qs = tab === 'profile' ? '' : `?tab=${tab}`;
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [pathname, router],
  );

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    profile_image: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [prefs, setPrefs] = useState<TransporterPrefs>(defaultPrefs);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [emailForm, setEmailForm] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [passwordForm, setPasswordForm] = useState({ next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        profile_image: profile.profile_image ?? '',
      });
    } else if (user) {
      const meta = user.user_metadata as { full_name?: string } | undefined;
      setProfileForm({
        full_name: typeof meta?.full_name === 'string' ? meta.full_name : '',
        phone: '',
        profile_image: '',
      });
    }
  }, [profile, user]);

  useEffect(() => {
    setPrefs(loadPrefs());
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
          profile_image: profileForm.profile_image.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      const { data: refreshed, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (fetchErr) throw fetchErr;
      setProfileForm({
        full_name: (refreshed as UserProfile).full_name ?? '',
        phone: (refreshed as UserProfile).phone ?? '',
        profile_image: (refreshed as UserProfile).profile_image ?? '',
      });
      setProfileMessage({ type: 'ok', text: 'Profile updated. Refresh other tabs if your name still looks cached.' });
    } catch (err) {
      setProfileMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not save profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePrefs = () => {
    setPrefsMessage(null);
    setPrefsSaving(true);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      setPrefsDirty(false);
      setPrefsMessage({ type: 'ok', text: 'Preferences saved on this device.' });
    } catch {
      setPrefsMessage({ type: 'err', text: 'Could not write to browser storage.' });
    } finally {
      setPrefsSaving(false);
    }
  };

  const patchPrefs = (partial: Partial<TransporterPrefs>) => {
    setPrefs((p) => ({ ...p, ...partial }));
    setPrefsDirty(true);
    setPrefsMessage(null);
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEmailMessage(null);
    const next = emailForm.trim().toLowerCase();
    if (!next || next === user.email?.toLowerCase()) {
      setEmailMessage({ type: 'err', text: 'Enter a new email address.' });
      return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      setEmailMessage({
        type: 'ok',
        text: 'Check your inbox (new and old address) to confirm this change.',
      });
      setEmailForm('');
    } catch (err) {
      setEmailMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not start email change.',
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (passwordForm.next.length < 8) {
      setPasswordMessage({ type: 'err', text: 'Use at least 8 characters.' });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMessage({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
      if (error) throw error;
      setPasswordForm({ next: '', confirm: '' });
      setPasswordMessage({ type: 'ok', text: 'Password updated. Stay signed in on this device.' });
    } catch (err) {
      setPasswordMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not update password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:pb-12">
      <div className="relative overflow-hidden bg-linear-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-8 md:px-8">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              Account
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Profile &amp; settings</h1>
            <p className="max-w-2xl text-sm text-primary-foreground/80 sm:text-base">
              Identity and contact details sync to your AweTravel account. Preferences stay on this browser until fleet
              settings are centralized in your workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <Tabs value={activeTab} onValueChange={(v) => setTab(parseTab(v))} className="gap-6">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:w-auto sm:grid-cols-none sm:inline-flex">
            <TabsTrigger value="profile" className="gap-1.5 px-3 py-2">
              <UserRound className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5 px-3 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 px-3 py-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0 space-y-6 outline-none">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Public profile</CardTitle>
                <CardDescription>
                  Shown on receipts and internal crew views. Email is managed under Security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar className="size-20 border-2 border-border shadow-sm">
                    {profileForm.profile_image ? (
                      <AvatarImage src={profileForm.profile_image} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                      {initials(profileForm.full_name || profile?.full_name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-foreground">
                      {profileForm.full_name || profile?.full_name || 'Your name'}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="secondary" className="capitalize">
                        {profile?.user_type ?? 'transporter'}
                      </Badge>
                      {profile?.kyc_verified ? (
                        <Badge className="border-0 bg-success/15 text-success">KYC verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning">
                          KYC pending
                        </Badge>
                      )}
                      {memberSince && (
                        <span className="text-xs text-muted-foreground">Member since {memberSince}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileMessage && (
                    <Alert variant={profileMessage.type === 'err' ? 'destructive' : 'default'}>
                      <AlertTitle>{profileMessage.type === 'ok' ? 'Saved' : 'Error'}</AlertTitle>
                      <AlertDescription>{profileMessage.text}</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                        required
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="phone"
                          className="pl-9"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="+256 …"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile_image">Photo URL</Label>
                      <Input
                        id="profile_image"
                        value={profileForm.profile_image}
                        onChange={(e) => setProfileForm((f) => ({ ...f, profile_image: e.target.value }))}
                        placeholder="https://…"
                        type="url"
                        inputMode="url"
                      />
                      <p className="text-xs text-muted-foreground">Paste a public image URL (e.g. from your storage).</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={profileSaving} className="gap-2 min-w-32">
                      {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Fleet &amp; compliance</CardTitle>
                    <CardDescription>
                      Company registration and verification live in the verification flow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Complete KYC to unlock payouts and show a verified badge to passengers.
                </p>
                <Button variant="secondary" asChild>
                  <Link href="/transporter/verification">Go to verification</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-0 space-y-6 outline-none">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Locale &amp; display</CardTitle>
                <CardDescription>
                  Stored in this browser only ({PREFS_STORAGE_KEY}). Operational defaults for dashboards and emails you
                  receive from AweTravel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!prefsLoaded ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Time zone</Label>
                        <Select value={prefs.timeZone} onValueChange={(v) => patchPrefs({ timeZone: v })}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Time zone" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="w-(--radix-select-trigger-width) max-h-72">
                            {[
                              'Africa/Kampala',
                              'Africa/Lagos',
                              'Africa/Nairobi',
                              'UTC',
                              'Europe/London',
                            ].map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Language &amp; formats</Label>
                        <Select value={prefs.locale} onValueChange={(v) => patchPrefs({ locale: v })}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                            <SelectItem value="en-UG">English (Uganda)</SelectItem>
                            <SelectItem value="en-NG">English (Nigeria)</SelectItem>
                            <SelectItem value="en-GB">English (UK)</SelectItem>
                            <SelectItem value="en-US">English (US)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Fleet money uses <span className="font-medium">{APP_CURRENCY_CODE}</span> platform-wide.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-muted-foreground">Email digest</Label>
                      <Select
                        value={prefs.emailDigest}
                        onValueChange={(v) =>
                          patchPrefs({ emailDigest: v as TransporterPrefs['emailDigest'] })
                        }
                      >
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Digest frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off</SelectItem>
                          <SelectItem value="daily">Daily summary</SelectItem>
                          <SelectItem value="weekly">Weekly summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground">Notifications (planned)</p>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">New bookings</p>
                          <p className="text-xs text-muted-foreground">When a seat is sold on your routes</p>
                        </div>
                        <Switch
                          checked={prefs.notifyNewBooking}
                          onCheckedChange={(c) => patchPrefs({ notifyNewBooking: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Cancellations</p>
                          <p className="text-xs text-muted-foreground">Passenger or operator-initiated</p>
                        </div>
                        <Switch
                          checked={prefs.notifyCancellations}
                          onCheckedChange={(c) => patchPrefs({ notifyCancellations: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Payments &amp; payouts</p>
                          <p className="text-xs text-muted-foreground">Settlements and payout status</p>
                        </div>
                        <Switch
                          checked={prefs.notifyPayments}
                          onCheckedChange={(c) => patchPrefs({ notifyPayments: c })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground">Dashboard</p>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Compact tables</p>
                          <p className="text-xs text-muted-foreground">Tighter rows on vehicles, bookings, schedules</p>
                        </div>
                        <Switch
                          checked={prefs.compactDataDensity}
                          onCheckedChange={(c) => patchPrefs({ compactDataDensity: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Earnings hints</p>
                          <p className="text-xs text-muted-foreground">Inline tips on the earnings page</p>
                        </div>
                        <Switch
                          checked={prefs.showEarningsHints}
                          onCheckedChange={(c) => patchPrefs({ showEarningsHints: c })}
                        />
                      </div>
                    </div>

                    {prefsMessage && (
                      <Alert variant={prefsMessage.type === 'err' ? 'destructive' : 'default'}>
                        <AlertTitle>{prefsMessage.type === 'ok' ? 'Saved' : 'Error'}</AlertTitle>
                        <AlertDescription>{prefsMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {prefsDirty ? 'You have unsaved changes.' : 'All changes saved to this browser.'}
                      </p>
                      <Button
                        type="button"
                        onClick={handleSavePrefs}
                        disabled={prefsSaving || !prefsDirty}
                        className="gap-2 sm:w-auto"
                      >
                        {prefsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save preferences
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-6 outline-none">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Sign-in email</CardTitle>
                <CardDescription>Supabase will send confirmation links when you change this address.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <p className="mt-1 flex items-center gap-2 font-mono text-foreground">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {user.email}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_email">New email</Label>
                    <Input
                      id="new_email"
                      type="email"
                      value={emailForm}
                      onChange={(e) => setEmailForm(e.target.value)}
                      autoComplete="email"
                      placeholder="you@company.com"
                    />
                  </div>
                  {emailMessage && (
                    <Alert variant={emailMessage.type === 'err' ? 'destructive' : 'default'}>
                      <AlertTitle>{emailMessage.type === 'ok' ? 'Check email' : 'Error'}</AlertTitle>
                      <AlertDescription>{emailMessage.text}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" variant="secondary" disabled={emailSaving} className="gap-2">
                    {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Request email change
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Password</CardTitle>
                <CardDescription>Use a unique passphrase you do not reuse elsewhere.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="pw1">New password</Label>
                    <Input
                      id="pw1"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw2">Confirm password</Label>
                    <Input
                      id="pw2"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                    />
                  </div>
                  {passwordMessage && (
                    <Alert variant={passwordMessage.type === 'err' ? 'destructive' : 'default'}>
                      <AlertTitle>{passwordMessage.type === 'ok' ? 'Updated' : 'Error'}</AlertTitle>
                      <AlertDescription>{passwordMessage.text}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" disabled={passwordSaving} className="gap-2">
                    {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Update password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle className="text-lg text-destructive">Session</CardTitle>
                    <CardDescription>Sign out on this device when you are done on a shared computer.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    await signOut();
                    router.push('/');
                  }}
                >
                  Sign out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function TransporterProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      }
    >
      <TransporterProfilePageInner />
    </Suspense>
  );
}
