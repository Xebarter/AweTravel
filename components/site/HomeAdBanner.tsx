'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomeBanner } from '@/types/route-home-ad';
import { cn } from '@/lib/utils';

export function HomeAdBanner() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/home/banners');
        if (!res.ok) throw new Error('Could not load promotions');
        const j = (await res.json()) as { banners: HomeBanner[] };
        if (!cancelled) {
          setBanners(j.banners ?? []);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setBanners([]);
          setLoadError('unavailable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const n = banners.length;
  const current = n > 0 ? banners[Math.min(index, n - 1)]! : null;

  const goPrev = useCallback(() => {
    setIndex((i) => (n <= 1 ? 0 : (i - 1 + n) % n));
  }, [n]);

  const goNext = useCallback(() => {
    setIndex((i) => (n <= 1 ? 0 : (i + 1) % n));
  }, [n]);

  useEffect(() => {
    if (!current || n <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, n, goPrev, goNext]);

  if (loadError || !current) return null;

  const isExternal = /^https?:\/\//i.test(current.linkUrl);
  const ctaClass =
    'inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  return (
    <section
      role="region"
      aria-label="Featured promotions"
      aria-roledescription="carousel"
      className="border-b border-border bg-muted/35"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-stretch gap-3 sm:gap-4">
          {n > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden shrink-0 self-center sm:inline-flex"
              aria-label="Previous promotion"
              onClick={goPrev}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative aspect-video w-full max-w-md shrink-0 overflow-hidden rounded-lg border border-border bg-background sm:max-w-[280px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary HTTPS creative URLs */}
              <img
                src={current.imageUrl}
                alt={current.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {current.sponsoredLabel ? (
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {current.sponsoredLabel}
                </p>
              ) : null}
              <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">
                {current.title}
              </h2>
              {current.subtitle ? (
                <p className="text-sm text-muted-foreground sm:text-base">{current.subtitle}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isExternal ? (
                  <a
                    href={current.linkUrl}
                    className={ctaClass}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {current.ctaLabel}
                  </a>
                ) : (
                  <Link href={current.linkUrl} className={ctaClass}>
                    {current.ctaLabel}
                  </Link>
                )}
                {n > 1 && (
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {index + 1} / {n}
                  </span>
                )}
              </div>
            </div>
          </div>

          {n > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden shrink-0 self-center sm:inline-flex"
              aria-label="Next promotion"
              onClick={goNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>

        {n > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {banners.map((_, i) => (
              <button
                key={banners[i]!.id}
                type="button"
                aria-label={`Go to promotion ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === index ? 'bg-accent' : 'bg-muted-foreground/30',
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
