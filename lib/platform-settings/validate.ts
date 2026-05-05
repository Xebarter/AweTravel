import { z } from 'zod';
import { REPORT_TIMEZONES } from '@/lib/admin/reports/client';

const optionalUrl = z
  .union([z.string().trim().url().max(2048), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v === null ? null : v));

const optionalEmail = z
  .union([
    z.string().trim().email().max(320),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v === null ? null : v));

export const platformSettingsAdminPatchSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120).optional(),
    supportEmail: optionalEmail,
    supportPhone: z
      .union([z.string().trim().max(64), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : v === null ? null : v)),
    termsUrl: optionalUrl,
    privacyUrl: optionalUrl,
    defaultReportTimezone: z.enum(REPORT_TIMEZONES).optional(),
    maintenanceMode: z.coerce.boolean().optional(),
    platformFeeBps: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export type PlatformSettingsAdminPatchInput = z.infer<typeof platformSettingsAdminPatchSchema>;

export const publicPlatformSettingsSchema = z.object({
  site_name: z.string(),
  platform_fee_bps: z.number().int(),
  maintenance_mode: z.boolean(),
  support_email: z.string().nullable().optional(),
});

export type PublicPlatformSettings = z.infer<typeof publicPlatformSettingsSchema>;
