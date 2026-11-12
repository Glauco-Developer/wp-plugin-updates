// Generic smoke test: home page, the key pages (testing.keyPages) and every plugin page in plugin-updates/test-config.json, for each configured language prefix.
// Read-only: loads pages, never submits forms. Form submissions are done by the agent with explicit approval.
const { test, expect } = require('@playwright/test');
const { testPages, warn } = require('./lib/site');

const pages = testPages();

for (const path of pages) {
  test(`smoke ${path}`, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response.status(), 'HTTP status').toBe(200);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('h1').first()).toBeVisible();
    // Page JS errors are often third-party or pre-existing: reported as Warning, not a failure.
    if (errors.length) warn(info, `JavaScript errors: ${[...new Set(errors)].join(' | ')}`);
  });
}
