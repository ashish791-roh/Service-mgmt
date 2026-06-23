/**
 * middleware.ts  — Next.js Edge Middleware
 *
 * Applied to every request before it reaches a route handler.
 *
 * SECURITY responsibilities:
 *  1. Security headers on every response (CSP, HSTS, X-Frame-Options, …)
 *  2. Unauthenticated redirect — API routes return 401, page routes redirect
 *     to the login page, without touching the database (cookie presence check
 *     only — full validation happens inside each route handler).
 *  3. Clickjacking protection via X-Frame-Options + CSP frame-ancestors.
 *  4. Referrer policy to prevent leaking internal URLs.
 *
 * NOTE: This file must live at the project root (next to package.json),
 * NOT inside src/, for Next.js to pick it up automatically.
 * If your project uses a src/ layout with `rootDir: 'src'` set in
 * next.config.ts, place it at src/middleware.ts instead.
 */

import { NextResponse, type NextRequest } from 'next/server';

// ── Config ────────────────────────────────────────────────────────────────────

const SESSION_COOKIE = 'fixhub_session';

// Routes that don't require authentication
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/track',          // public job tracking
  '/api/jobs/',          // job/:id/public sub-routes checked below
];

const PUBLIC_PAGE_PREFIXES = [
  '/track',              // public tracking page
];

// The single login page path
const LOGIN_PATH = '/';

// ── Security headers ──────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';

function buildCsp(): string {
  const directives: Record<string, string> = {
    'default-src':     "'self'",
    'script-src':      isProd ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'",
    'style-src':       "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src':        "'self' https://fonts.gstatic.com",
    'img-src':         "'self' data: blob:",
    'connect-src':     isProd ? "'self'" : "'self' ws: wss:",
    'frame-ancestors': "'none'",
    'base-uri':        "'self'",
    'form-action':     "'self'",
    'object-src':      "'none'",
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v}`)
    .join('; ');
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':           'DENY',
  'X-Content-Type-Options':    'nosniff',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':   buildCsp(),
  ...(isProd ? {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  } : {}),
};

// ── Route classification helpers ──────────────────────────────────────────────

function isPublicRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // Static assets & Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) return true;

  // Public pages
  if (PUBLIC_PAGE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;

  // Public API routes
  if (PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) return true;

  // Job public sub-route: /api/jobs/:id/public
  if (/^\/api\/jobs\/[^/]+\/public/.test(pathname)) return true;

  // The login page itself (GET /)
  if (pathname === LOGIN_PATH) return true;

  return false;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ── Build the response (pass-through for now) ─────────────────────────────
  let response: NextResponse;

  if (!isPublicRoute(request)) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      if (isApiRoute(pathname)) {
        response = NextResponse.json(
          { error: 'Authentication required.' },
          { status: 401 }
        );
      } else {
        // Redirect unauthenticated page requests to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = LOGIN_PATH;
        loginUrl.searchParams.set('redirect', pathname);
        response = NextResponse.redirect(loginUrl);
      }
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  // ── Attach security headers to every response ─────────────────────────────
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Remove server fingerprinting headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};