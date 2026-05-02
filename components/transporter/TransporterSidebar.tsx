'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Route, Truck, Calendar, Users, TrendingUp, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/transporter/dashboard',
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
];

export function TransporterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 border-r border-border bg-card">
      <nav className="p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

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
      </nav>
    </aside>
  );
}
