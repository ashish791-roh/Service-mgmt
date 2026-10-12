# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lifecycle.spec.ts >> Fixhub Core End-to-End Lifecycle >> should complete the entire user login, navigation, drawer A11y, and logout cycle
- Location: tests\e2e\lifecycle.spec.ts:16:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('tr:has-text("Screen flickering")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('tr:has-text("Screen flickering")').first()

```

```yaml
- alert
- complementary:
  - paragraph: FixHub
  - paragraph: Service Manager
  - navigation:
    - paragraph: Overview
    - button "Dashboard"
    - button "Analytics"
    - button "Reports"
    - paragraph: Operations
    - button "Jobs"
    - button "Assign Jobs"
    - button "Parts Requests"
    - paragraph: Management
    - button "User Management"
    - button "Inventory"
    - button "Sales"
    - button "Billing"
    - paragraph: System
    - button "Notifications"
    - button "Tally Integration"
    - button "System Settings"
    - button "Audit Log"
  - text: A
  - paragraph: Arjun Sharma
  - paragraph: Administrator
  - button "Sign out"
- banner: 🔧 FixHub Jobs System Online
- main:
  - heading "Job Database" [level=1]
  - paragraph: Currently tracking 0 registered jobs
  - button "Customers Panel"
  - button "New Registration"
  - button "All"
  - button "New"
  - button "Assigned"
  - button "In Progress"
  - button "Completed"
  - button "Delivered"
  - combobox:
    - option "All Engineers" [selected]
  - textbox "Search brand, model, customer name..."
  - table:
    - rowgroup:
      - row "ID Client & Device Problem Description Assigned To Status Deadline Status Financials":
        - columnheader
        - columnheader "ID"
        - columnheader "Client & Device"
        - columnheader "Problem Description"
        - columnheader "Assigned To"
        - columnheader "Status"
        - columnheader "Deadline Status"
        - columnheader "Financials"
        - columnheader
    - rowgroup
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Fixhub Core End-to-End Lifecycle', () => {
  4  |   
  5  |   test.beforeAll(async () => {
  6  |     // Reset database to seed state before running tests
  7  |     console.log('[E2E Setup] Resetting database to demo seed data...');
  8  |     const res = await fetch('http://localhost:3001/api/seed', { method: 'POST' });
  9  |     if (!res.ok) {
  10 |       throw new Error(`Database seeding failed: ${res.statusText}`);
  11 |     }
  12 |     const data = await res.json();
  13 |     console.log('[E2E Setup] Seed complete:', data.message);
  14 |   });
  15 | 
  16 |   test('should complete the entire user login, navigation, drawer A11y, and logout cycle', async ({ page }) => {
  17 |     // Set viewport size explicitly to ensure desktop layout is triggered
  18 |     await page.setViewportSize({ width: 1280, height: 800 });
  19 |     // 1. Visit Login Page
  20 |     await page.goto('/');
  21 |     await expect(page).toHaveTitle(/Fixhub/i);
  22 | 
  23 |     // 2. Perform Login as Admin
  24 |     await page.fill('input[placeholder="you@fixhub.com"]', 'admin@fixhub.com');
  25 |     await page.fill('input[placeholder="Enter your password"]', 'admin123');
  26 |     await page.click('button:has-text("Sign In to Workspace")');
  27 | 
  28 |     // 3. Verify Landing on Dashboard
  29 |     // Wait for the sidebar to render, confirming successful login and redirection
  30 |     await page.waitForSelector('aside', { state: 'visible', timeout: 15_000 });
  31 |     await expect(page.locator('aside')).toContainText('Arjun Sharma');
  32 |     await expect(page.locator('aside')).toContainText('Administrator');
  33 | 
  34 |     // 4. Navigate to Jobs Management Page
  35 |     await page.click('aside button:has-text("Jobs")');
  36 |     await page.waitForURL('**/#jobs');
  37 |     
  38 |     // Assert directory table is loaded
  39 |     await expect(page.locator('h1').first()).toContainText('Job Database');
  40 |     
  41 |     // 5. Click on an Existing Job to open the JobDrawer
  42 |     // The seed data has a job with problemDesc "Screen flickering and battery draining fast"
  43 |     const jobRow = page.locator('tr:has-text("Screen flickering")').first();
> 44 |     await expect(jobRow).toBeVisible();
     |                          ^ Error: expect(locator).toBeVisible() failed
  45 |     await jobRow.click();
  46 | 
  47 |     // 6. Assert JobDrawer is open and has dialog accessibility tags
  48 |     const drawer = page.locator('[data-drawer-container]');
  49 |     await expect(drawer).toBeVisible();
  50 |     await expect(drawer).toHaveAttribute('role', 'dialog');
  51 |     await expect(drawer).toHaveAttribute('aria-modal', 'true');
  52 |     await expect(drawer).toContainText('Screen flickering');
  53 | 
  54 |     // 7. Verify accessibility Escape-to-close behavior
  55 |     await page.keyboard.press('Escape');
  56 |     await expect(drawer).not.toBeVisible();
  57 | 
  58 |     // 8. Log Out of application
  59 |     await page.click('aside button:has-text("Sign out")');
  60 |     await page.waitForURL('**/');
  61 |     await expect(page.locator('button:has-text("Sign In to Workspace")')).toBeVisible();
  62 |   });
  63 | 
  64 | });
  65 | 
```