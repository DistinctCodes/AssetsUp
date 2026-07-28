import { test, expect } from '@playwright/test';

test.describe('Asset CRUD', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'Asset',
    lastName: 'CRUD',
    email: `asset.crud.${timestamp}@example.com`,
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

  test('creates an asset and verifies it in the list', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.locator('h1:has-text("Assets")')).toBeVisible();

    await page.click('button:has-text("Register Asset")');
    await expect(page.locator('text=Register New Asset')).toBeVisible();

    const assetName = `E2E Laptop ${Date.now()}`;
    await page.fill('#name', assetName);
    await page.fill('#serialNumber', `SN-${Date.now()}`);
    await page.fill('#manufacturer', 'Apple');
    await page.fill('#model', 'MacBook Pro');
    await page.fill('#location', 'Floor 2');

    // Category and department selects are populated by API; pick first real option.
    await page.selectOption('#categoryId', { index: 1 });
    await page.selectOption('#departmentId', { index: 1 });

    await page.click('button:has-text("Register Asset")');
    await expect(page.locator('text=Register New Asset')).not.toBeVisible();
    await expect(page.locator(`text=${assetName}`).first()).toBeVisible();
  });

  test('views asset detail, edits asset, and deletes asset with confirmation', async ({ page }) => {
    await page.goto('/assets');
    await page.click('button:has-text("Register Asset")');

    const assetName = `E2E Edit Delete ${Date.now()}`;
    const updatedName = `${assetName} Updated`;
    await page.fill('#name', assetName);
    await page.fill('#serialNumber', `SN-${Date.now()}`);
    await page.selectOption('#categoryId', { index: 1 });
    await page.selectOption('#departmentId', { index: 1 });
    await page.click('button:has-text("Register Asset")');
    await expect(page.locator('text=Register New Asset')).not.toBeVisible();

    await page.click(`text=${assetName}`);
    await page.waitForURL(/\/assets\/[\w-]+/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(assetName);

    await page.click('button:has-text("Edit")');
    await expect(page.locator('text=Edit Asset')).toBeVisible();
    await page.fill('#edit-name', updatedName);
    await page.fill('#edit-location', 'Updated Location');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Edit Asset')).not.toBeVisible();
    await expect(page.locator('h1')).toContainText(updatedName);
    await expect(page.locator('text=Updated Location')).toBeVisible();

    await page.click('button:has-text("Delete")');
    await expect(page.locator('text=Delete Asset')).toBeVisible();
    await page.click('button:has-text("Delete") >> nth=1');
    await page.waitForURL('/assets', { timeout: 10000 });
    await expect(page).toHaveURL('/assets');
  });
});
