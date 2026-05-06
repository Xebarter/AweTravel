'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function Inner() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.toString();
    window.location.replace(`/passenger/payment/return${q ? `?${q}` : ''}`);
  }, [searchParams]);
  return (
    <p className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Redirecting…</p>
  );
}

/** Bridges Paytota absolute success/failure/cancel URLs to the in-app return handler. */
export function RedirectToPassengerPaymentReturn() {
  return (
    <Suspense
      fallback={
        <p className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</p>
      }
    >
      <Inner />
    </Suspense>
  );
}
