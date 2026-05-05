'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Building2, Globe, Loader2, Lock, Mail, MapPin, Phone, Shield, UserRound } from 'lucide-react';
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

  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    trading_name: '',
    support_email: '',
    support_phone: '',
    ops_email: '',
    ops_phone: '',
    website: '',
    logo_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    region: '',
    country: 'Uganda',
    registration_number: '',
    tax_id: '',
    about: '',
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
    if (!user) return;
    let cancelled = false;
    setCompanyLoading(true);
    setCompanyMessage(null);
    void (async () => {
      const { data, error } = await supabase
        .from('transporter_company_profiles')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setCompanyMessage({ type: 'err', text: error.message });
        setCompanyLoading(false);
        return;
      }

      if (data) {
        setCompanyForm({
          company_name: data.company_name ?? '',
          trading_name: data.trading_name ?? '',
          support_email: data.support_email ?? '',
          support_phone: data.support_phone ?? '',
          ops_email: data.ops_email ?? '',
          ops_phone: data.ops_phone ?? '',
          website: data.website ?? '',
          logo_url: data.logo_url ?? '',
          address_line1: data.address_line1 ?? '',
          address_line2: data.address_line2 ?? '',
          city: data.city ?? '',
          region: data.region ?? '',
          country: data.country ?? 'Uganda',
          registration_number: data.registration_number ?? '',
          tax_id: data.tax_id ?? '',
          about: data.about ?? '',
        });
      }
      setCompanyLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCompanyMessage(null);
    setCompanySaving(true);
    try {
      const payload = {
        owner_user_id: user.id,
        company_name: companyForm.company_name.trim(),
        trading_name: companyForm.trading_name.trim() || null,
        support_email: companyForm.support_email.trim().toLowerCase() || null,
        support_phone: companyForm.support_phone.trim() || null,
        ops_email: companyForm.ops_email.trim().toLowerCase() || null,
        ops_phone: companyForm.ops_phone.trim() || null,
        website: companyForm.website.trim() || null,
        logo_url: companyForm.logo_url.trim() || null,
        address_line1: companyForm.address_line1.trim() || null,
        address_line2: companyForm.address_line2.trim() || null,
        city: companyForm.city.trim() || null,
        region: companyForm.region.trim() || null,
        country: companyForm.country.trim() || 'Uganda',
        registration_number: companyForm.registration_number.trim() || null,
        tax_id: companyForm.tax_id.trim() || null,
        about: companyForm.about.trim() || null,
      };

      if (!payload.company_name) {
        setCompanyMessage({ type: 'err', text: 'Company name is required.' });
        return;
      }

      const { error } = await supabase.from('transporter_company_profiles').upsert(payload, {
        onConflict: 'owner_user_id',
      });
      if (error) throw error;
      setCompanyMessage({ type: 'ok', text: 'Company profile saved.' });
    } catch (err) {
      setCompanyMessage({ type: 'err', text: err instanceof Error ? err.message : 'Could not save company profile.' });
    } finally {
      setCompanySaving(false);
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
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Transport operations
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem] sm:leading-tight">
                Profile &amp; settings
              </h1>
              <p className="max-w-2xl pt-1 text-sm leading-relaxed text-muted-foreground">
                Keep your company info accurate for passengers and staff, and manage sign-in details securely.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 border-border/80 bg-background shadow-sm" asChild>
                <Link href="/transporter/verification">Verification</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={(v) => setTab(parseTab(v))} className="gap-6">
          <TabsList className="h-9 rounded-lg border border-border/70 bg-background p-1 shadow-sm">
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
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Account owner</CardTitle>
                    <CardDescription>Personal details for the person managing this transport company.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Avatar className="size-20 border-2 border-border shadow-sm">
                        {profileForm.profile_image ? <AvatarImage src={profileForm.profile_image} alt="" /> : null}
                        <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                          {initials(profileForm.full_name || profile?.full_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-foreground">{profileForm.full_name || profile?.full_name || 'Your name'}</p>
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
                          {memberSince && <span className="text-xs text-muted-foreground">Member since {memberSince}</span>}
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
                          Save owner profile
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
                        <CardTitle className="text-lg">Transport company profile</CardTitle>
                        <CardDescription>What passengers and internal teams use to identify your company.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {companyMessage && (
                      <Alert variant={companyMessage.type === 'err' ? 'destructive' : 'default'}>
                        <AlertTitle>{companyMessage.type === 'ok' ? 'Saved' : 'Error'}</AlertTitle>
                        <AlertDescription>{companyMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    {companyLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Loading company profile…
                      </div>
                    ) : (
                      <form onSubmit={handleSaveCompany} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="company_name">Company name</Label>
                            <Input
                              id="company_name"
                              value={companyForm.company_name}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))}
                              placeholder="e.g. Awe Express Coaches"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="trading_name">Trading name (optional)</Label>
                            <Input
                              id="trading_name"
                              value={companyForm.trading_name}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, trading_name: e.target.value }))}
                              placeholder="e.g. Awe Express"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="website">Website (optional)</Label>
                            <div className="relative">
                              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="website"
                                className="pl-9"
                                value={companyForm.website}
                                onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                                placeholder="https://…"
                                type="url"
                                inputMode="url"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="logo_url">Company logo URL (optional)</Label>
                            <Input
                              id="logo_url"
                              value={companyForm.logo_url}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, logo_url: e.target.value }))}
                              placeholder="https://…"
                              type="url"
                              inputMode="url"
                            />
                            <p className="text-xs text-muted-foreground">Used in passenger views and receipts when available.</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="support_email">Support email</Label>
                            <Input
                              id="support_email"
                              value={companyForm.support_email}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, support_email: e.target.value }))}
                              placeholder="support@company.com"
                              type="email"
                              inputMode="email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="support_phone">Support phone</Label>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="support_phone"
                                className="pl-9"
                                value={companyForm.support_phone}
                                onChange={(e) => setCompanyForm((f) => ({ ...f, support_phone: e.target.value }))}
                                placeholder="+256 …"
                                autoComplete="tel"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ops_email">Operations email (optional)</Label>
                            <Input
                              id="ops_email"
                              value={companyForm.ops_email}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, ops_email: e.target.value }))}
                              placeholder="ops@company.com"
                              type="email"
                              inputMode="email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ops_phone">Operations phone (optional)</Label>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="ops_phone"
                                className="pl-9"
                                value={companyForm.ops_phone}
                                onChange={(e) => setCompanyForm((f) => ({ ...f, ops_phone: e.target.value }))}
                                placeholder="+256 …"
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="address_line1">Address</Label>
                            <div className="relative">
                              <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="address_line1"
                                className="pl-9"
                                value={companyForm.address_line1}
                                onChange={(e) => setCompanyForm((f) => ({ ...f, address_line1: e.target.value }))}
                                placeholder="Street / building"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="address_line2">Address line 2 (optional)</Label>
                            <Input
                              id="address_line2"
                              value={companyForm.address_line2}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, address_line2: e.target.value }))}
                              placeholder="Area / landmark"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" value={companyForm.city} onChange={(e) => setCompanyForm((f) => ({ ...f, city: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="region">Region / District</Label>
                            <Input
                              id="region"
                              value={companyForm.region}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, region: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                              id="country"
                              value={companyForm.country}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, country: e.target.value }))}
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="registration_number">Registration number (optional)</Label>
                            <Input
                              id="registration_number"
                              value={companyForm.registration_number}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, registration_number: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tax_id">Tax ID (optional)</Label>
                            <Input id="tax_id" value={companyForm.tax_id} onChange={(e) => setCompanyForm((f) => ({ ...f, tax_id: e.target.value }))} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="about">About (optional)</Label>
                            <Input
                              id="about"
                              value={companyForm.about}
                              onChange={(e) => setCompanyForm((f) => ({ ...f, about: e.target.value }))}
                              placeholder="Short description used in partner views"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" disabled={companySaving} className="gap-2 min-w-40">
                            {companySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save company profile
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Fleet &amp; compliance</CardTitle>
                    <CardDescription>Verification unlocks payouts and a trusted badge for passengers.</CardDescription>
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
              </div>

              <div className="space-y-6 lg:col-span-4">
                <Card className="border-border/80 shadow-sm lg:sticky lg:top-24">
                  <CardHeader>
                    <CardTitle className="text-base">Company preview</CardTitle>
                    <CardDescription className="text-xs">A quick sanity-check for what you’re about to publish.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 border border-border">
                        {companyForm.logo_url ? <AvatarImage src={companyForm.logo_url} alt="" /> : null}
                        <AvatarFallback className="bg-muted text-sm font-semibold">
                          {initials(companyForm.company_name || 'Company')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{companyForm.company_name || 'Company name'}</div>
                        <div className="truncate text-xs text-muted-foreground">{companyForm.trading_name || '—'}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="truncate">{companyForm.support_phone || companyForm.ops_phone || 'No phone set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{companyForm.support_email || companyForm.ops_email || 'No email set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="truncate">{companyForm.website || 'No website'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">
                          {[
                            companyForm.address_line1,
                            companyForm.address_line2,
                            companyForm.city,
                            companyForm.region,
                            companyForm.country,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'No address set'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

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
