'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Settings, Ticket, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { AppLogoMark } from '@/components/site/AppLogoMark';

export function DashboardHeader() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const userType = profile?.user_type;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <AppLogoMark size={32} className="h-8 w-8 rounded-lg bg-accent/10 ring-1 ring-border/60" />
            <span className="hidden font-semibold text-foreground sm:inline">AweTravel</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:block">
            {profile?.full_name}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {userType === 'passenger' ? (
              <>
                <Button variant="ghost" size="sm" title="Dashboard" asChild>
                  <Link href="/passenger/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" title="My bookings" asChild>
                  <Link href="/passenger/bookings">
                    <Ticket className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : null}

            {userType === 'transporter' ? (
              <>
                <Button variant="ghost" size="sm" title="Profile" asChild>
                  <Link href="/transporter/profile">
                    <User className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" title="Preferences" asChild>
                  <Link href="/transporter/profile?tab=preferences">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : null}

            {userType === 'admin' ? (
              <>
                <Button variant="ghost" size="sm" title="Admin" asChild>
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" title="Passengers" asChild>
                  <Link href="/admin/users">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : null}

            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
