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
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  createRouteHomeAdApplication,
  patchRouteHomeAdApplication,
  type RouteHomeAdApplicationWithRoute,
} from '@/lib/route-home-ads/transporter-client';
import type { Route } from '@/types/transporter-route';

const HOME_ADS_BUCKET = 'home-ads';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitKind, setSubmitKind] = useState<'idle' | 'draft' | 'review'>('idle');
  const [error, setError] = useState<string | null>(null);
  const busy = submitKind !== 'idle';

  const reset = useCallback(() => {
    setHeadline('');
    setSubheadline('');
    setCtaLabel('Book now');
    setImageFile(null);
    setImagePreviewUrl(null);
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
      setImageFile(null);
      setImagePreviewUrl(null);
    } else {
      const label = `${route.origin} → ${route.destination}`;
      setHeadline(`Travel ${label}`);
      setCtaLabel('Book now');
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [open, route, existingDraft, blockingPending]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const submit = async (asDraft: boolean) => {
    if (!route || blockingPending) return;
    setSubmitKind(asDraft ? 'draft' : 'review');
    setError(null);
    try {
      const appBaseUrl =
        (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '') || 'https://example.com';
      const targetUrl = `${appBaseUrl}/passenger/search?from=${encodeURIComponent(route.origin)}&to=${encodeURIComponent(route.destination)}`;

      let resolvedImageUrl = existingDraft?.imageUrl ?? '';
      if (imageFile) {
        if (!imageFile.type.startsWith('image/')) {
          throw new Error('Please upload an image file.');
        }

        const safeName = imageFile.name.replace(/[^\w.\-]+/g, '-');
        const path = `route-home-ads/${route.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from(HOME_ADS_BUCKET).upload(path, imageFile, {
          upsert: true,
          contentType: imageFile.type,
        });
        if (upErr) {
          throw new Error(upErr.message || 'Failed to upload image');
        }

        const pub = supabase.storage.from(HOME_ADS_BUCKET).getPublicUrl(path);
        resolvedImageUrl = pub.data.publicUrl;
      }

      if (!resolvedImageUrl) {
        throw new Error('Please upload an image for the homepage banner.');
      }

      const body = {
        headline: headline.trim(),
        subheadline: subheadline.trim() || null,
        ctaLabel: ctaLabel.trim(),
        targetUrl,
        imageUrl: resolvedImageUrl,
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
                <Label htmlFor="ad-img">Banner image</Label>
                <Input
                  id="ad-img"
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  className={cn('h-11 pt-2.5', busy && 'opacity-80')}
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;
                    setError(null);
                    setImageFile(f);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a wide image (about 16:9). It will be cropped to fit the homepage strip.
                </p>
                {imagePreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Selected banner preview"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                ) : existingDraft?.imageUrl ? (
                  <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={existingDraft.imageUrl}
                      alt="Current banner image"
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                ) : null}
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
