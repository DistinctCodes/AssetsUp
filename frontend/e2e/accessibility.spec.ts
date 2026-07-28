import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility audits', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'A11y',
    lastName: 'Test',
    email: `a11y.test.${timestamp}@example.com`,
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
    { name: 'Login', path: '/login', public: true },
    { name: 'Dashboard', path: '/dashboard', public: false },
    { name: 'Asset List', path: '/assets', public: false },
    { name: 'Settings', path: '/settings', public: false },
  ];

  for (const { name, path, public: isPublic } of pages) {
    test(`${name} page has no critical or serious axe violations`, async ({ page }) => {
      if (!isPublic) {
        await page.goto(path);
      } else {
        await page.goto(path);
      }
      await page.waitForLoadState('networkidle');
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const critical = accessibilityScanResults.violations.filter((v) => v.impact === 'critical');
      const serious = accessibilityScanResults.violations.filter((v) => v.impact === 'serious');
      expect(critical).toEqual([]);
      expect(serious).toEqual([]);
    });
  }
});
