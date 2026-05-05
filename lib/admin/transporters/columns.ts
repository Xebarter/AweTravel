/** Columns returned by admin transporter APIs (keep in sync with route handlers). */
export const ADMIN_TRANSPORTER_SELECT =
  'id, email, full_name, user_type, kyc_verified, phone, created_at, transporter_approval_status, transporter_approved_at, transporter_rejection_reason' as const;
