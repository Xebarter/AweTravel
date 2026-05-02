'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings } from 'lucide-react';

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

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="hidden sm:inline font-semibold text-foreground">AweTravel</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-muted-foreground">
            {profile?.full_name}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Profile">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
