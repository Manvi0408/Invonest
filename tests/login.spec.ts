import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'demo@invonest.ai';
const DEMO_PASSWORD = 'Demo@123';

/** The login page owns its own scroll container rather than relying on <body>. */
const SCROLLER = 'div.fixed.inset-0.overflow-y-auto';

const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

test.describe('Login page — layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders InvoNest branding, Google button, and prefilled demo credentials', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await expect(page.getByText('AI Cash Flow Intelligence')).toBeVisible();
    await expect(page.getByText('Sign in to your finance workspace.')).toBeVisible();

    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByText('Google Workspace accounts only')).toBeVisible();

    await expect(page.getByRole('textbox', { name: 'Company Email' })).toHaveValue(DEMO_EMAIL);
    await expect(page.locator('input[type="password"]')).toHaveValue(DEMO_PASSWORD);
    await expect(page.getByRole('button', { name: 'Login to InvoNest' })).toBeVisible();
  });

  test('background photo is served, not 404', async ({ page }) => {
    const res = await page.request.get('/login-bg.jpg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image');
  });

  test('scroll container fills the viewport exactly — no grey body background showing', async ({ page }) => {
    // Regression guard: `relative min-h-screen` + body{overflow-x:hidden} used to leave
    // a gap at the bottom where the dark <body> background showed through.
    const { height, viewportHeight } = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      return { height: el.getBoundingClientRect().height, viewportHeight: window.innerHeight };
    }, SCROLLER);

    expect(Math.abs(height - viewportHeight)).toBeLessThan(2);
  });

  test('position:fixed is not broken by a transformed ancestor', async ({ page }) => {
    // A transform/filter/will-change on any ancestor would make `fixed` resolve against
    // that element instead of the viewport, reintroducing the gap.
    const culprits = await page.evaluate((sel) => {
      const found: string[] = [];
      let el = (document.querySelector(sel) as HTMLElement)?.parentElement;
      while (el && el !== document.documentElement) {
        const s = getComputedStyle(el);
        if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none') {
          found.push(`${el.tagName}.${el.className}`);
        }
        el = el.parentElement;
      }
      return found;
    }, SCROLLER);

    expect(culprits).toEqual([]);
  });
});

test.describe('Login page — scrolling', () => {
  test('scrolls with a real mouse wheel when the card is taller than the window', async ({ page }) => {
    await page.goto('/login');

    const maxScroll = await page.$eval(SCROLLER, (el) => el.scrollHeight - el.clientHeight);
    test.skip(maxScroll <= 0, 'Card fits this viewport — nothing to scroll.');

    const { width, height } = page.viewportSize()!;
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 600);

    await expect
      .poll(() => page.$eval(SCROLLER, (el) => el.scrollTop), { message: 'wheel should scroll' })
      .toBeGreaterThan(0);

    // The primary action must actually be reachable after scrolling.
    await expect(page.getByRole('button', { name: 'Login to InvoNest' })).toBeInViewport();
  });

  test('scrolls with the wheel while the cursor is over the glass card', async ({ page }) => {
    await page.goto('/login');

    const maxScroll = await page.$eval(SCROLLER, (el) => el.scrollHeight - el.clientHeight);
    test.skip(maxScroll <= 0, 'Card fits this viewport — nothing to scroll.');

    const card = await page.getByRole('heading', { name: 'Welcome back.' }).boundingBox();
    await page.mouse.move(card!.x + card!.width / 2, card!.y + card!.height / 2);
    await page.mouse.wheel(0, 600);

    await expect.poll(() => page.$eval(SCROLLER, (el) => el.scrollTop)).toBeGreaterThan(0);
  });

  test('scrolls with the keyboard', async ({ page }) => {
    await page.goto('/login');

    const maxScroll = await page.$eval(SCROLLER, (el) => el.scrollHeight - el.clientHeight);
    test.skip(maxScroll <= 0, 'Card fits this viewport — nothing to scroll.');

    await page.mouse.click(40, page.viewportSize()!.height / 2); // focus the page, not an input
    await page.keyboard.press('End');

    await expect.poll(() => page.$eval(SCROLLER, (el) => el.scrollTop)).toBeGreaterThan(0);
  });
});

test.describe('Login page — Workspace-only validation', () => {
  for (const domain of PERSONAL_DOMAINS) {
    test(`rejects @${domain} and never calls the API`, async ({ page }) => {
      await page.goto('/login');

      let loginCalled = false;
      await page.route('**/api/auth/login', (route) => {
        loginCalled = true;
        return route.abort();
      });

      await page.getByRole('textbox', { name: 'Company Email' }).fill(`someone@${domain}`);
      await page.getByRole('button', { name: 'Login to InvoNest' }).click();

      await expect(page.getByText('Not a company account.')).toBeVisible();
      await expect(page.getByText(/organization's Google Workspace account/)).toBeVisible();
      expect(loginCalled, 'personal domains must be blocked client-side').toBe(false);
    });
  }

  test('error toast auto-dismisses', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Company Email' }).fill('someone@gmail.com');
    await page.getByRole('button', { name: 'Login to InvoNest' }).click();

    await expect(page.getByText('Not a company account.')).toBeVisible();
    await expect(page.getByText('Not a company account.')).toBeHidden({ timeout: 8_000 });
  });
});

test.describe('Login page — interactions', () => {
  test('password visibility toggles', async ({ page }) => {
    await page.goto('/login');

    const pw = page.locator('input[type="password"]');
    await expect(pw).toHaveValue(DEMO_PASSWORD);

    // The eye button sits inside the password field wrapper.
    await pw.locator('xpath=following-sibling::button').click();
    await expect(page.locator('input[type="text"]').nth(1)).toHaveValue(DEMO_PASSWORD);
  });

  test('demo credentials can be copied', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only here.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/login');

    const demoCard = page.locator('div', { hasText: /^Demo Account/ }).last();
    await demoCard.getByRole('button').first().click();

    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(DEMO_EMAIL);
  });
});

test.describe('Login page — authentication', () => {
  test('valid company credentials redirect to the existing dashboard', async ({ page }) => {
    await page.goto('/login');

    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
    );

    await page.getByRole('button', { name: 'Login to InvoNest' }).click();

    const res = await loginResponse;
    expect(res.status(), 'seeded demo account should authenticate').toBe(201);

    await page.waitForURL('**/dashboard', { timeout: 10_000 });

    // The pre-existing dashboard renders untouched.
    await expect(page.getByText('Financial Command Center')).toBeVisible();
    await expect(page.getByText('Outstanding Revenue')).toBeVisible();

    // A session token was persisted.
    const token = await page.evaluate(() => localStorage.getItem('invonest_token'));
    expect(token).toBeTruthy();
  });

  test('wrong password surfaces an error and stays on /login', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="password"]').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Login to InvoNest' }).click();

    await expect(page.getByText('Login failed')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Google button warns when no OAuth client ID is configured', async ({ page }) => {
    test.skip(
      !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      'A real client ID is configured, so the real Google flow opens instead.',
    );
    await page.goto('/login');

    await page.getByRole('button', { name: /Continue with Google/i }).click();
    await expect(page.getByText(/Google Sign-In not configured/i)).toBeVisible();
  });
});
