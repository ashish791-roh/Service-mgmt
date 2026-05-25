# SLA Tiers & Warranty Config Sync Fix

## Problem Solved
**Issue:** Admin changes to SLA tiers and warranty configurations stored in localStorage weren't syncing across staff devices. Each device had its own cached copy, so updates made by admins in SystemSettingsPage were never seen by other staff members.

## Solution Overview
This fix moves SLA tiers and warranty configurations from **localStorage-only** to a **database-backed system** with automatic synchronization:

1. **Database Storage** — New Prisma models store configs centrally
2. **API Endpoints** — GET/PUT endpoints for fetching and updating configs
3. **AppContext Sync** — Context loads from API on login and listens for cross-tab changes
4. **Toast Notifications** — Users see "synced to all devices" confirmations
5. **Offline Fallback** — localStorage acts as cache if API is unavailable

## Files Changed

### 1. **Prisma Schema** — `prisma/schema.prisma`
Added two models:
```prisma
model SLAConfig {
  id        String   @id @default("sla-config")
  tiers     Json
  updatedAt DateTime @updatedAt
}

model WarrantyConfig {
  id        String   @id @default("warranty-config")
  entries   Json
  updatedAt DateTime @updatedAt
}
```

### 2. **API Endpoints** — New Files
- **`src/app/api/sla-config/route.ts`** — GET/PUT SLA tiers from database
- **`src/app/api/warranty-config/route.ts`** — GET/PUT warranty entries from database

### 3. **Library Functions** — Updated
- **`src/lib/sla.ts`** — Added `fetchSLATiersFromAPI()` and `saveSLATiersToAPI()`
- **`src/lib/warrantyConfig.ts`** — Added `fetchWarrantyConfigFromAPI()` and `saveWarrantyConfigToAPI()`

### 4. **AppContext** — `src/context/AppContext.tsx`
- Fetch SLA/warranty configs from API on login
- Added `warrantyEntries` state + setter
- Listen to `storage` events for cross-tab synchronization
- Changed `updateSLATiers()` to call API instead of just localStorage

### 5. **SystemSettingsPage** — `src/pages_components/SystemSettingsPage.tsx`
- Import new API functions
- `handleSaveTiers()` now calls `saveSLATiersToAPI()`
- `handleSaveWarranty()` now calls `saveWarrantyConfigToAPI()`
- Toast messages updated: "saved and synced to all devices"

### 6. **Init Script** — `scripts/init-configs.ts`
Seeds default configs into database on first run.

### 7. **Package.json**
Added npm scripts:
```json
"db:migrate": "prisma migrate dev",
"db:push": "prisma db push",
"db:init-configs": "tsx scripts/init-configs.ts"
```

## Deployment Steps

### Step 1: Update Database Schema
```bash
npm run db:push
# or for tracked migrations:
npm run db:migrate -- --name add-sla-warranty-configs
```

### Step 2: Initialize Default Configs
```bash
npm run db:init-configs
```

This creates default SLA tiers and warranty entries in the database.

### Step 3: Redeploy Application
```bash
npm run build
npm start
```

## How It Works

### Admin Updates SLA Tiers
1. Admin opens SystemSettingsPage → SLA Configuration tab
2. Edits tiers and clicks "Save SLA Tiers"
3. `handleSaveTiers()` calls `saveSLATiersToAPI()`
4. API stores in database + returns success
5. Toast shows "saved and synced to all devices"
6. AppContext updates state
7. localStorage is updated as cache

### Other Staff See Updates
**Same Tab/Browser:**
- AppContext state updates → all components re-render

**Other Tabs (Same Browser):**
- Storage event fires (cross-tab sync) → `setSlaTiers()` updates
- Components using `slaTiers` from context re-render

**Other Devices/Sessions:**
- When user navigates or refreshes, AppContext calls `fetchSLATiersFromAPI()`
- Latest configs loaded from database

### Offline Fallback
If API is unavailable:
- `fetchSLATiersFromAPI()` catches error and returns `loadSLATiers()` from localStorage
- Changes still work locally but won't sync to database or other devices until connection restored

## Testing

### Test 1: Same Device, Multiple Tabs
1. Open app in Tab A (logged in as admin)
2. Open app in Tab B (logged in as engineer)
3. In Tab A, update SLA tiers → click Save
4. In Tab B, switch to reports/dashboard that uses SLA data
5. **Expected:** New SLA tiers appear immediately (via storage event)

### Test 2: Different Devices
1. Admin device: Update SLA tiers → Save
2. Engineer device: Refresh page
3. **Expected:** Latest SLA tiers loaded from API

### Test 3: Offline Mode
1. Admin: Update SLA tiers (while offline)
2. **Expected:** Changes saved to localStorage
3. When back online, next page load fetches from API

## Rollback (If Needed)

If you need to revert:
1. Remove SLAConfig and WarrantyConfig models from `schema.prisma`
2. Run: `npm run db:push`
3. Revert the source files from git
4. localStorage will still have cached values as fallback

## Security Note
- These endpoints have no role-based access control yet
- Consider adding admin-only checks:
  ```typescript
  // In route handlers
  if (currentUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  ```

## Monitoring
Check database for config updates:
```sql
SELECT * FROM "SLAConfig";
SELECT * FROM "WarrantyConfig";
```

Watch for sync issues in browser console or server logs.
