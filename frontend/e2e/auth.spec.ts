import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'E2E',
    lastName: 'User',
    email: `e2e.user.${timestamp}@example.com`,
    password: 'Password123!',
  };

  test('registers a new user and redirects to dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#firstName', user.firstName);
    await page.fill('#lastName', user.lastName);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button:has-text("Create account")');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('logs out and redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    await page.click('[aria-label="Open user menu"]');
    await page.click('text=Logout');
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });
});
