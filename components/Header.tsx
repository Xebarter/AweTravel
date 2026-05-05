'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from './NotificationCenter';
import { LogOut, Settings, User, Menu } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function isPassengerNavActive(href: string, pathname: string): boolean {
  if (href === '/passenger/dashboard') {
    return pathname === '/passenger/dashboard' || pathname === '/passenger';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const getDashboardUrl = () => {
    if (!profile) return '/';
    return '/dashboard';
  };

  const getNavLinks = () => {
    if (!profile) return [];
    
    switch (profile.user_type) {
      case 'admin':
        return [
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/users', label: 'Passengers' },
          { href: '/admin/companies', label: 'Companies' },
        ];
      case 'transporter':
        return [
          { href: '/transporter', label: 'Dashboard' },
          { href: '/transporter/routes', label: 'Routes' },
          { href: '/transporter/vehicles', label: 'Vehicles' },
          { href: '/transporter/schedules', label: 'Schedules' },
          { href: '/transporter/bookings', label: 'Bookings' },
          { href: '/transporter/earnings', label: 'Earnings' },
          { href: '/transporter/profile', label: 'Profile' },
        ];
      case 'passenger':
      default:
        return [
          { href: '/passenger/dashboard', label: 'Dashboard' },
          { href: '/passenger/search', label: 'Find trips' },
          { href: '/passenger/bookings', label: 'My bookings' },
        ];
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={getDashboardUrl()} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white">
              A
            </div>
            <span className="font-bold text-foreground hidden sm:inline">AweTravel</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {getNavLinks().map((link) => {
              const passengerActive =
                profile?.user_type === 'passenger' && isPassengerNavActive(link.href, pathname);
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      passengerActive
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background hover:text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationCenter />

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-secondary rounded-lg transition flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">
                  {profile?.full_name || 'User'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg">
                  <div className="p-3 border-b border-border">
                    <p className="font-medium text-foreground text-sm">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    <p className="text-xs text-accent font-medium mt-1 capitalize">{profile?.user_type}</p>
                  </div>

                  <div className="p-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      asChild
                    >
                      <Link href="/profile">
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Preferences
                    </Button>
                  </div>

                  <div className="border-t border-border p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-destructive hover:bg-destructive/10 text-sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMenu && (
          <div className="md:hidden pb-3 border-t border-border space-y-1">
            {getNavLinks().map((link) => {
              const passengerActive =
                profile?.user_type === 'passenger' && isPassengerNavActive(link.href, pathname);
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start text-sm',
                      passengerActive
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background hover:text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setShowMenu(false)}
                  >
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
