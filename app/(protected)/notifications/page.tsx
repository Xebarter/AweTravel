'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { dismissNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications/client';
import type { NotificationRow } from '@/lib/notifications/types';

type UiNotification = {
  id: string;
  title: string;
  message: string;
  createdAtIso: string;
  createdAt: Date;
  read: boolean;
};

function toUi(n: NotificationRow): UiNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    createdAtIso: n.created_at,
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

export default function NotificationsPage() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<UiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  async function loadFirstPage(nextIncludeDismissed = includeDismissed) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ limit: 40, includeDismissed: nextIncludeDismissed });
      const mapped = res.items.map(toUi);
      setItems(mapped);
      setHasMore(mapped.length >= 40);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    const last = items[items.length - 1];
    if (!last) return;
    setIsLoadingMore(true);
    try {
      const res = await listNotifications({
        limit: 40,
        includeDismissed,
        before: last.createdAtIso,
      });
      const mapped = res.items.map(toUi);
      setItems((prev) => [...prev, ...mapped]);
      setHasMore(mapped.length >= 40);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => void loadFirstPage(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const homeHref = profile?.user_type === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-0 bg-muted/20 pb-12 dark:bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href={homeHref} className="transition-colors hover:text-foreground">
              {profile?.user_type === 'admin' ? 'Admin' : 'Dashboard'}
            </Link>
            <ChevronRight className="size-4 opacity-50" aria-hidden />
            <span className="font-medium text-foreground">Notifications</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Inbox</p>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                <Bell className="size-5" aria-hidden />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => void loadFirstPage()} disabled={isLoading}>
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  const next = !includeDismissed;
                  setIncludeDismissed(next);
                  void loadFirstPage(next);
                }}
                disabled={isLoading}
              >
                {includeDismissed ? 'Hide dismissed' : 'Include dismissed'}
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
            <CardTitle className="text-base font-semibold">All notifications</CardTitle>
            <CardDescription className="text-xs">Scroll and load older items as needed.</CardDescription>
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
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadFirstPage()}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <>
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

                <div className="border-t border-border/60 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!hasMore || isLoadingMore}
                    onClick={() => void loadMore()}
                  >
                    {isLoadingMore ? 'Loading…' : hasMore ? 'Load more' : 'No more notifications'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

