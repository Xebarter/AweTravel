'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { dismissNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications/client';
import type { NotificationRow } from '@/lib/notifications/types';

type UiNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationRow['type'];
  createdAt: Date;
  read: boolean;
};

function toUi(n: NotificationRow): UiNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    createdAt: new Date(n.created_at),
    read: Boolean(n.read_at),
  };
}

function relTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<UiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ limit: 100, includeDismissed: false });
      setItems(res.items.map(toUi));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      channel = supabase
        .channel(`admin-notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          () => void refresh(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Notifications</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration</p>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                <Bell className="size-5" aria-hidden />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">Operational updates and alerts for your account.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => void refresh()} disabled={isLoading}>
                Refresh
              </Button>
              <Button
                size="sm"
                className="h-8"
                disabled={isMutating || unread === 0}
                onClick={() => {
                  setIsMutating(true);
                  void (async () => {
                    try {
                      await markAllNotificationsRead();
                      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                    } finally {
                      setIsMutating(false);
                    }
                  })();
                }}
              >
                Mark all read
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-semibold">Inbox</CardTitle>
            <CardDescription className="text-xs">
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin" aria-hidden />
                <p className="text-sm">Loading…</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {items.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-6 py-4">
                    <div className="mt-1 size-2 rounded-full bg-primary" aria-hidden style={{ opacity: n.read ? 0.15 : 1 }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{relTime(n.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                      <Separator className="my-3 bg-border/60" />
                      <div className="flex flex-wrap gap-2">
                        {!n.read ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={isMutating}
                            onClick={() => {
                              setIsMutating(true);
                              void (async () => {
                                try {
                                  await markNotificationRead(n.id);
                                  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                                } finally {
                                  setIsMutating(false);
                                }
                              })();
                            }}
                          >
                            <Check className="size-4" aria-hidden />
                            Mark read
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground"
                          disabled={isMutating}
                          onClick={() => {
                            setIsMutating(true);
                            void (async () => {
                              try {
                                await dismissNotification(n.id);
                                setItems((prev) => prev.filter((x) => x.id !== n.id));
                              } finally {
                                setIsMutating(false);
                              }
                            })();
                          }}
                        >
                          <X className="size-4" aria-hidden />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

