import type {
  ListNotificationsResponse,
  NotificationPreferencesRow,
  NotificationRow,
} from '@/lib/notifications/types';

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function listNotifications(params?: {
  limit?: number;
  includeDismissed?: boolean;
  before?: string;
}): Promise<ListNotificationsResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.includeDismissed) sp.set('includeDismissed', '1');
  if (params?.before) sp.set('before', params.before);
  const q = sp.toString();
  const res = await fetch(`/api/notifications${q ? `?${q}` : ''}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ListNotificationsResponse;
}

export async function unreadNotificationCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { unread: number };
  return Number(j.unread) || 0;
}

export async function markNotificationRead(id: string): Promise<NotificationRow> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { notification: NotificationRow };
  return j.notification;
}

export async function dismissNotification(id: string): Promise<NotificationRow> {
  const res = await fetch(`/api/notifications/${id}/dismiss`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { notification: NotificationRow };
  return j.notification;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { updated: number };
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesRow> {
  const res = await fetch('/api/notification-preferences', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { preferences: NotificationPreferencesRow };
  return j.preferences;
}

export async function updateNotificationPreferences(
  patch: Partial<
    Pick<
      NotificationPreferencesRow,
      | 'in_app_enabled'
      | 'email_enabled'
      | 'categories_muted'
      | 'do_not_disturb'
      | 'dnd_start_local'
      | 'dnd_end_local'
    >
  >,
): Promise<NotificationPreferencesRow> {
  const res = await fetch('/api/notification-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const j = (await res.json()) as { preferences: NotificationPreferencesRow };
  return j.preferences;
}

