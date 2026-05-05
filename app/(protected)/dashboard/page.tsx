'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bus, LayoutDashboard, Shield, Truck, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchUserProfileWithRetry } from '@/lib/fetch-user-profile';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { supabase } from '@/lib/supabase';
import { isTransporterApproved, isTransporterPendingApproval } from '@/lib/transporter-approval';
import type { UserProfile } from '@/lib/types';
import { PassengerOverview } from '@/components/dashboard/PassengerOverview';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function roleLabel(t: UserProfile['user_type']) {
  switch (t) {
    case 'admin':
      return 'Administrator';
    case 'transporter':
      return 'Transporter';
    default:
      return 'Passenger';
  }
}

export default function DashboardPage() {
  const { profile, user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [resolvingProfile, setResolvingProfile] = useState(false);

  const displayProfile = profile ?? localProfile;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
      setProfileMissing(false);
      setProfileLoadError(null);
      return;
    }
    if (!user) return;

    let cancelled = false;
    setResolvingProfile(true);
    setProfileMissing(false);
    setProfileLoadError(null);

    void (async () => {
      const { profile: data, errorMessage } = await fetchUserProfileWithRetry(supabase, user.id);
      if (cancelled) return;
      setResolvingProfile(false);
      if (errorMessage) {
        setProfileLoadError(errorMessage);
        setProfileMissing(false);
        return;
      }
      if (data) {
        setLocalProfile(data);
        return;
      }
      setProfileMissing(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  if (!isLoading && user && profileLoadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-md text-muted-foreground">
          We could not load your profile from the database: <span className="text-foreground">{profileLoadError}</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoading && user && profileMissing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-md text-muted-foreground">
          Your account is signed in, but no matching row was found in <code className="text-foreground">public.users</code>.
          That usually means registration did not finish, or the row was deleted. Try refreshing once; if it persists,
          contact support with your email.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !user || (user && !displayProfile && (resolvingProfile || (!profileMissing && !localProfile)))) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!displayProfile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }

  const p = displayProfile;
  const primaryHref = getHomePathForProfile(p);
  const isPassenger = p.user_type === 'passenger';
  const isTransporter = p.user_type === 'transporter';
  const isAdmin = p.user_type === 'admin';

  return (
    <div className="min-h-0 pb-16">
      <div className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="font-normal">
                {roleLabel(p.user_type)}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Welcome back{p.full_name ? `, ${p.full_name.split(' ')[0]}` : ''}
              </h1>
              <p className="max-w-xl text-muted-foreground">
                This is your AweTravel hub. Jump into your workspace, or review shortcuts for the things you do most
                often.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="font-semibold shadow-sm">
                <Link href={primaryHref}>
                  Go to main workspace
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {p.user_type === 'transporter' && isTransporterPendingApproval(p) ? (
          <Alert>
            <Truck className="size-4" aria-hidden />
            <AlertTitle>Transporter approval</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Your operator account is pending review. You will get full console access once approved.</span>
              <Button asChild size="sm" variant="outline">
                <Link href="/transporter/pending-approval">View status</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="workspaces-heading" className="space-y-4">
          <h2 id="workspaces-heading" className="text-lg font-semibold tracking-tight text-foreground">
            Your workspaces
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className={cn(
                'border-border/80 transition hover:shadow-md',
                p.user_type === 'passenger' && 'ring-1 ring-primary/15',
              )}
            >
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bus className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">Passenger</CardTitle>
                <CardDescription>Search routes, book seats, and manage tickets.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {isPassenger ? (
                  <>
                    <Button asChild size="sm" variant="default">
                      <Link href="/passenger/dashboard">Dashboard</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/passenger/search">Search</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/passenger/bookings">Bookings</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Passenger tools are available on passenger accounts.</p>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                'border-border/80 transition hover:shadow-md',
                p.user_type === 'transporter' && isTransporterApproved(p) && 'ring-1 ring-primary/15',
              )}
            >
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                  <Truck className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">Transporter</CardTitle>
                <CardDescription>Routes, vehicles, schedules, and passenger bookings.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {isTransporter ? (
                  <>
                    <Button
                      asChild
                      size="sm"
                      variant={isTransporterApproved(p) ? 'default' : 'outline'}
                    >
                      <Link href={isTransporterApproved(p) ? '/transporter' : '/transporter/pending-approval'}>
                        Console
                      </Link>
                    </Button>
                    {isTransporterApproved(p) ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/transporter/routes">Routes</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Routes
                      </Button>
                    )}
                    {isTransporterApproved(p) ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/transporter/profile">Profile</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Profile
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Transporter console is for transporter accounts.</p>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                'border-border/80 transition hover:shadow-md md:col-span-2 lg:col-span-1',
                p.user_type === 'admin' && 'ring-1 ring-primary/15',
              )}
            >
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Shield className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">Administration</CardTitle>
                <CardDescription>Passengers, companies, and platform configuration.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {isAdmin ? (
                  <>
                    <Button asChild size="sm" variant="default">
                      <Link href="/admin">Admin home</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/admin/users">Passengers</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/admin/companies">Companies</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Admin tools are restricted to platform administrators.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {p.user_type === 'passenger' ? <PassengerOverview /> : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutDashboard className="size-4" aria-hidden />
                Quick links
              </CardTitle>
              <CardDescription>Depending on your role, some links open your live console.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Link className="text-primary hover:underline" href="/">
                Marketing site
              </Link>
              <Link className="text-primary hover:underline" href={primaryHref}>
                Primary workspace
              </Link>
              {isPassenger ? (
                <Link className="text-primary hover:underline" href="/passenger/search">
                  Search routes
                </Link>
              ) : null}
              {isTransporter && isTransporterApproved(p) ? (
                <Link className="text-primary hover:underline" href="/transporter/routes">
                  Manage routes
                </Link>
              ) : null}
              {isAdmin ? (
                <Link className="text-primary hover:underline" href="/admin/users">
                  Passenger directory
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="size-4" aria-hidden />
                Account
              </CardTitle>
              <CardDescription>Signed in as {p.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                KYC: {p.kyc_verified ? 'Verified' : 'Not verified'} · Member since{' '}
                {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
              </p>
              <Separator />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.replace('/login');
                }}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
