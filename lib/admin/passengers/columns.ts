/** Columns returned by admin passenger list/detail APIs (matches public.users for passengers). */
export const ADMIN_PASSENGER_SELECT =
  'id,email,full_name,user_type,kyc_verified,phone,profile_image,created_at,account_suspended' as const;
