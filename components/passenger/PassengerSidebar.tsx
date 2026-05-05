'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, LayoutDashboard, Search, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/passenger/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Search trips',
    href: '/passenger/search',
    icon: Search,
  },
  {
    label: 'My bookings',
    href: '/passenger/bookings',
    icon: Ticket,
  },
  {
    label: 'Payments',
    href: '/passenger/payment',
    icon: CreditCard,
  },
] as const;

function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/passenger/dashboard') {
    return pathname === '/passenger' || pathname === '/passenger/' || pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PassengerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-border bg-card lg:block">
      <nav className="space-y-2 p-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveHref(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

