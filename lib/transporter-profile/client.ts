import type { UserProfile } from '@/lib/types';

export type TransporterCompanyProfile = {
  owner_user_id: string;
  company_name: string;
  trading_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  ops_email: string | null;
  ops_phone: string | null;
  website: string | null;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  country: string;
  registration_number: string | null;
  tax_id: string | null;
  about: string | null;
  created_at: string;
  updated_at: string;
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getTransporterProfile(): Promise<{
  owner: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'phone' | 'profile_image' | 'user_type' | 'kyc_verified' | 'created_at'>;
  company: TransporterCompanyProfile | null;
}> {
  const res = await fetch('/api/transporter/profile', { method: 'GET' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    owner: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'phone' | 'profile_image' | 'user_type' | 'kyc_verified' | 'created_at'>;
    company: TransporterCompanyProfile | null;
  };
}

export async function updateTransporterOwnerProfile(input: {
  full_name: string;
  phone?: string | null;
  profile_image?: string | null;
}): Promise<{
  owner: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'phone' | 'profile_image' | 'user_type' | 'kyc_verified' | 'created_at'>;
}> {
  const res = await fetch('/api/transporter/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as {
    owner: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'phone' | 'profile_image' | 'user_type' | 'kyc_verified' | 'created_at'>;
  };
}

export async function upsertTransporterCompanyProfile(company: Partial<TransporterCompanyProfile> & { company_name: string }): Promise<{
  company: TransporterCompanyProfile | null;
}> {
  const res = await fetch('/api/transporter/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ company }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { company: TransporterCompanyProfile | null };
}

export async function deleteTransporterCompanyProfile(): Promise<{ ok: true }> {
  const res = await fetch('/api/transporter/profile', { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: true };
}

