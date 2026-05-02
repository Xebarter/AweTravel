import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { UserType } from '@/lib/types';

// Create a Supabase client configured with the Auth cookie
function createSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: request.cookies.toString(),
      },
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes - check authentication
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/passenger') || 
      pathname.startsWith('/transporter') || pathname.startsWith('/admin')) {
    const supabase = createSupabaseClient(request);
    if (!supabase) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get the session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const rolePrefixes: { prefix: string; allowed: UserType }[] = [
      { prefix: '/admin', allowed: 'admin' },
      { prefix: '/transporter', allowed: 'transporter' },
      { prefix: '/passenger', allowed: 'passenger' },
    ];
    const matched = rolePrefixes.find((r) => pathname.startsWith(r.prefix));
    if (matched) {
      const { data: row } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (!row?.user_type || row.user_type !== matched.allowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
