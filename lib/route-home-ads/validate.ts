import { z } from 'zod';

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Expected UUID',
  );

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((u) => /^https:\/\//i.test(u), { message: 'URL must use https://' });

const optionalHttpsUrl = z
  .union([httpsUrl, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined ? undefined : v));

const applicationStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'withdrawn',
]);

export const routeHomeAdApplicationCreateSchema = z.object({
  routeId: uuidSchema,
  headline: z.string().trim().min(1).max(160),
  subheadline: z.string().trim().max(240).optional().nullable(),
  ctaLabel: z.string().trim().min(1).max(64),
  // Transporter UI no longer asks for targetUrl; server may auto-generate it.
  targetUrl: httpsUrl.optional().default('https://example.com'),
  imageUrl: httpsUrl,
  status: applicationStatusSchema.default('pending_review'),
});

export const routeHomeAdApplicationTransporterPatchSchema = z
  .object({
    status: z.union([z.literal('withdrawn'), z.literal('pending_review')]).optional(),
    headline: z.string().trim().min(1).max(160).optional(),
    subheadline: z.string().trim().max(240).optional().nullable(),
    ctaLabel: z.string().trim().min(1).max(64).optional(),
    targetUrl: optionalHttpsUrl,
    imageUrl: optionalHttpsUrl,
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field is required' });

export const routeHomeAdApplicationAdminReviewSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('approve'),
  }),
  z.object({
    decision: z.literal('reject'),
    rejectionReason: z.string().trim().min(1).max(1000),
  }),
]);

const homeBannerBody = z.object({
  sourceApplicationId: uuidSchema.optional().nullable(),
  imageUrl: httpsUrl,
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).optional().nullable(),
  ctaLabel: z.string().trim().min(1).max(64),
  linkUrl: httpsUrl,
  sponsoredLabel: z.string().trim().max(64).optional().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
  sortOrder: z.coerce.number().int(),
  isActive: z.coerce.boolean(),
});

export const homeBannerCreateSchema = homeBannerBody
  .extend({
    sortOrder: z.coerce.number().int().default(0),
    isActive: z.coerce.boolean().default(true),
  })
  .refine(
    (v) => v.endsAt == null || new Date(v.endsAt).getTime() >= new Date(v.startsAt).getTime(),
    { message: 'ends_at must be on or after starts_at', path: ['endsAt'] },
  );

export const homeBannerUpdateSchema = homeBannerBody
  .partial()
  .refine((obj: Record<string, unknown>) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine((v, ctx) => {
    if (v.startsAt !== undefined && v.endsAt != null) {
      if (new Date(v.endsAt).getTime() < new Date(v.startsAt).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ends_at must be on or after starts_at',
          path: ['endsAt'],
        });
      }
    }
  });

export type RouteHomeAdApplicationCreateInput = z.infer<typeof routeHomeAdApplicationCreateSchema>;
export type RouteHomeAdApplicationTransporterPatchInput = z.infer<
  typeof routeHomeAdApplicationTransporterPatchSchema
>;
export type RouteHomeAdApplicationAdminReviewInput = z.infer<
  typeof routeHomeAdApplicationAdminReviewSchema
>;
export type HomeBannerCreateInput = z.infer<typeof homeBannerCreateSchema>;
export type HomeBannerUpdateInput = z.infer<typeof homeBannerUpdateSchema>;
