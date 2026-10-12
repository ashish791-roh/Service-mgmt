import { NextResponse, type NextRequest } from 'next/server';
import { checkAccess } from '@/lib/rbac';

const SESSION_COOKIE = 'fixhub_session';
const CSRF_COOKIE = 'fixhub_csrf';
const LOGIN_PATH = '/';

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/session-check',
  '/api/auth/mfa/verify',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/track',
];

const PUBLIC_PAGE_PREFIXES = [
  '/track',
];

const isProd = process.env.NODE_ENV === 'production';

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

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Generate Nonce for CSP
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Safe btoa for Edge runtime
  const nonce = btoa(String.fromCharCode(...array));

  // 2. Classify Route
  const isPublic = isPublicRoute(request);
  const isApi = pathname.startsWith('/api/');

  let response: NextResponse = NextResponse.next();
  let sessionUser: any = null;
  let sessionCsrf: string | null = null;
  let rotatedSession: any = null;

  if (!isPublic) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      if (isApi) {
        response = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      } else {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = LOGIN_PATH;
        loginUrl.searchParams.set('redirect', pathname);
        response = NextResponse.redirect(loginUrl);
      }
    } else {
      // Validate session via local session-check endpoint
      try {
        const checkRes = await fetch(new URL('/api/auth/session-check', request.url), {
          method: 'POST',
          headers: {
            'cookie': request.headers.get('cookie') ?? '',
            'user-agent': request.headers.get('user-agent') ?? '',
            'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
            'x-real-ip': request.headers.get('x-real-ip') ?? '',
          },
        });

        if (!checkRes.ok) {
          throw new Error('Authentication failed');
        }

        const data = await checkRes.json();
        if (data && data.authenticated) {
          sessionUser = data.user;
          sessionCsrf = data.csrfToken;
          rotatedSession = data.rotated;
          
          // Enforce role-based access control (RBAC) at the edge for API routes
          if (isApi) {
            const hasAccess = checkAccess(pathname, request.method, sessionUser.role);
            if (!hasAccess) {
              response = NextResponse.json(
                { error: 'You do not have permission to perform this action.' },
                { status: 403 }
              );
            } else {
              response = NextResponse.next();
            }
          } else {
            response = NextResponse.next();
          }
        } else {
          throw new Error(data?.error ?? 'Invalid session');
        }
      } catch (err) {
        if (isApi) {
          response = NextResponse.json({ error: 'Session expired or invalid.' }, { status: 401 });
        } else {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = LOGIN_PATH;
          loginUrl.searchParams.set('redirect', pathname);
          response = NextResponse.redirect(loginUrl);
        }
        response.cookies.delete(SESSION_COOKIE);
        response.cookies.delete(CSRF_COOKIE);
      }
    }
  }

  // 3. Set custom user headers if session is authenticated
  const newHeaders = new Headers(request.headers);
  if (sessionUser) {
    newHeaders.set('x-user-id', sessionUser.id);
    newHeaders.set('x-user-email', sessionUser.email);
    newHeaders.set('x-user-name', sessionUser.name);
    newHeaders.set('x-user-role', sessionUser.role);
    newHeaders.set('x-user-branch-id', sessionUser.branchId || 'default');
    newHeaders.set('x-user-is-active', sessionUser.isActive ? 'true' : 'false');
    if (sessionCsrf) {
      newHeaders.set('x-csrf-token', sessionCsrf);
    }
  }
  newHeaders.set('x-nonce', nonce);

  // Re-build response to carry updated headers (propagating down to pages/API routes)
  let finalResponse: NextResponse;
  if (response.status === 401 || response.status === 403) {
    finalResponse = response;
  } else {
    finalResponse = NextResponse.next({
      request: {
        headers: newHeaders,
      },
    });
  }

  // Apply rotated session cookies if any
  if (rotatedSession) {
    finalResponse.cookies.set({
      name: SESSION_COOKIE,
      value: rotatedSession.token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    finalResponse.cookies.set({
      name: CSRF_COOKIE,
      value: rotatedSession.csrfToken,
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
  }

  // Clear session if auth failed earlier
  if (response.status === 401 && !isPublic) {
    finalResponse.cookies.delete(SESSION_COOKIE);
    finalResponse.cookies.delete(CSRF_COOKIE);
  }

  // 4. Attach Security Headers (with CSP Nonce)
  const cspDirectives: Record<string, string> = {
    'default-src':     "'self'",
    'script-src':      `'self' 'nonce-${nonce}'` + (isProd ? '' : " 'unsafe-eval'"),
    'style-src':       "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src':        "'self' https://fonts.gstatic.com data:",
    'img-src':         "'self' data: blob:",
    'connect-src':     isProd ? "'self'" : "'self' ws: wss:",
    'frame-ancestors': "'none'",
    'base-uri':        "'self'",
    'form-action':     "'self'",
    'object-src':      "'none'",
  };

  const cspString = Object.entries(cspDirectives)
    .map(([k, v]) => `${k} ${v}`)
    .join('; ');

  finalResponse.headers.set('X-Frame-Options', 'DENY');
  finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
  finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
  finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  finalResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  finalResponse.headers.set('Content-Security-Policy', cspString);
  finalResponse.headers.set('x-nonce', nonce);

  if (isProd) {
    finalResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  finalResponse.headers.delete('X-Powered-By');
  finalResponse.headers.delete('Server');

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};