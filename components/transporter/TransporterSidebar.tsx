'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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

export function TransporterSidebar() {
  const pathname = usePathname();
  const ProfileIcon = profileNavItem.icon;

  return (
    <aside className="hidden md:block w-64 border-r border-border bg-card">
      <nav className="flex flex-col gap-1 p-6">
        <div className="space-y-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isSectionRoot = mainNavItems.some(
            (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`)
          );
          const isActive = isSectionRoot
            ? pathname === item.href || pathname === `${item.href}/`
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        </div>
        <div className="my-2 border-t border-border pt-2">
          <Link
            href={profileNavItem.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium',
              pathname === profileNavItem.href || pathname.startsWith(`${profileNavItem.href}/`)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
            )}
          >
            <ProfileIcon className="h-5 w-5" />
            {profileNavItem.label}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
