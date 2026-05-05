export type AdminPassengerRow = {
  id: string;
  email: string;
  full_name: string;
  user_type: 'passenger';
  kyc_verified: boolean;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  account_suspended: boolean;
};

export type AdminPassengerProfilePatch = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  kyc_verified?: boolean;
  profile_image?: string | null;
  account_suspended?: boolean;
};

export type CreatePassengerPayload = {
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

export async function listAdminPassengers(): Promise<AdminPassengerRow[]> {
  const res = await fetch('/api/admin/passengers');
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { passengers: AdminPassengerRow[] };
  return j.passengers;
}

export async function createAdminPassenger(payload: CreatePassengerPayload): Promise<AdminPassengerRow> {
  const res = await fetch('/api/admin/passengers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { passenger: AdminPassengerRow };
  return j.passenger;
}

export async function updateAdminPassenger(
  id: string,
  patch: AdminPassengerProfilePatch,
): Promise<AdminPassengerRow> {
  const res = await fetch(`/api/admin/passengers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { passenger: AdminPassengerRow };
  return j.passenger;
}

export async function deleteAdminPassenger(id: string): Promise<void> {
  const res = await fetch(`/api/admin/passengers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await readError(res));
}
