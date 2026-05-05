export { middleware } from '@/lib/middleware';

/**
 * Only run auth middleware on app shells that need it (see AUTH_REQUIRED_PREFIXES in lib/middleware.ts).
 * Add new protected top-level prefixes here and in requiresAuth().
 */
export const config = {
  matcher: [
    '/passenger',
    '/passenger/:path*',
    '/transporter',
    '/transporter/:path*',
    '/admin',
    '/admin/:path*',
  ],
};
