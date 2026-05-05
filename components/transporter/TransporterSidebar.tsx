'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  LayoutDashboard,
  Route,
  Truck,
  Calendar,
  Users,
  TrendingUp,
  FileCheck,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';

const navItems = [
  {
    label: 'Dashboard',
    href: '/transporter',
    icon: LayoutDashboard,
  },
  {
    label: 'Routes',
    href: '/transporter/routes',
    icon: Route,
  },
  {
    label: 'Vehicles',
    href: '/transporter/vehicles',
    icon: Truck,
  },
  {
    label: 'Schedules',
    href: '/transporter/schedules',
    icon: Calendar,
  },
  {
    label: 'Bookings',
    href: '/transporter/bookings',
    icon: Users,
  },
  {
    label: 'Earnings',
    href: '/transporter/earnings',
    icon: TrendingUp,
  },
  {
    label: 'Verification',
    href: '/transporter/verification',
    icon: FileCheck,
  },
  {
    label: 'Profile',
    href: '/transporter/profile',
    icon: UserRound,
  },
];

const mainNavItems = navItems.slice(0, -1);
const profileNavItem = navItems[navItems.length - 1]!;

function labelForPath(pathname: string): string {
  if (pathname === '/transporter' || pathname === '/transporter/') return 'Dashboard';
  const match =
    navItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)) ??
    navItems.find((i) => i.href !== '/transporter' && pathname.startsWith(i.href));
  return match?.label ?? 'Transporter';
}

export function TransporterSidebar() {
  const pathname = usePathname();
  const ProfileIcon = profileNavItem.icon;
  const activeLabel = labelForPath(pathname);

  return (
    <>
      {/* Mobile header + drawer nav */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Open menu">
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetHeader className="border-b border-border/70">
              <SheetTitle>Transporter console</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4">
              <div className="space-y-1">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isSectionRoot = mainNavItems.some(
                    (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`),
                  );
                  const isActive = isSectionRoot
                    ? pathname === item.href || pathname === `${item.href}/`
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <SheetClose key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
              <div className="my-2 border-t border-border pt-2">
                <SheetClose asChild>
                  <Link
                    href={profileNavItem.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      pathname === profileNavItem.href || pathname.startsWith(`${profileNavItem.href}/`)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                    )}
                  >
                    <ProfileIcon className="h-5 w-5" aria-hidden />
                    {profileNavItem.label}
                  </Link>
                </SheetClose>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card md:block">
        <nav className="flex flex-col gap-1 p-6">
          <div className="space-y-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isSectionRoot = mainNavItems.some(
                (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`),
              );
              const isActive = isSectionRoot
                ? pathname === item.href || pathname === `${item.href}/`
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="my-2 border-t border-border pt-2">
            <Link
              href={profileNavItem.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                pathname === profileNavItem.href || pathname.startsWith(`${profileNavItem.href}/`)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )}
            >
              <ProfileIcon className="h-5 w-5" aria-hidden />
              {profileNavItem.label}
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
