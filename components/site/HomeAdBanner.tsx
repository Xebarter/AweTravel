'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomeBanner } from '@/types/route-home-ad';
import { resolveBannerCta, todayIsoDate } from '@/lib/home-banners/cta';
import { cn } from '@/lib/utils';

export function HomeAdBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentOrigin, setCurrentOrigin] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrigin(window.location.origin);
  }, []);

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const interactCounter = useRef(0);
  const lastInteractionAtRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const AUTOPLAY_MS = 5000;

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

  const goTo = useCallback(
    (i: number) => {
      if (n <= 1) return;
      setIndex(() => ((i % n) + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (!current || n <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, n, goPrev, goNext]);

  const resolvedCta = useMemo(() => {
    if (!current) return { kind: 'external' as const, href: '#' };
    return resolveBannerCta(current.linkUrl, { currentOrigin });
  }, [current, currentOrigin]);

  const onInternalCtaClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (resolvedCta.kind !== 'internal') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      if (pathname !== '/') return;

      const href = resolvedCta.href;
      if (!href.startsWith('/passenger/search')) return;

      e.preventDefault();
      try {
        const u = new URL(href, window.location.origin);
        const from = u.searchParams.get('from') ?? '';
        const to = u.searchParams.get('to') ?? '';
        const date = u.searchParams.get('date') ?? todayIsoDate();
        const q = new URLSearchParams({ from, to, date }).toString();
        void router.replace(`/?${q}`, { scroll: false });
        requestAnimationFrame(() => {
          document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch {
        void router.push(href);
      }
    },
    [pathname, resolvedCta, router],
  );

  const ctaClass =
    'inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const liveMessage = n > 0 ? `Promotion ${index + 1} of ${n}` : '';

  const pause = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
    interactCounter.current += 1;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
    interactCounter.current = Math.max(0, interactCounter.current - 1);
    if (interactCounter.current === 0) setIsPaused(false);
  }, []);

  const markUserInteraction = useCallback(() => {
    lastInteractionAtRef.current = Date.now();
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0]!.clientX;
    pause();
  }, [pause]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    resume();
    if (startX == null) return;
    if (e.changedTouches.length < 1) return;

    const endX = e.changedTouches[0]!.clientX;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;

    markUserInteraction();
    if (delta > 0) goPrev();
    else goNext();
  }, [goNext, goPrev, markUserInteraction, resume]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pause, resume]);

  useEffect(() => {
    if (!current || n <= 1) return;
    if (isPaused) return;

    const t = window.setInterval(() => {
      if (document.hidden) return;
      // Avoid an immediate auto-advance right after a click/hover/focus interaction.
      if (Date.now() - lastInteractionAtRef.current < 1200) return;
      goNext();
    }, AUTOPLAY_MS);

    return () => window.clearInterval(t);
  }, [current, n, isPaused, goNext]);

  if (loadError || !current) return null;

  return (
    <section
      role="region"
      aria-label="Featured promotions"
      aria-roledescription="carousel"
      className="border-b border-border bg-muted/20"
    >
      <div className="mx-auto max-w-7xl px-2 py-2 sm:px-3 sm:py-2.5 lg:px-4">
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </p>
        <div
          className="group relative overflow-hidden border border-border bg-card"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocusCapture={pause}
          onBlurCapture={resume}
        >
          <div
            className="relative aspect-1600/400 w-full sm:aspect-1600/300"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={current.imageUrl}
              alt={current.title}
              fill
              priority={index === 0}
              quality={80}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 95vw, 1280px"
              className="object-cover"
            />

            {n > 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm opacity-90 transition-opacity hover:opacity-100 sm:left-3 sm:size-10 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Previous promotion"
                  onClick={() => {
                    markUserInteraction();
                    goPrev();
                  }}
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm opacity-90 transition-opacity hover:opacity-100 sm:right-3 sm:size-10 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Next promotion"
                  onClick={() => {
                    markUserInteraction();
                    goNext();
                  }}
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </Button>
              </>
            ) : null}

            {n > 1 ? (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 sm:bottom-3">
                {banners.map((_, i) => (
                  <button
                    key={banners[i]!.id}
                    type="button"
                    aria-label={`Go to promotion ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full border border-background/60 bg-background/40 transition-all',
                      i === index ? 'w-6 bg-accent' : 'hover:bg-background/70',
                    )}
                    onClick={() => {
                      markUserInteraction();
                      goTo(i);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-border/60 bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-snug text-foreground sm:text-base">
                {current.title}
              </p>
              {current.subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground sm:text-sm">
                  {current.subtitle}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {resolvedCta.kind === 'external' ? (
                <a
                  href={resolvedCta.href}
                  className={ctaClass}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {current.ctaLabel}
                </a>
              ) : (
                <Link href={resolvedCta.href} className={ctaClass} onClick={onInternalCtaClick}>
                  {current.ctaLabel}
                </Link>
              )}
              {n > 1 ? (
                <span className="hidden text-xs text-muted-foreground sm:inline" aria-live="polite">
                  {index + 1} / {n}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
