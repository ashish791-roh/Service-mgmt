import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function addSecurityHeaders(response: NextResponse, options?: { cache?: boolean }): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  if (!response.headers.has('X-Request-Id')) {
    response.headers.set('X-Request-Id', crypto.randomUUID());
  }

  if (!response.headers.has('Cache-Control')) {
    if (options?.cache) {
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    } else {
      response.headers.set('Cache-Control', 'no-store');
    }
  }

  return response;
}

export function withSecurity(handler: Function): Function {
  return async (...args: any[]) => {
    const response = await handler(...args);
    if (response instanceof NextResponse) {
      addSecurityHeaders(response);
      response.headers.set('X-Request-Id', crypto.randomUUID());
    }
    return response;
  };
}

export function validateContentType(request: NextRequest, expected: string): boolean {
  const contentType = request.headers.get('content-type') ?? '';
  return contentType.includes(expected);
}

export function sanitizeOutput(
  obj: Record<string, any>,
  sensitiveKeys: string[] = ['password', 'token', 'csrfToken', 'sessionToken']
): Record<string, any> {
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key)) {
      delete sanitized[key];
    } else if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key]) && !(sanitized[key] instanceof Date)) {
      sanitized[key] = sanitizeOutput(sanitized[key], sensitiveKeys);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => {
        if (item && typeof item === 'object' && !(item instanceof Date)) {
          return sanitizeOutput(item, sensitiveKeys);
        }
        return item;
      });
    }
  }

  return sanitized;
}
