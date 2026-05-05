'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const onLogin = pathname === '/login';
  const onSignup = pathname === '/signup';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <span className="text-2xl font-bold text-foreground">AweTravel</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : user ? (
            <Button type="button" onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                asChild
                className={cn(onLogin && 'border-primary/35 bg-muted/40 text-foreground')}
              >
                <Link href="/login" aria-current={onLogin ? 'page' : undefined}>
                  Sign In
                </Link>
              </Button>
              <Button className={cn('bg-accent hover:bg-accent/90', onSignup && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background')} asChild>
                <Link href="/signup" aria-current={onSignup ? 'page' : undefined}>
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
