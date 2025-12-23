import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Redirect www to non-www
  if (hostname.startsWith('www.')) {
    const nonWwwHostname = hostname.replace(/^www\./, '');
    // Ensure we use https for the redirect
    url.hostname = nonWwwHostname;
    url.protocol = 'https:';
    url.port = '';
    // Create a new URL to avoid any conflicts
    const redirectUrl = new URL(url.pathname + url.search, `https://${nonWwwHostname}`);
    return NextResponse.redirect(redirectUrl, 301); // Permanent redirect
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
     * - images, preview-images, etc. (static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|preview-images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
