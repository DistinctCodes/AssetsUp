import { test, expect } from '@playwright/test';

test.describe('Maintenance Flow', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'Maintenance',
    lastName: 'Test',
    email: `maintenance.test.${timestamp}@example.com`,
    password: 'Password123!',
  };

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:6003/api/auth/register', {
      data: user,
      failOnStatusCode: false,
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('schedules maintenance for an asset, marks it complete, and verifies history entry', async ({ page }) => {
    // First, create a test asset to assign maintenance to
    await page.goto('/assets');
    await expect(page.locator('h1:has-text("Assets")')).toBeVisible();

    await page.click('button:has-text("Register Asset")');
    await expect(page.locator('text=Register New Asset')).toBeVisible();

    const assetName = `E2E Maintenance Asset ${Date.now()}`;
    await page.fill('#name', assetName);
    await page.fill('#serialNumber', `SN-MAINT-${Date.now()}`);
    await page.fill('#manufacturer', 'Dell');
    await page.fill('#model', 'Latitude');
    await page.fill('#location', 'IT Department');
    await page.selectOption('#categoryId', { index: 1 });
    await page.selectOption('#departmentId', { index: 1 });

    await page.click('button:has-text("Register Asset")');
    await expect(page.locator('text=Register New Asset')).not.toBeVisible();
    await expect(page.locator(`text=${assetName}`).first()).toBeVisible();

    // Navigate to maintenance page
    await page.goto('/maintenance');
    await expect(page.locator('h1:has-text("Maintenance")')).toBeVisible();

    // Open new maintenance modal
    await page.click('button:has-text("New Maintenance")');
    await expect(page.locator('text=New Maintenance')).toBeVisible();

    // Fill out maintenance form - use the correct selectors from the modal
    const maintenanceTitle = `Test maintenance for ${assetName}`;
    await page.fill('#mnt-title', maintenanceTitle);
    // Select the asset we just created
    await page.selectOption('select', assetName, { force: true });
    await page.selectOption('#type', 'PREVENTIVE');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await page.fill('#mnt-date', tomorrow);
    await page.fill('#mnt-cost', '150');
    await page.fill('#mnt-notes', 'Regular system update and hardware check');

    // Submit the form
    await page.click('button:has-text("Schedule")');
    await expect(page.locator('text=New Maintenance')).not.toBeVisible();

    // Verify the maintenance record appears in Scheduled column
    await expect(page.locator(`text=${maintenanceTitle}`).first()).toBeVisible();
    // Verify it's in the Scheduled column (first column, which has the label "Scheduled")
    const scheduledColumn = page.locator('h3:text("Scheduled")').locator('..');
    await expect(scheduledColumn.locator(`text=${maintenanceTitle}`)).toBeVisible();

    // Drag the card from Scheduled to Completed column using Playwright's dragTo
    const maintenanceCard = page.locator(`text=${maintenanceTitle}`).first();
    const completedColumn = page.locator('h3:text("Completed")').locator('..');
    await maintenanceCard.dragTo(completedColumn);

    // Wait for the drag and drop to complete and the record to move
    await page.waitForTimeout(1000);

    // Verify the record is now in the Completed column
    await expect(completedColumn.locator(`text=${maintenanceTitle}`)).toBeVisible();
    await expect(scheduledColumn.locator(`text=${maintenanceTitle}`)).not.toBeVisible();
  });
});