// middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const { pathname, search } = url;
    const hostname = request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto');

  // 301 Redirects from blog subdomain to /blog route
  // Note: WordPress will also handle 301 redirects for individual blog posts
  if (hostname === 'blog.whatthefood.io' || hostname === 'www.blog.whatthefood.io') {
    const newUrl = `https://whatthefood.io/blog${pathname === '/' ? '' : pathname}${search}`;
    return NextResponse.redirect(new URL(newUrl), { status: 301 });
  }

  // Enforce HTTPS and non-www in production
  if (process.env.NODE_ENV === 'production') {
    // 1. Redirect HTTP to HTTPS
    if (proto === 'http') {
      url.protocol = 'https';
      return NextResponse.redirect(url);
    }

    // 2. Redirect www to non-www
    if (hostname.startsWith('www.')) {
      const newHostname = hostname.replace(/^www\./, '');
      const newUrl = `https://${newHostname}${pathname}${search}`;
      return NextResponse.redirect(new URL(newUrl));
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set the cookie in both the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove the cookie from both the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // IMPORTANT: This refreshes the auth token if needed
  // This is what makes PKCE work properly!
  const { data: { user }, error } = await supabase.auth.getUser();

  // Optional: Protect routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/scan');

  if (error || !user) {
    // No valid session
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth';
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // Valid session
    if (isAuthRoute && request.nextUrl.pathname !== '/auth/callback') {
      // Redirect authenticated users away from auth pages
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};