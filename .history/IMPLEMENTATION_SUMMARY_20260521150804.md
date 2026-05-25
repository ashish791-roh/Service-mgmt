# ✓ SLA Tiers & Warranty Config Sync — Implementation Complete

## Summary
Fixed the issue where SLA tiers and warranty configurations stored in localStorage weren't syncing across staff devices. Changes made by admins now automatically sync to all connected devices through a centralized database system.

## Key Changes

### 1. Database Layer (Prisma)
- Added `SLAConfig` model: stores SLA tiers for all device types
- Added `WarrantyConfig` model: stores warranty durations for all device types
- Both use singleton pattern (id always "sla-config" / "warranty-config")

### 2. API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sla-config` | GET | Fetch SLA tiers from database (fallback to defaults) |
| `/api/sla-config` | PUT | Update SLA tiers in database |
| `/api/warranty-config` | GET | Fetch warranty config from database (fallback to defaults) |
| `/api/warranty-config` | PUT | Update warranty config in database |

### 3. Frontend Sync Mechanism
```
User Updates (SystemSettingsPage)
    ↓
API Call (saveSLATiersToAPI)
    ↓
Database Update
    ↓
API Response
    ↓
localStorage Cache Updated
    ↓
AppContext State Updated
    ↓
Cross-tab Event Fires (storage event)
    ↓
All Tabs Re-render with New Config
```

### 4. Cross-Tab Synchronization
- AppContext listens to browser `storage` events
- When config changes in one tab, automatically synced to all tabs in same browser
- When user navigates/refreshes in any device, fetches latest from API

### 5. Offline Fallback
- localStorage acts as cache for configs
- If API unavailable, falls back to cached version
- Changes persist locally until connectivity restored

## Files Created/Modified

**New Files:**
- `src/app/api/sla-config/route.ts` — SLA config API endpoints
- `src/app/api/warranty-config/route.ts` — Warranty config API endpoints
- `scripts/init-configs.ts` — Seed script for default configs
- `SLA_WARRANTY_CONFIG_SYNC.md` — Detailed documentation

**Modified Files:**
- `prisma/schema.prisma` — Added SLAConfig + WarrantyConfig models
- `src/lib/sla.ts` — Added `fetchSLATiersFromAPI()`, `saveSLATiersToAPI()`
- `src/lib/warrantyConfig.ts` — Added `fetchWarrantyConfigFromAPI()`, `saveWarrantyConfigToAPI()`
- `src/context/AppContext.tsx` — Added warranty state + API sync logic + storage listener
- `src/pages_components/SystemSettingsPage.tsx` — Updated handlers to use API
- `package.json` — Added db scripts

## Deployment

### Prerequisites
- Ensure database is running and accessible
- DATABASE_URL should be set in environment

### Steps
```bash
# 1. Create/migrate database schema
npm run db:push

# 2. Initialize default configs in database
npm run db:init-configs

# 3. Rebuild and restart app
npm run build
npm start
```

### Verification
```bash
# Check that configs were created:
# In your database client:
SELECT * FROM "SLAConfig" WHERE id = 'sla-config';
SELECT * FROM "WarrantyConfig" WHERE id = 'warranty-config';
```

## Usage

### Admin Updates SLA Tiers
1. Open SystemSettingsPage → **SLA Configuration** tab
2. Edit tier thresholds (warning hours, critical hours)
3. Click **"Save SLA Tiers"**
4. See toast: "SLA tiers saved and synced to all devices"

### Admin Updates Warranty Config
1. Open SystemSettingsPage → **Warranty Configuration** tab
2. Edit warranty durations per device type
3. Click **"Save Warranty Durations"**
4. See toast: "Warranty durations saved and synced to all devices"

### Staff See Updates
- **Same tab:** Immediate (context state update)
- **Different tab (same browser):** Immediate (storage event)
- **Different device:** On next page load/refresh
- **Offline:** Changes persist in localStorage until online

## Testing Checklist

- [ ] Admin can update SLA tiers and see success toast
- [ ] Admin can update warranty config and see success toast
- [ ] Open two tabs, update in Tab A, verify Tab B updates immediately
- [ ] Login on different device, refresh, see latest configs
- [ ] Offline: update config, go offline, verify it's in localStorage
- [ ] Online recovery: come back online, page reload fetches fresh from API
- [ ] Network error: update fails gracefully with error toast
- [ ] Defaults load if database is empty (first run)

## Security Recommendations

The current implementation has open write access. Add role-based authorization to API endpoints:

```typescript
// In src/app/api/sla-config/route.ts (PUT method)
import { getUser } from '@/lib/auth'; // your auth helper

export async function PUT(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }
  // ... rest of implementation
}
```

## Monitoring & Debugging

### Check logs
```
# In browser DevTools Console:
- Look for [GET /api/sla-config] or [PUT /api/sla-config] messages
- Check network tab for 200 responses

# In server logs:
- Errors logged as [GET /api/sla-config] or [PUT /api/sla-config]
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "404 Not Found" on /api/sla-config | Routes not defined | Verify files created in correct location |
| Config still says "not synced" | API call failed | Check network tab, server logs |
| Changes don't appear on other tabs | Storage event not fired | Check browser supports storage events |
| App crashes on startup | Prisma schema not synced | Run `npm run db:push` |
| Configs are defaults | init-configs not run | Run `npm run db:init-configs` |

## Rollback

If you need to revert this change:

```bash
# 1. Remove the models from schema.prisma
# 2. Sync schema
npm run db:push

# 3. Revert source files
git checkout src/lib/sla.ts src/lib/warrantyConfig.ts src/context/AppContext.tsx src/pages_components/SystemSettingsPage.tsx

# 4. App will use localStorage fallback automatically
```

---

**Status:** ✅ Ready for deployment  
**Last Updated:** 2026-05-21
