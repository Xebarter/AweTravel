'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/client';
import type { NotificationRow, NotificationType } from '@/lib/notifications/types';

function toUi(n: NotificationRow) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type as NotificationType,
    read: Boolean(n.read_at),
    dismissed: Boolean(n.dismissed_at),
    createdAt: new Date(n.created_at),
    data: n.data ?? {},
  };
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ReturnType<typeof toUi>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read && !n.dismissed).length, [notifications]);

  async function refresh() {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await listNotifications({ limit: 25 });
      setNotifications(res.items.map(toUi));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleMarkAsRead = (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    void (async () => {
      try {
        await markNotificationRead(id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      } finally {
        setIsMutating(false);
      }
    })();
  };

  const handleDismiss = (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    void (async () => {
      try {
        await dismissNotification(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } finally {
        setIsMutating(false);
      }
    })();
  };

  const handleMarkAllAsRead = () => {
    if (isMutating) return;
    setIsMutating(true);
    void (async () => {
      try {
        await markAllNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } finally {
        setIsMutating(false);
      }
    })();
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      default:
        return 'bg-info/10 border-info/20';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-info';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) void refresh();
        }}
        className="relative p-2 hover:bg-secondary rounded-lg transition"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-8"
                  disabled={isMutating}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDropdown(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden />
                <p className="text-sm">Loading notifications…</p>
              </div>
            ) : loadError ? (
              <div className="p-6 text-center">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-2 p-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground">{notification.title}</p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-7 w-7 p-0"
                            disabled={isMutating}
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismiss(notification.id)}
                          className="h-7 w-7 p-0"
                          disabled={isMutating}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/notifications">View All Notifications</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
