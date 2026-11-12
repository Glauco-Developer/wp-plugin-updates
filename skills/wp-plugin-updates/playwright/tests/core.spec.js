// Site-level checks that apply to any WordPress project: SEO basics, sitemaps, 404, login redirect, static assets.
const { test, expect } = require('@playwright/test');
const { testPages, metaContent, warn, testing } = require('./lib/site');

const pages = testPages();

for (const path of pages) {
  test(`seo basics ${path}`, async ({ page }, info) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect(await metaContent(page, 'meta[property="og:title"]'), 'og:title').not.toBe('');
    if (!(await metaContent(page, 'meta[name="description"]'))) warn(info, 'meta description missing');
    if (!(await metaContent(page, 'meta[name="robots"]'))) warn(info, 'robots meta missing');
  });
}

if (testing.sitemap !== false) {
  for (const prefix of ['', ...(testing.languages || [])]) {
    test(`sitemap ${prefix || '/'}`, async ({ request }) => {
      const statuses = [];
      for (const file of ['/sitemap_index.xml', '/wp-sitemap.xml']) {
        const res = await request.get(prefix + file);
        statuses.push(res.status());
        if (res.status() === 200) return;
      }
      expect(statuses, 'no sitemap answered 200').toContain(200);
    });
  }
}

test('404 for an unknown url', async ({ request }) => {
  const res = await request.get(`/nonexistent-${Date.now()}/`);
  expect(res.status()).toBe(404);
});

test('wp-admin redirects to login when logged out', async ({ request }) => {
  const res = await request.get('/wp-admin/', { maxRedirects: 0 });
  expect([301, 302]).toContain(res.status());
});

test('static assets of the home page load', async ({ page }) => {
  const bad = [];
  const origin = new URL(page.context()._options?.baseURL || 'http://x').origin;
  page.on('response', (r) => {
    const type = r.request().resourceType();
    if (['stylesheet', 'script', 'image', 'font'].includes(type) && r.url().startsWith(origin) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('/');
  await page.waitForLoadState('load');
  expect(bad).toEqual([]);
});
