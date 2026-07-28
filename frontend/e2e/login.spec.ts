import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  const timestamp = Date.now();
  const user = {
    firstName: 'Login',
    lastName: 'Test',
    email: `login.test.${timestamp}@example.com`,
    password: 'Password123!',
  };

  test.beforeAll(async ({ request }) => {
    await request.post('http://localhost:6003/api/auth/register', {
      data: user,
      failOnStatusCode: false,
    });
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button:has-text("Sign in")');
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('forgot password form submits and shows success', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Forgot password?');
    await page.waitForURL('/forgot-password', { timeout: 10000 });
    await page.fill('#email', user.email);
    await page.click('button:has-text("Send instructions")');
    await expect(page.locator('text=you will receive password reset instructions')).toBeVisible();
  });
});
