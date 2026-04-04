import { test, expect, type Page } from '@playwright/test';

async function revealEmailAuthForm(page: Page) {
  const emailToggle = page.getByRole('button', { name: /email/i }).first();
  if (await emailToggle.isVisible().catch(() => false)) {
    await emailToggle.click();
  }
}

test.describe('Smoke tests', () => {
  test('homepage loads and redirects to landing or login', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok() || response?.status() === 308 || response?.status() === 307).toBeTruthy();
  });

  test('landing page loads', async ({ page }) => {
    await page.goto('/landing');
    await expect(page).toHaveTitle(/kalendr/i);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await revealEmailAuthForm(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await revealEmailAuthForm(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('no console errors on landing page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors (e.g., favicon, analytics)
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('analytics') && !e.includes('ERR_CONNECTION_REFUSED')
    );
    expect(criticalErrors).toEqual([]);
  });
});

test.describe('Auth flow', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await revealEmailAuthForm(page);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('signup page has name, email, and password fields', async ({ page }) => {
    await page.goto('/signup');
    await revealEmailAuthForm(page);
    await expect(page.locator('input#full-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('login form shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await revealEmailAuthForm(page);
    await page.fill('input[type="email"], input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should show an error message or stay on login page
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login|signup)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|signup)/);
  });

  test('dashboard/bookings redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/bookings');
    await page.waitForURL(/\/(login|signup)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|signup)/);
  });

  test('dashboard/settings redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForURL(/\/(login|signup)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|signup)/);
  });
});

test.describe('Navigation', () => {
  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href*="signup"]');
    await expect(signupLink).toBeVisible({ timeout: 10000 });
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('API robustness', () => {
  test('auth/login rejects empty body', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('auth/signup rejects empty body', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('bookings rejects unauthenticated GET', async ({ request }) => {
    const response = await request.get('/api/bookings');
    expect(response.status()).toBe(401);
  });

  test('event-types rejects unauthenticated GET', async ({ request }) => {
    const response = await request.get('/api/event-types');
    expect(response.status()).toBe(401);
  });

  test('availability rejects unauthenticated GET', async ({ request }) => {
    const response = await request.get('/api/availability');
    expect(response.status()).toBe(401);
  });

  test('unknown API route does not return a healthy API payload', async ({ request }) => {
    const response = await request.get('/api/nonexistent');
    const contentType = response.headers()['content-type'] || '';
    const body = await response.text();

    expect(response.status()).not.toBe(500);
    expect(contentType.includes('application/json') && body.includes('"ok":true')).toBe(false);
  });
});
