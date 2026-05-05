'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPORT_TIMEZONES, type ReportTimezone } from '@/lib/admin/reports/client';
import { getAdminPlatformSettings, patchAdminPlatformSettings } from '@/lib/platform-settings/admin-client';

function bpsToPercentDisplay(bps: number): string {
  return (bps / 100).toFixed(2).replace(/\.?0+$/, '') || '0';
}

function parsePercentToBps(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

export default function AdminSettingsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [siteName, setSiteName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState('5');
  const [defaultReportTimezone, setDefaultReportTimezone] = useState<ReportTimezone>('Africa/Kampala');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const hydrate = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const s = await getAdminPlatformSettings();
      setSiteName(s.siteName);
      setSupportEmail(s.supportEmail ?? '');
      setSupportPhone(s.supportPhone ?? '');
      setTermsUrl(s.termsUrl ?? '');
      setPrivacyUrl(s.privacyUrl ?? '');
      setPlatformFeePercent(bpsToPercentDisplay(s.platformFeeBps));
      setDefaultReportTimezone(
        (REPORT_TIMEZONES as readonly string[]).includes(s.defaultReportTimezone)
          ? (s.defaultReportTimezone as ReportTimezone)
          : 'Africa/Kampala',
      );
      setMaintenanceMode(s.maintenanceMode);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const save = async () => {
    setSaveError(null);
    const bps = parsePercentToBps(platformFeePercent.trim());
    if (bps === null) {
      setSaveError('Platform fee must be a percentage between 0 and 100.');
      return;
    }
    setIsSaving(true);
    try {
      await patchAdminPlatformSettings({
        siteName: siteName.trim(),
        supportEmail: supportEmail.trim() || null,
        supportPhone: supportPhone.trim() || null,
        termsUrl: termsUrl.trim() || null,
        privacyUrl: privacyUrl.trim() || null,
        platformFeeBps: bps,
        defaultReportTimezone,
        maintenanceMode,
      });
      await hydrate();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-0 pb-16">
      <div className="border-b border-border/80 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Settings</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl border border-border/80 bg-muted/40">
                <Settings className="size-6 text-foreground" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Platform settings
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Branding, fees, and operational defaults. Changes apply after save.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isLoading}
                onClick={() => void hydrate()}
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Button type="button" size="sm" className="min-w-32 font-medium" disabled={isSaving || isLoading} onClick={() => void save()}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loadError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not load settings</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}
        {saveError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="commerce">Commerce</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 space-y-6 outline-none">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Branding &amp; contact</CardTitle>
                  <CardDescription>Shown to passengers and in transactional emails when wired.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="site-name">Site name</Label>
                    <Input
                      id="site-name"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      maxLength={120}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Support email</Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="support@example.com"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-phone">Support phone</Label>
                    <Input
                      id="support-phone"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+256 …"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="terms-url">Terms of service URL</Label>
                    <Input
                      id="terms-url"
                      type="url"
                      value={termsUrl}
                      onChange={(e) => setTermsUrl(e.target.value)}
                      placeholder="https://…"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="privacy-url">Privacy policy URL</Label>
                    <Input
                      id="privacy-url"
                      type="url"
                      value={privacyUrl}
                      onChange={(e) => setPrivacyUrl(e.target.value)}
                      placeholder="https://…"
                      disabled={isSaving}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commerce" className="mt-0 outline-none">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Platform fee</CardTitle>
                  <CardDescription>
                    Added to ticket price on the passenger booking flow. Stored as basis points (100 bps = 1%).
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-w-md space-y-2">
                  <Label htmlFor="fee-pct">Fee (% of ticket)</Label>
                  <Input
                    id="fee-pct"
                    inputMode="decimal"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">Valid range: 0–100%. Use up to two decimal places.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations" className="mt-0 outline-none">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Reporting &amp; maintenance</CardTitle>
                  <CardDescription>
                    Default timezone for admin reports. Maintenance mode is stored for future site-wide gating.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="max-w-md space-y-2">
                    <Label>Default report timezone</Label>
                    <Select
                      value={defaultReportTimezone}
                      onValueChange={(v) => setDefaultReportTimezone(v as ReportTimezone)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72">
                        {REPORT_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 sm:max-w-lg">
                    <div>
                      <Label htmlFor="maint-switch" className="text-base font-medium">
                        Maintenance mode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When on, you can use this flag in upcoming read-only or banner experiences.
                      </p>
                    </div>
                    <Switch
                      id="maint-switch"
                      checked={maintenanceMode}
                      onCheckedChange={setMaintenanceMode}
                      disabled={isSaving}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
