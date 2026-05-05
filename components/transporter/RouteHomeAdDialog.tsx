'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createRouteHomeAdApplication,
  patchRouteHomeAdApplication,
  type RouteHomeAdApplicationWithRoute,
} from '@/lib/route-home-ads/transporter-client';
import type { Route } from '@/types/transporter-route';

type Props = {
  route: Route | null;
  /** When set, saves and submits update this draft row instead of creating a new application. */
  existingDraft: RouteHomeAdApplicationWithRoute | null;
  /** True when this route already has an application in pending_review (form is hidden). */
  blockingPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
};

export function RouteHomeAdDialog({
  route,
  existingDraft,
  blockingPending,
  open,
  onOpenChange,
  onSubmitted,
}: Props) {
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Book now');
  const [targetUrl, setTargetUrl] = useState('https://');
  const [imageUrl, setImageUrl] = useState('https://');
  const [submitKind, setSubmitKind] = useState<'idle' | 'draft' | 'review'>('idle');
  const [error, setError] = useState<string | null>(null);
  const busy = submitKind !== 'idle';

  const reset = useCallback(() => {
    setHeadline('');
    setSubheadline('');
    setCtaLabel('Book now');
    setTargetUrl('https://');
    setImageUrl('https://');
    setError(null);
    setSubmitKind('idle');
  }, []);

  useEffect(() => {
    if (!open || !route) return;
    setError(null);
    setSubmitKind('idle');
    if (blockingPending) return;
    if (existingDraft) {
      setHeadline(existingDraft.headline);
      setSubheadline(existingDraft.subheadline ?? '');
      setCtaLabel(existingDraft.ctaLabel);
      setTargetUrl(existingDraft.targetUrl);
      setImageUrl(existingDraft.imageUrl);
    } else {
      const label = `${route.origin} → ${route.destination}`;
      setHeadline(`Travel ${label}`);
      setCtaLabel('Book now');
      setTargetUrl('https://');
      setImageUrl('https://');
    }
  }, [open, route, existingDraft, blockingPending]);

  const submit = async (asDraft: boolean) => {
    if (!route || blockingPending) return;
    setSubmitKind(asDraft ? 'draft' : 'review');
    setError(null);
    try {
      const body = {
        headline: headline.trim(),
        subheadline: subheadline.trim() || null,
        ctaLabel: ctaLabel.trim(),
        targetUrl: targetUrl.trim(),
        imageUrl: imageUrl.trim(),
      };
      if (existingDraft) {
        if (asDraft) {
          await patchRouteHomeAdApplication(existingDraft.id, body);
        } else {
          await patchRouteHomeAdApplication(existingDraft.id, { ...body, status: 'pending_review' });
        }
      } else {
        await createRouteHomeAdApplication({
          routeId: route.id,
          ...body,
          status: asDraft ? 'draft' : 'pending_review',
        });
      }
      onSubmitted();
      onOpenChange(false);
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitKind('idle');
    }
  };

  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Homepage ad application</DialogTitle>
          <DialogDescription>
            {blockingPending ? (
              <>
                You already have an application under review for{' '}
                <span className="font-medium text-foreground">
                  {route.routeCode}: {route.origin} → {route.destination}
                </span>
                . You will be notified when an admin has decided.
              </>
            ) : (
              <>
                Request a banner on the public home page for{' '}
                <span className="font-medium text-foreground">
                  {route.routeCode}: {route.origin} → {route.destination}
                </span>
                . An admin will review your request before anything goes live.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {blockingPending ? (
          <DialogFooter className="sm:justify-end">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ad-headline">Headline</Label>
                <Input
                  id="ad-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={160}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-sub">Subheadline (optional)</Label>
                <Textarea
                  id="ad-sub"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  maxLength={240}
                  rows={2}
                  disabled={busy}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-cta">Button label</Label>
                <Input
                  id="ad-cta"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  maxLength={64}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-url">Target URL (https only)</Label>
                <Input
                  id="ad-url"
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/your-offer"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-img">Image URL (https only)</Label>
                <Input
                  id="ad-img"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Use a wide image (about 16:9). It will be cropped to fit the homepage strip.
                </p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                {submitKind === 'draft' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Save draft
              </Button>
              <Button type="button" disabled={busy} onClick={() => void submit(false)}>
                {submitKind === 'review' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Submit for review
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
