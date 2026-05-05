'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogin = pathname === '/login';
  const onSignup = pathname === '/signup';

  const links = useMemo(
    () => [
      { href: '/', label: 'Home' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
    [],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10">
            <span className="text-base font-bold text-white sm:text-lg">A</span>
          </div>
          <span className="truncate text-lg font-bold text-foreground sm:text-2xl">
            AweTravel
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    active
                      ? 'bg-muted/40 text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {l.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop auth actions */}
          <div className="hidden items-center gap-3 md:flex">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
            ) : user ? (
              <Button type="button" asChild>
                <Link href={getHomePathForProfile(profile, user)}>Dashboard</Link>
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
                <Button
                  className={cn(
                    'bg-accent hover:bg-accent/90',
                    onSignup && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
                  )}
                  asChild
                >
                  <Link href="/signup" aria-current={onSignup ? 'page' : undefined}>
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetHeader className="text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">AweTravel</SheetTitle>
                    <SheetDescription>Navigate and manage your account</SheetDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              </SheetHeader>

              <div className="mt-6 grid gap-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-lg border border-border/70 bg-background px-4 py-3 text-sm font-medium',
                      pathname === l.href
                        ? 'text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 grid gap-2 border-t border-border/70 pt-6">
                {isLoading ? (
                  <div className="h-11 w-full animate-pulse rounded-md bg-muted" aria-hidden />
                ) : user ? (
                  <Button type="button" className="h-11 w-full font-semibold" asChild>
                    <Link
                      href={getHomePathForProfile(profile, user)}
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="h-11 w-full"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link href="/login" aria-current={onLogin ? 'page' : undefined}>
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      className={cn(
                        'h-11 w-full bg-accent font-semibold hover:bg-accent/90',
                        onSignup && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
                      )}
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link href="/signup" aria-current={onSignup ? 'page' : undefined}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
