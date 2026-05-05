'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { isTransporterApproved, isTransporterRejected } from '@/lib/transporter-approval';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Headphones,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const SUPPORT_MAIL = 'support@awetravel.com';

export default function TransporterPendingApprovalPage() {
  const { user, profile, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);

  const effective = localProfile ?? profile;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile && profile.user_type !== 'transporter') {
      router.replace('/');
    } else if (profile && isTransporterApproved(profile)) {
      router.replace('/transporter');
    }
  }, [isLoading, user, profile, router]);

  useEffect(() => {
    router.prefetch('/transporter');
  }, [router]);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!error && data) {
        setLocalProfile(data as UserProfile);
        if (data.user_type === 'transporter' && data.transporter_approval_status === 'approved') {
          router.replace('/transporter');
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [user, router]);

  if (isLoading || !effective || effective.user_type !== 'transporter') {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
        <Skeleton className="mx-auto h-32 w-full max-w-xl rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-11 w-36 rounded-lg" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>
      </div>
    );
  }

  const rejected = isTransporterRejected(effective);
  const displayName = effective.full_name?.trim() || 'there';

  const pendingSteps: { title: string; body: string; state: 'done' | 'current' | 'upcoming' }[] = [
    {
      title: 'Application received',
      body: 'Your operator profile is on file and ready for review.',
      state: 'done',
    },
    {
      title: 'Admin review',
      body: 'Our team verifies business details to keep the marketplace trusted.',
      state: 'current',
    },
    {
      title: 'Dashboard access',
      body: 'Once approved, you can add routes, vehicles, and schedules.',
      state: 'upcoming',
    },
  ];

  return (
    <div className="min-h-0 pb-16">
      <div
        className={cn(
          'relative border-b border-border/60 bg-linear-to-b to-background',
          rejected
            ? 'from-destructive/8 via-background dark:from-destructive/15'
            : 'from-primary/6 via-accent/4 dark:from-primary/10 dark:via-accent/5',
        )}
      >
        {!rejected ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
            style={{
              backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.62 0.27 45 / 0.12), transparent)`,
            }}
            aria-hidden
          />
        ) : null}
        <div className="relative mx-auto max-w-2xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pb-12 sm:pt-12">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm dark:bg-card/60">
            {rejected ? (
              <>
                <ShieldAlert className="size-3.5 text-destructive" aria-hidden />
                Application update
              </>
            ) : (
              <>
                <Compass className="size-3.5 text-accent" aria-hidden />
                Operator onboarding
              </>
            )}
          </p>
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-background shadow-md ring-1 ring-border/60 dark:bg-card">
            {rejected ? (
              <ShieldAlert className="size-8 text-destructive" aria-hidden />
            ) : (
              <Truck className="size-8 text-primary" aria-hidden />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {rejected ? 'We could not approve this application' : `Thanks, ${displayName.split(/\s+/)[0]}`}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {rejected
              ? 'Your transporter signup was reviewed. Below is the outcome and how to reach us if you have questions.'
              : 'Your operator account is registered. We will unlock the transporter console as soon as an administrator approves you.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'font-medium',
                rejected
                  ? 'border border-destructive/25 bg-destructive/10 text-destructive dark:bg-destructive/20'
                  : 'border border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-50',
              )}
            >
              {rejected ? 'Not approved' : 'Pending review'}
            </Badge>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              <Building2 className="mr-1 size-3.5 opacity-70" aria-hidden />
              Transporter
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6">
        <Card className="-mt-8 relative z-10 overflow-hidden border-border/70 shadow-lg shadow-primary/5 dark:shadow-none">
          <CardHeader className="space-y-1 border-b border-border/60 bg-muted/15 pb-5 dark:bg-muted/10">
            <CardTitle className="text-lg font-semibold">
              {rejected ? 'What this means' : 'While you wait'}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {rejected
                ? 'You can contact support for clarification or sign out and return with a different account if needed.'
                : 'Reviews are usually quick. You can refresh your status here after you hear from us—no need to sign up again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {rejected && effective.transporter_rejection_reason ? (
              <Alert variant="destructive" className="border-destructive/40">
                <AlertTitle className="font-semibold">Reason from the reviewer</AlertTitle>
                <AlertDescription className="mt-2 text-destructive/95">
                  {effective.transporter_rejection_reason}
                </AlertDescription>
              </Alert>
            ) : null}

            {!rejected ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 dark:bg-muted/10">
                <p className="mb-4 text-sm font-medium text-foreground">Where you are in the process</p>
                <ul className="space-y-4">
                  {pendingSteps.map((step, i) => (
                    <li key={step.title} className="flex gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                          step.state === 'done' && 'bg-primary text-primary-foreground shadow-sm',
                          step.state === 'current' &&
                            'bg-accent/20 text-accent-foreground ring-2 ring-accent/40 dark:bg-accent/15',
                          step.state === 'upcoming' && 'bg-muted text-muted-foreground ring-1 ring-border/80',
                        )}
                      >
                        {step.state === 'done' ? (
                          <CheckCircle2 className="size-4" aria-hidden />
                        ) : step.state === 'current' ? (
                          <Clock className="size-4" aria-hidden />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Alert className="border-border/80 bg-muted/20">
                <Clock className="size-4 text-muted-foreground" aria-hidden />
                <AlertTitle>Reapplying</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  If policy allows, you may be able to register again with updated details. Email support with your
                  company name and any documents they request.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button
                type="button"
                className="gap-2 shadow-sm sm:min-w-38"
                disabled={refreshing}
                onClick={() => void reloadProfile()}
              >
                <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
                Check status
              </Button>
              <Button type="button" variant="outline" className="gap-2 sm:min-w-38" asChild>
                <a href={`mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent('Transporter approval — AweTravel')}`}>
                  <Mail className="size-4" aria-hidden />
                  Email support
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground sm:min-w-38"
                onClick={() => {
                  void signOut().then(() => router.replace('/'));
                }}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </div>

            <p className="flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
              <Headphones className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span>
                Questions? Reach us at{' '}
                <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${SUPPORT_MAIL}`}>
                  {SUPPORT_MAIL}
                </a>
                .
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
