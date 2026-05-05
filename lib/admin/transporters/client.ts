import type { TransporterApprovalStatus } from '@/lib/types';

export type AdminTransporterRow = {
  id: string;
  email: string;
  full_name: string;
  user_type: 'transporter';
  kyc_verified: boolean;
  phone: string | null;
  created_at: string;
  transporter_approval_status: TransporterApprovalStatus;
  transporter_approved_at: string | null;
  transporter_rejection_reason: string | null;
};

export type AdminTransporterProfilePatch = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  kyc_verified?: boolean;
};

export type CreateTransporterPayload = {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
};

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listAdminTransporters(
  status?: TransporterApprovalStatus | 'all',
): Promise<AdminTransporterRow[]> {
  const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`/api/admin/transporters${q}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporters: AdminTransporterRow[] };
  return j.transporters;
}

export async function getAdminTransporter(id: string): Promise<AdminTransporterRow> {
  const res = await fetch(`/api/admin/transporters/${id}`);
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporter: AdminTransporterRow };
  return j.transporter;
}

export async function createAdminTransporter(payload: CreateTransporterPayload): Promise<AdminTransporterRow> {
  const res = await fetch('/api/admin/transporters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporter: AdminTransporterRow };
  return j.transporter;
}

export async function updateAdminTransporter(
  id: string,
  patch: AdminTransporterProfilePatch,
): Promise<AdminTransporterRow> {
  const res = await fetch(`/api/admin/transporters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporter: AdminTransporterRow };
  return j.transporter;
}

export async function deleteAdminTransporter(id: string): Promise<void> {
  const res = await fetch(`/api/admin/transporters/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}

export async function approveTransporter(id: string): Promise<AdminTransporterRow> {
  const res = await fetch(`/api/admin/transporters/${id}/approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporter: AdminTransporterRow };
  return j.transporter;
}

export async function rejectTransporter(id: string, rejectionReason: string): Promise<AdminTransporterRow> {
  const res = await fetch(`/api/admin/transporters/${id}/approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject', rejectionReason }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { transporter: AdminTransporterRow };
  return j.transporter;
}
