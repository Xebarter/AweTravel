import type { User } from '@supabase/supabase-js';
import { isTransporterApproved } from '@/lib/transporter-approval';
import type { UserProfile } from '@/lib/types';

function homePathFromAuthMetadata(user: User | null | undefined): string | null {
  if (!user?.app_metadata || typeof user.app_metadata !== 'object') return null;
  const meta = user.app_metadata as {
    user_type?: unknown;
    transporter_approval_status?: unknown;
  };
  const ut = meta.user_type;
  if (ut !== 'admin' && ut !== 'transporter' && ut !== 'passenger') return null;
  if (ut === 'admin') return '/admin';
  if (ut === 'transporter') {
    return meta.transporter_approval_status === 'approved'
      ? '/transporter'
      : '/transporter/pending-approval';
  }
  return '/passenger/dashboard';
}

/**
 * Home route after sign-in or sign-up when the `users` row is known.
 * When `profile` is not loaded yet, falls back to JWT `app_metadata` (see migration 006_auth_jwt_role_sync).
 */
export function getHomePathForProfile(
  profile: UserProfile | null | undefined,
  authUser?: User | null,
): string {
  if (profile) {
    if (profile.user_type === 'admin') return '/admin';
    if (profile.user_type === 'transporter') {
      return isTransporterApproved(profile) ? '/transporter' : '/transporter/pending-approval';
    }
    return '/passenger/dashboard';
  }
  return homePathFromAuthMetadata(authUser) ?? '/';
}
