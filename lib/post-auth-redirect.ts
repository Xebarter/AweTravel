import { isTransporterApproved } from '@/lib/transporter-approval';
import type { UserProfile } from '@/lib/types';

/** Home route after sign-in or sign-up when the `users` row is known. */
export function getHomePathForProfile(profile: UserProfile | null | undefined): string {
  if (!profile) return '/dashboard';
  if (profile.user_type === 'admin') return '/admin';
  if (profile.user_type === 'transporter') {
    return isTransporterApproved(profile) ? '/transporter' : '/transporter/pending-approval';
  }
  return '/passenger/dashboard';
}
