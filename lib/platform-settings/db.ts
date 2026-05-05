import { PLATFORM_SETTINGS_ROW_ID } from '@/lib/platform-settings/constants';

export type PlatformSettingsRow = {
  id: string;
  site_name: string;
  support_email: string | null;
  support_phone: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  default_report_timezone: string;
  maintenance_mode: boolean;
  platform_fee_bps: number;
  updated_by: string | null;
  updated_at: string;
};

export type PlatformSettings = {
  id: string;
  siteName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  defaultReportTimezone: string;
  maintenanceMode: boolean;
  platformFeeBps: number;
  updatedBy: string | null;
  updatedAt: string;
};

export function rowToPlatformSettings(row: PlatformSettingsRow): PlatformSettings {
  return {
    id: row.id,
    siteName: row.site_name,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    termsUrl: row.terms_url,
    privacyUrl: row.privacy_url,
    defaultReportTimezone: row.default_report_timezone,
    maintenanceMode: row.maintenance_mode,
    platformFeeBps: row.platform_fee_bps,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export const PLATFORM_SETTINGS_SELECT = `
  id,
  site_name,
  support_email,
  support_phone,
  terms_url,
  privacy_url,
  default_report_timezone,
  maintenance_mode,
  platform_fee_bps,
  updated_by,
  updated_at
`;

export function buildPlatformSettingsUpdatePayload(
  patch: {
    siteName?: string;
    supportEmail?: string | null;
    supportPhone?: string | null;
    termsUrl?: string | null;
    privacyUrl?: string | null;
    defaultReportTimezone?: string;
    maintenanceMode?: boolean;
    platformFeeBps?: number;
  },
  updatedBy: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { updated_by: updatedBy };
  if (patch.siteName !== undefined) out.site_name = patch.siteName;
  if (patch.supportEmail !== undefined) out.support_email = patch.supportEmail;
  if (patch.supportPhone !== undefined) out.support_phone = patch.supportPhone;
  if (patch.termsUrl !== undefined) out.terms_url = patch.termsUrl;
  if (patch.privacyUrl !== undefined) out.privacy_url = patch.privacyUrl;
  if (patch.defaultReportTimezone !== undefined) {
    out.default_report_timezone = patch.defaultReportTimezone;
  }
  if (patch.maintenanceMode !== undefined) out.maintenance_mode = patch.maintenanceMode;
  if (patch.platformFeeBps !== undefined) out.platform_fee_bps = patch.platformFeeBps;
  return out;
}

export { PLATFORM_SETTINGS_ROW_ID };
