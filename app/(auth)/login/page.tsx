'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bus, CircleAlert, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suspendedNotice = searchParams.get('reason') === 'suspended';
  const { signInWithAutoRegister } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profileAfter = await signInWithAutoRegister(email, password);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const path = getHomePathForProfile(profileAfter);
        router.prefetch(path);
        await router.push(path);
        router.refresh();
      } else {
        router.prefetch('/');
        await router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'h-11 text-base shadow-sm md:text-sm';

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
        <CardHeader className="space-y-4 px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/25">
            <Bus className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {suspendedNotice ? (
              <Alert variant="destructive" className="border-destructive/40 text-left">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                <AlertTitle className="mb-0.5">Account suspended</AlertTitle>
                <AlertDescription className="text-destructive/90">
                  Your traveler account is paused. Contact support if you need help restoring access.
                </AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive" className="border-destructive/40 text-left">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                <AlertTitle className="mb-0.5">Sign-in failed</AlertTitle>
                <AlertDescription className="text-destructive/90">{error}</AlertDescription>
              </Alert>
            ) : null}

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
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:text-primary/90 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
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

            <Button type="submit" size="lg" className="mt-1 h-11 w-full font-semibold shadow-sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <Separator className="bg-border/60" />

          <p className="text-center text-sm text-muted-foreground">
            New to AweTravel?{' '}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        New users are registered as passengers. Transporters and operators should use Get Started to choose the right
        account type. By continuing you agree to our terms of service.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[420px] animate-pulse rounded-xl border border-border/60 bg-muted/30 p-24" />}>
      <LoginForm />
    </Suspense>
  );
}
