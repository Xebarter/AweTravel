export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
};

export type ListNotificationsResponse = {
  items: NotificationRow[];
};

export type NotificationPreferencesRow = {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  categories_muted: string[];
  do_not_disturb: boolean;
  dnd_start_local: string | null;
  dnd_end_local: string | null;
  updated_at: string;
};

