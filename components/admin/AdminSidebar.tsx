'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Passengers',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Transporters',
    href: '/admin/transporters',
    icon: Building2,
  },
  {
    label: 'Home ads',
    href: '/admin/home-ads',
    icon: Megaphone,
  },
  {
    label: 'Transactions',
    href: '/admin/transactions',
    icon: CreditCard,
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 border-r border-border bg-card">
      <nav className="p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isSectionRoot = navItems.some(
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
