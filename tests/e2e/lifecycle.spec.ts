import { test, expect } from '@playwright/test';

test.describe('Fixhub Core End-to-End Lifecycle', () => {
  
  test.beforeAll(async () => {
    // Reset database to seed state before running tests
    console.log('[E2E Setup] Resetting database to demo seed data...');
    const res = await fetch('http://localhost:3001/api/seed', { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Database seeding failed: ${res.statusText}`);
    }
    const data = await res.json();
    console.log('[E2E Setup] Seed complete:', data.message);
  });

  test('should complete the entire user login, navigation, drawer A11y, and logout cycle', async ({ page }) => {
    // Set viewport size explicitly to ensure desktop layout is triggered
    await page.setViewportSize({ width: 1280, height: 800 });
    // 1. Visit Login Page
    await page.goto('/');
    await expect(page).toHaveTitle(/Fixhub/i);

    // 2. Perform Login as Admin
    await page.fill('input[placeholder="you@fixhub.com"]', 'admin@fixhub.com');
    await page.fill('input[placeholder="Enter your password"]', 'admin123');
    await page.click('button:has-text("Sign In to Workspace")');

    // 3. Verify Landing on Dashboard
    // Wait for the sidebar to render, confirming successful login and redirection
    await page.waitForSelector('aside', { state: 'visible', timeout: 15_000 });
    await expect(page.locator('aside')).toContainText('Arjun Sharma');
    await expect(page.locator('aside')).toContainText('Administrator');

    // 4. Navigate to Jobs Management Page
    await page.click('aside button:has-text("Jobs")');
    await page.waitForURL('**/#jobs');
    
    // Assert directory table is loaded
    await expect(page.locator('h1').first()).toContainText('Job Database');
    
    // 5. Click on an Existing Job to open the JobDrawer
    // The seed data has a job with problemDesc "Screen flickering and battery draining fast"
    const jobRow = page.locator('tr:has-text("Screen flickering")').first();
    await expect(jobRow).toBeVisible();
    await jobRow.click();

    // 6. Assert JobDrawer is open and has dialog accessibility tags
    const drawer = page.locator('[data-drawer-container]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer).toContainText('Screen flickering');

    // 7. Verify accessibility Escape-to-close behavior
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // 8. Log Out of application
    await page.click('aside button:has-text("Sign out")');
    await page.waitForURL('**/');
    await expect(page.locator('button:has-text("Sign In to Workspace")')).toBeVisible();
  });

});
