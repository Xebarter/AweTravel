import type { UserProfile } from '@/lib/types';

export function isTransporterApproved(profile: UserProfile | null | undefined): boolean {
  return profile?.user_type === 'transporter' && profile.transporter_approval_status === 'approved';
}

export function isTransporterPendingApproval(
  profile: UserProfile | null | undefined,
): boolean {
  return profile?.user_type === 'transporter' && profile.transporter_approval_status === 'pending';
}

export function isTransporterRejected(profile: UserProfile | null | undefined): boolean {
  return profile?.user_type === 'transporter' && profile.transporter_approval_status === 'rejected';
}
