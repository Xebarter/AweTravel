'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getHomePathForProfile } from '@/lib/post-auth-redirect';
import { HomeHeaderTripSearch } from '@/components/site/HomeHeaderTripSearch';
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
import { Menu } from 'lucide-react';

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogin = pathname === '/login';
  const onSignup = pathname === '/signup';
  const onHome = pathname === '/';

  return (
    <>
      {/* Upper: sticky on all breakpoints — on mobile (home) holds logo + menu only; search is in the row below. */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10">
              <span className="text-base font-bold text-white sm:text-lg">A</span>
            </div>
            <span className="truncate text-lg font-bold text-foreground sm:text-2xl">
              AweTravel
            </span>
          </Link>

          {onHome ? (
            <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
              <HomeHeaderTripSearch />
            </div>
          ) : (
            <div className="hidden flex-1 md:block" aria-hidden />
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
            <SheetContent
              side="right"
              className={cn(
                'flex h-dvh max-h-dvh flex-col gap-0 overflow-y-auto p-0 shadow-2xl',
                'border-l border-border/80 bg-background',
              )}
            >
              <SheetHeader className="space-y-1 border-b border-border/70 bg-muted/25 px-5 pb-4 pt-12 text-left">
                <SheetTitle className="text-base font-semibold tracking-tight">Menu</SheetTitle>
                <SheetDescription className="text-xs leading-relaxed">
                  Sign in, create an account, or go to your dashboard.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
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

      {/* Lower (mobile only, home only): scrolls with the page — trip search */}
      {onHome ? (
        <div className="border-b border-border bg-background md:hidden">
          <div className="mx-auto max-w-7xl px-4 pb-3 pt-0.5 sm:px-6">
            <HomeHeaderTripSearch className="max-w-none" />
          </div>
        </div>
      ) : null}
    </>
  );
}
