// Before/after snapshot of the key pages. Read-only: loads pages, never submits, never logs in.
//
//   PLUGIN_UPDATES_SNAPSHOT=before  -> records facts + screenshots of the environment as it is now (the baseline).
//   PLUGIN_UPDATES_SNAPSHOT=after   -> records them again and compares with the baseline.
//   PLUGIN_UPDATES_ENV=local|staging|production keeps one baseline per environment.
//
// Only what got WORSE after the deploy counts against the update. Problems already present in the baseline are
// reported as "pre-existing" so they are never blamed on the plugin updates.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { testPages, testing, warn, preexisting } = require('../tests/lib/site');

const phase = process.env.PLUGIN_UPDATES_SNAPSHOT;
const env = process.env.PLUGIN_UPDATES_ENV || 'unknown';
const month = process.env.PLUGIN_UPDATES_MONTH || 'artifacts';
const baselineDir = path.join(process.env.PLUGIN_UPDATES_PROJECT_DIR, 'plugin-updates', month, 'artifacts', 'baseline', env);
const visual = testing.visual || {};
const visualOn = visual.enabled !== false;

// '/' -> 'home', '/en/about-us/?a=1' -> 'en-about-us-a-1'
const keyOf = (p) => p.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'home';

const SEO_FIELDS = ['title', 'description', 'canonical', 'robots', 'ogTitle'];

async function collect(page, p) {
  const jsErrors = [];
  const badAssets = [];
  page.on('pageerror', (e) => jsErrors.push(e.message.split('\n')[0]));
  page.on('response', (r) => {
    const type = r.request().resourceType();
    if (['stylesheet', 'script', 'image', 'font'].includes(type) && r.status() >= 400) badAssets.push(`${r.status()} ${r.url().split('?')[0]}`);
  });
  const response = await page.goto(p, { waitUntil: 'load' });
  // Scroll once so lazy-loaded images and blocks are in place for the screenshot, then back to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);
  const facts = await page.evaluate(() => {
    const meta = (s) => (document.querySelector(s) || {}).content || '';
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      ogTitle: meta('meta[property="og:title"]'),
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href || '',
      h1: !!document.querySelector('h1'),
      forms: document.querySelectorAll('form').length,
      textLength: document.body ? document.body.innerText.length : 0,
    };
  });
  return { path: p, status: response ? response.status() : 0, ...facts, jsErrors: [...new Set(jsErrors)], badAssets: [...new Set(badAssets)], takenAt: new Date().toISOString() };
}

function compare(before, after, info) {
  const regressions = [];
  const isOk = (s) => s >= 200 && s < 400;
  if (isOk(before.status) && !isOk(after.status)) regressions.push(`HTTP ${before.status} -> ${after.status}`);
  else if (!isOk(before.status) && !isOk(after.status)) preexisting(info, `HTTP ${after.status} (already ${before.status} before the deploy)`);
  else if (!isOk(before.status) && isOk(after.status)) preexisting(info, `HTTP fixed: ${before.status} -> ${after.status}`);

  if (before.h1 && !after.h1) regressions.push('h1 disappeared');
  if (after.forms < before.forms) regressions.push(`forms on the page: ${before.forms} -> ${after.forms}`);
  // A big drop in visible text usually means a block or shortcode stopped rendering.
  if (before.textLength > 500 && after.textLength < before.textLength * 0.6) regressions.push(`visible text dropped ${before.textLength} -> ${after.textLength} characters`);

  const newAssets = after.badAssets.filter((a) => !before.badAssets.includes(a));
  const oldAssets = after.badAssets.filter((a) => before.badAssets.includes(a));
  if (newAssets.length) regressions.push(`new broken assets: ${newAssets.join(' | ')}`);
  if (oldAssets.length) preexisting(info, `broken assets already before: ${oldAssets.join(' | ')}`);

  // JavaScript errors are often third-party: new ones are a Warning, old ones pre-existing.
  const newJs = after.jsErrors.filter((e) => !before.jsErrors.includes(e));
  const oldJs = after.jsErrors.filter((e) => before.jsErrors.includes(e));
  if (newJs.length) warn(info, `new JavaScript errors: ${newJs.join(' | ')}`);
  if (oldJs.length) preexisting(info, `JavaScript errors already before: ${oldJs.join(' | ')}`);

  for (const f of SEO_FIELDS) {
    if (before[f] !== after[f]) warn(info, `SEO ${f} changed: "${before[f]}" -> "${after[f]}"`);
  }
  return regressions;
}

if (phase === 'before' || phase === 'after') {
  for (const p of testPages()) {
    const key = keyOf(p);
    test(`snapshot ${phase} ${env} ${p}`, async ({ page }, info) => {
      const facts = await collect(page, p);
      fs.mkdirSync(baselineDir, { recursive: true });
      fs.writeFileSync(path.join(baselineDir, `${key}.${phase}.json`), JSON.stringify(facts, null, 2));

      let regressions = [];
      if (phase === 'after') {
        const beforeFile = path.join(baselineDir, `${key}.before.json`);
        if (!fs.existsSync(beforeFile)) warn(info, 'no baseline for this page (the before snapshot was not taken), compared nothing');
        else regressions = compare(JSON.parse(fs.readFileSync(beforeFile, 'utf8')), facts, info);
      } else if (facts.status >= 400) {
        // Recorded in the baseline so the after run can tell it was already broken.
        preexisting(info, `HTTP ${facts.status} before the deploy`);
      }

      if (visualOn) {
        const opts = {
          fullPage: visual.fullPage !== false,
          maxDiffPixelRatio: visual.maxDiffPixelRatio ?? 0.02,
          mask: (visual.mask || []).map((s) => page.locator(s)),
          animations: 'disabled',
          timeout: 15000,
        };
        try {
          await expect(page).toHaveScreenshot(`${key}.png`, opts);
        } catch (e) {
          // Keep the useful line ("1234 pixels (ratio 0.05 of all image pixels) are different", or the size mismatch).
          const lines = (e.message || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
          const first = lines.find((l) => /pixels|image \d+px|size/i.test(l)) || lines[0] || 'screenshot differs';
          if (phase === 'after') warn(info, `visual change: ${first.trim()} (diff image in the artifacts)`);
          else warn(info, `could not record the screenshot: ${first.trim()}`);
        }
      }

      expect(regressions, `got worse after the deploy: ${regressions.join('; ')}`).toEqual([]);
    });
  }
}
