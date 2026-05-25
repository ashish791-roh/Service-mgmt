# Rate Limiting Documentation

## Overview

A lightweight, in-memory rate limiter has been implemented to prevent brute-force attacks and API abuse across your service management application. The system uses IP addresses and user identifiers to track and limit request rates.

## Implementation Details

### Files Modified/Created

- **Created**: `src/lib/rateLimit.ts` - Core rate limiting utility
- **Modified**: `src/app/api/auth/login/route.ts` - Added rate limiting to login
- **Modified**: `src/app/api/users/route.ts` - Added rate limiting to user creation
- **Modified**: `src/app/api/webhooks/route.ts` - Added rate limiting to webhook management
- **Modified**: `src/app/api/payments/route.ts` - Added rate limiting to payment processing

### Rate Limit Configurations

Four pre-configured rate limit profiles are available:

| Profile | Requests | Window | Use Case |
|---------|----------|--------|----------|
| **LOGIN** | 5 | 15 min | Authentication attempts |
| **STRICT** | 10 | 10 min | Sensitive operations (user creation) |
| **MODERATE** | 50 | 5 min | General API endpoints |
| **LENIENT** | 100 | 1 min | Non-critical operations |

### Current Protections

#### 1. Login Endpoint (`/api/auth/login`)
- **IP-based limit**: 5 attempts per 15 minutes per IP address
- **Email-based limit**: 5 attempts per 15 minutes per email address
- **Response**: 429 (Too Many Requests) with `Retry-After` header

#### 2. User Creation (`/api/users`)
- **Rate limit**: 10 requests per 10 minutes per admin user
- **Protection level**: STRICT
- **Response**: 429 (Too Many Requests)

#### 3. Webhook Management (`/api/webhooks`)
- **Rate limit**: 50 requests per 5 minutes per admin user
- **Protection level**: MODERATE
- **Response**: 429 (Too Many Requests)

#### 4. Payment Processing (`/api/payments`)
- **Rate limit**: 50 requests per 5 minutes per user
- **Protection level**: MODERATE
- **Response**: 429 (Too Many Requests)

## How It Works

1. **Identifier Generation**: Each request is tracked using a unique key:
   - Login: `login:ip:{ip}` and `login:email:{email}`
   - Other endpoints: `api:{endpoint}:{userId}`

2. **Timestamp Tracking**: Request timestamps are stored in an in-memory Map
   - Timestamps outside the current window are automatically removed
   - Old entries are cleaned up every minute to prevent memory leaks

3. **Response**: When rate limit is exceeded:
   ```json
   {
     "error": "Too many login attempts. Try again in 487 seconds.",
     "status": 429
   }
   ```
   - `Retry-After` header indicates when to retry (in seconds)

## Adding Rate Limiting to New Endpoints

### Basic Usage

```typescript
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  // Check rate limit
  const limitKey = `api:myendpoint:${auth.user.id}`;
  const limit = rateLimiter.check(limitKey, RATE_LIMITS.MODERATE);

  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': limit.retryAfter.toString() },
      }
    );
  }

  // ... rest of handler
}
```

### Custom Configuration

```typescript
const customLimit = {
  maxRequests: 20,
  windowMs: 10 * 60 * 1000, // 10 minutes
};

const limit = rateLimiter.check(limitKey, customLimit);
```

## Client-Side Handling

When your frontend receives a 429 response:

```typescript
const response = await fetch('/api/endpoint', { method: 'POST', body: data });

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  
  // Implement exponential backoff
  setTimeout(() => {
    // Retry request
  }, retryAfter * 1000);
}
```

## Security Considerations

1. **IP Extraction**: The system extracts client IP from:
   - `x-forwarded-for` header (proxies)
   - `x-real-ip` header
   - `cf-connecting-ip` header (Cloudflare)
   - Falls back to `unknown` if unavailable

2. **Memory Management**: 
   - Cleanup runs every 60 seconds
   - Entries older than 1 hour are automatically removed
   - Global instance prevents duplicate rate limiters

3. **Dual Limits on Login**: 
   - IP-based: Prevents distributed attacks
   - Email-based: Prevents targeted account abuse
   - Both must pass; failure on either blocks request

## Monitoring & Troubleshooting

### Check Rate Limiter Status

The rate limiter logs can be accessed via console:
```typescript
import { rateLimiter } from '@/lib/rateLimit';
// Access store if needed for debugging
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Legitimate users getting blocked | Increase `maxRequests` or `windowMs` |
| Rate limiter not working | Ensure import path is correct in route files |
| Memory leaks | Automatic cleanup runs; monitor in production |

## Future Enhancements

Consider these improvements for production:

1. **Redis Integration**: Replace in-memory store with Redis for:
   - Distributed rate limiting across multiple instances
   - Persistent storage
   - Cross-server coordination

2. **Database Logging**: Track rate limit violations for security audits

3. **Whitelist/Blacklist**: Add IPs or users to bypass limits or force stricter limits

4. **Alert System**: Notify admins when suspicious patterns detected

5. **Configurable Limits**: Move configurations to environment variables

## Example Implementation

For endpoints without authentication (if needed), use IP-only limiting:

```typescript
const clientIP = getClientIP(request);
const limitKey = `api:public:${clientIP}`;
const limit = rateLimiter.check(limitKey, RATE_LIMITS.LENIENT);
```

For admin-heavy operations, use STRICT limits:

```typescript
const limitKey = `api:admin-operation:${auth.user.id}`;
const limit = rateLimiter.check(limitKey, RATE_LIMITS.STRICT);
```
