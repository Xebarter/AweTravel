'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getSupabaseAuthHeaderInit } from '@/lib/supabase';

const POLL_MS = 2500;
const MAX_POLLS = 48;

async function downloadTicketPdf(bookingId: string, guestEmail: string) {
  const q = new URLSearchParams();
  if (guestEmail.trim()) q.set('guestEmail', guestEmail.trim());
  const authHeaders = await getSupabaseAuthHeaderInit();
  const tRes = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/ticket?${q.toString()}`, {
    credentials: 'include',
    headers: { ...authHeaders },
  });
  if (!tRes.ok) return;
  const blob = await tRes.blob();
  const cd = tRes.headers.get('Content-Disposition');
  let filename = 'AweTravel-ticket.pdf';
  if (cd) {
    const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"\n]+)"|filename=([^;\n]+)/i.exec(cd);
    const raw = (m?.[1] || m?.[2] || m?.[3])?.trim();
    if (raw) {
      try {
        filename = decodeURIComponent(raw.replace(/^"+|"+$/g, ''));
      } catch {
        filename = raw.replace(/^"+|"+$/g, '');
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';
  const checkoutGroupId = searchParams.get('checkoutGroupId') || '';
  const payRef = bookingId || checkoutGroupId;
  const tripId = searchParams.get('tripId') || '';
  const statusParam = searchParams.get('status') || '';
  const guestEmail = searchParams.get('guestEmail') || '';

  const [message, setMessage] = useState('Checking payment status…');
  const [failed, setFailed] = useState(statusParam === 'failure' || statusParam === 'cancelled');
  const polls = useRef(0);

  useEffect(() => {
    if (!payRef) {
      setFailed(true);
      setMessage('Missing booking reference.');
      return;
    }

    if (statusParam === 'failure' || statusParam === 'cancelled') {
      setFailed(true);
      setMessage(
        statusParam === 'cancelled'
          ? 'Checkout was cancelled. You can try again when you are ready.'
          : 'Payment was not completed. You can try again from your booking.',
      );
      return;
    }

    const tick = async () => {
      const q = new URLSearchParams();
      if (bookingId) q.set('bookingId', bookingId);
      if (checkoutGroupId) q.set('checkoutGroupId', checkoutGroupId);
      if (guestEmail.trim()) q.set('guestEmail', guestEmail.trim());

      const authHeaders = await getSupabaseAuthHeaderInit();
      const res = await fetch(`/api/payments/status?${q.toString()}`, {
        credentials: 'include',
        headers: { ...authHeaders },
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          bookingPaymentStatus?: string;
          paytotaStatus?: string | null;
          bookingIds?: string[];
        };
      };

      if (!res.ok || !json.success || !json.data) {
        setMessage('Could not verify payment yet. Your booking may still update in a moment.');
        return;
      }

      if (json.data.bookingPaymentStatus === 'completed' || json.data.paytotaStatus === 'paid') {
        const ids = json.data.bookingIds?.length
          ? json.data.bookingIds
          : bookingId
            ? [bookingId]
            : [];

        for (let i = 0; i < ids.length; i++) {
          if (i > 0) await new Promise((r) => window.setTimeout(r, 450));
          try {
            await downloadTicketPdf(ids[i]!, guestEmail);
          } catch {
            /* best-effort per ticket */
          }
        }

        await new Promise((r) => window.setTimeout(r, 500));

        const firstId = ids[0] || bookingId;
        const dest = tripId
          ? `/passenger/booking-confirmation?tripId=${encodeURIComponent(tripId)}&bookingId=${encodeURIComponent(firstId)}`
          : '/passenger/bookings';
        router.replace(dest);
        return;
      }

      polls.current += 1;
      if (polls.current >= MAX_POLLS) {
        setMessage(
          'We could not confirm payment in time. If you were charged, your booking will update shortly — check My bookings or contact support.',
        );
        return;
      }

      window.setTimeout(tick, POLL_MS);
    };

    void tick();
  }, [bookingId, checkoutGroupId, payRef, statusParam, tripId, guestEmail, router]);

  if (!payRef) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Invalid return link</CardTitle>
            <CardDescription>Start again from your trip or booking.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/passenger/search">Search trips</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const retryQs = new URLSearchParams();
  if (tripId) retryQs.set('tripId', tripId);
  if (checkoutGroupId) retryQs.set('checkoutGroupId', checkoutGroupId);
  else if (bookingId) retryQs.set('bookingId', bookingId);
  if (guestEmail.trim()) retryQs.set('guestEmail', guestEmail.trim());
  const retryHref = tripId
    ? `/passenger/booking/${encodeURIComponent(tripId)}?${retryQs.toString()}`
    : `/passenger/bookings`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md border-border/80">
        <CardContent className="pt-10 pb-8 text-center space-y-4">
          <div
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              failed ? 'bg-destructive/10' : 'bg-primary/10'
            }`}
          >
            {failed ? (
              <AlertCircle className="h-7 w-7 text-destructive" aria-hidden />
            ) : (
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
            )}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {failed ? 'Payment incomplete' : 'Finishing up'}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          {failed ? (
            <div className="flex flex-col gap-2 pt-2">
              {tripId ? (
                <Button asChild className="w-full">
                  <Link href={retryHref}>Try payment again</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="w-full">
                <Link href="/passenger/bookings">My bookings</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading…
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
