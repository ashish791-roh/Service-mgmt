# Quick Start: SLA & Warranty Config Sync

## What Was Fixed?
Admin changes to SLA tiers and warranty configurations now sync to **all staff devices** in real-time.

## What Changed?

### Before ❌
```
Admin Updates Tiers → Saved to localStorage only → Other devices don't know → Inconsistent behavior
```

### After ✅
```
Admin Updates Tiers → Saved to Database + API → Synced to all devices in real-time
```

## Deploy in 3 Steps

### 1️⃣ Update Database
```bash
npm run db:push
```
This creates the new `SLAConfig` and `WarrantyConfig` tables.

### 2️⃣ Initialize Defaults
```bash
npm run db:init-configs
```
This populates default values into the database.

### 3️⃣ Restart App
```bash
npm run build && npm start
```

## How Admins Use It

**Update SLA Tiers:**
1. Open SystemSettingsPage → SLA Configuration tab
2. Edit thresholds
3. Click "Save SLA Tiers"
4. ✓ Toast shows "saved and synced to all devices"

**Update Warranty Config:**
1. Open SystemSettingsPage → Warranty Configuration tab
2. Edit durations
3. Click "Save Warranty Durations"
4. ✓ Toast shows "saved and synced to all devices"

## Staff See Updates

| Device Scenario | When They See It |
|---|---|
| Same tab | Immediately ⚡ |
| Different tab (same browser) | Immediately ⚡ |
| Different device | Next page load/refresh |
| Offline then online | When connection restored |

## What If Something Goes Wrong?

### "Cannot find module '@/lib/prisma'"
- Make sure Prisma is properly generated
- Run: `npm install && npm run postinstall`

### "404 Not Found" on /api/sla-config
- Verify files created in: `src/app/api/sla-config/route.ts`
- Ensure app is rebuilt: `npm run build`

### Database shows no configs
- Run: `npm run db:init-configs`
- Or manually insert via SQL

### Changes don't sync
- Check browser console for errors
- Verify network requests in DevTools Network tab
- Ensure DATABASE_URL is set

## Reference

**New Files:**
- `src/app/api/sla-config/route.ts` — API for SLA tiers
- `src/app/api/warranty-config/route.ts` — API for warranty config
- `scripts/init-configs.ts` — Seed script
- `SLA_WARRANTY_CONFIG_SYNC.md` — Full documentation
- `IMPLEMENTATION_SUMMARY.md` — Technical details

**Modified Files:**
- `prisma/schema.prisma`
- `src/lib/sla.ts`
- `src/lib/warrantyConfig.ts`
- `src/context/AppContext.tsx`
- `src/pages_components/SystemSettingsPage.tsx`
- `package.json`

## Questions?

See `SLA_WARRANTY_CONFIG_SYNC.md` for detailed documentation including:
- How synchronization works
- Security recommendations
- Testing procedures
- Troubleshooting guide
- Rollback instructions
