import { test, expect } from '@playwright/test';

test.describe('Sidebar navigation', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'Nav',
    lastName: 'Test',
    email: `nav.test.${timestamp}@example.com`,
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

  const pages = [
    { label: 'Dashboard', url: '/dashboard', heading: 'Dashboard' },
    { label: 'Assets', url: '/assets', heading: 'Assets' },
    { label: 'Users', url: '/users', heading: 'Users' },
    { label: 'Organisation', url: '/departments', heading: 'Organisation' },
    { label: 'Reports', url: '/reports', heading: 'Reports' },
    { label: 'Settings', url: '/settings', heading: 'Settings' },
  ];

  for (const nav of pages) {
    test(`navigates to ${nav.label}`, async ({ page }) => {
      await page.click(`nav a:has-text("${nav.label}")`);
      await page.waitForURL(nav.url, { timeout: 10000 });
      await expect(page).toHaveURL(nav.url);
      await expect(page.locator(`h1:has-text("${nav.heading}")`)).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  }
});
