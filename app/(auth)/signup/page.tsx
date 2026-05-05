'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bus,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Truck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { fetchUserProfileWithRetry } from '@/lib/fetch-user-profile';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { SignupUserType } from '@/lib/types';
import { cn } from '@/lib/utils';

const fieldClass = 'h-11 text-base shadow-sm md:text-sm';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [userType, setUserType] = useState<SignupUserType>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: SignupUserType) => {
    setUserType(role);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName, userType);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { profile: profileData } = await fetchUserProfileWithRetry(supabase, user.id);
        const path = getHomePathForProfile(profileData);
        router.prefetch(path);
        await router.push(path);
        router.refresh();
      } else {
        router.prefetch('/login');
        await router.push('/login');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[420px]">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-accent/12 blur-3xl"
        aria-hidden
      />

      <Card className="relative border-border/80 bg-card/95 py-0 shadow-lg shadow-black/5 ring-1 ring-black/3 backdrop-blur-sm dark:ring-white/10">
        {step === 'role' ? (
          <>
            <CardHeader className="space-y-4 px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25">
                <Bus className="h-6 w-6" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">Join AweTravel</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Choose how you will use the platform
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-8 sm:px-8">
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('passenger')}
                  className={cn(
                    'group flex w-full gap-4 rounded-xl border border-border/80 bg-background/50 p-4 text-left shadow-sm transition-all',
                    'hover:border-primary/35 hover:bg-primary/4 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <UserRound className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 space-y-0.5 pt-0.5">
                    <span className="block font-semibold text-foreground">Passenger</span>
                    <span className="block text-sm leading-snug text-muted-foreground">
                      Book tickets and travel with ease
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('transporter')}
                  className={cn(
                    'group flex w-full gap-4 rounded-xl border border-border/80 bg-background/50 p-4 text-left shadow-sm transition-all',
                    'hover:border-primary/35 hover:bg-primary/4 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground transition-colors group-hover:bg-accent/25">
                    <Truck className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 space-y-0.5 pt-0.5">
                    <span className="block font-semibold text-foreground">Transporter</span>
                    <span className="block text-sm leading-snug text-muted-foreground">
                      Manage your fleet and routes
                    </span>
                  </span>
                </button>
              </div>

              <Separator className="bg-border/60" />

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="relative space-y-4 px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute left-4 top-8 text-muted-foreground hover:text-foreground sm:left-6"
                onClick={() => {
                  setStep('role');
                  setError('');
                }}
                aria-label="Back to account type"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </Button>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25">
                <Bus className="h-6 w-6" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {userType === 'passenger' ? 'Passenger' : 'Transporter'}
                </p>
                <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                  Create your account
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {userType === 'passenger' && 'Start booking trips in a few steps'}
                  {userType === 'transporter' && 'Register your transport business'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-8 sm:px-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error ? (
                  <Alert variant="destructive" className="border-destructive/40 text-left">
                    <CircleAlert className="size-4 shrink-0" aria-hidden />
                    <AlertTitle className="mb-0.5">Could not create account</AlertTitle>
                    <AlertDescription className="text-destructive/90">{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="name"
                    autoComplete="name"
                    placeholder="Jane Doe"
                    className={cn(fieldClass, 'bg-background')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@company.com"
                    className={cn(fieldClass, 'bg-background')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className={cn(fieldClass, 'bg-background pr-10')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Eye className="size-4 shrink-0" aria-hidden />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className={cn(fieldClass, 'bg-background pr-10')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Eye className="size-4 shrink-0" aria-hidden />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="mt-1 h-11 w-full font-semibold shadow-sm" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <Separator className="bg-border/60" />

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        By continuing you agree to our terms of service. We use your details only to run your account and improve the
        service.
      </p>
    </div>
  );
}
