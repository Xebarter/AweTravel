'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;

    if (profile.user_type === 'admin') {
      router.push('/admin');
    } else if (profile.user_type === 'transporter') {
      router.push('/transporter');
    } else {
      router.push('/passenger');
    }
  }, [profile, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
    </div>
  );
}
