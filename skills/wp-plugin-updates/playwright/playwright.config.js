// Dedicated to the plugin updates. Not related to any other test suite in the repository.
// Usage: PLUGIN_UPDATES_BASE_URL=<url> PLUGIN_UPDATES_MONTH=YYYY-MM npx playwright test
// Before/after snapshot: add PLUGIN_UPDATES_SNAPSHOT=before|after and PLUGIN_UPDATES_ENV=local|staging|production.
//   before -> runs only the snapshot (baseline: facts + screenshots of the key pages, nothing compared)
//   after  -> runs the snapshot comparison plus the whole suite
// Optional Basic Auth (terminal runs only): PLUGIN_UPDATES_BASIC_AUTH_USER / PLUGIN_UPDATES_BASIC_AUTH_PASSWORD from the environment.
const { defineConfig } = require('@playwright/test');

const fs = require('fs');
const path = require('path');
const root = process.env.PLUGIN_UPDATES_PROJECT_DIR;
if (!root) throw new Error('PLUGIN_UPDATES_PROJECT_DIR is not set (path of the WordPress project root)');
process.env.PLUGIN_UPDATES_KIT_DIR = __dirname; // lets project specs require the kit helpers
const projectSpecs = path.join(root, 'plugin-updates', 'playwright-project');
const hasProjectSpecs = fs.existsSync(projectSpecs) && fs.readdirSync(projectSpecs).some((f) => f.endsWith('.spec.js'));

const month = process.env.PLUGIN_UPDATES_MONTH || 'artifacts';
const snapshot = process.env.PLUGIN_UPDATES_SNAPSHOT; // undefined | 'before' | 'after'
const env = process.env.PLUGIN_UPDATES_ENV || 'unknown';
if (snapshot && !['before', 'after'].includes(snapshot)) throw new Error('PLUGIN_UPDATES_SNAPSHOT must be "before" or "after"');

const user = process.env.PLUGIN_UPDATES_BASIC_AUTH_USER;
const pass = process.env.PLUGIN_UPDATES_BASIC_AUTH_PASSWORD;
const baseURL = process.env.PLUGIN_UPDATES_BASE_URL;
const isLocal = env === 'local' || /\.(lndo\.site|ddev\.site|test|local|localhost)(:\d+)?(\/|$)/.test(baseURL || '') || /\/\/(localhost|127\.0\.0\.1)/.test(baseURL || '');

const snapshotProject = { name: 'snapshot', testDir: './snapshot' };
const suiteProjects = [
  { name: 'kit', testDir: './tests' },
  ...(hasProjectSpecs ? [{ name: 'project', testDir: projectSpecs }] : []),
];

module.exports = defineConfig({
  projects: snapshot === 'before' ? [snapshotProject] : snapshot === 'after' ? [snapshotProject, ...suiteProjects] : suiteProjects,
  outputDir: path.join(root, 'plugin-updates', month, 'artifacts', 'playwright'),
  // Screenshots of the before run are the baseline the after run is compared with, one folder per environment.
  snapshotPathTemplate: path.join(root, 'plugin-updates', month, 'artifacts', 'baseline', env, '{arg}{ext}'),
  updateSnapshots: snapshot === 'before' ? 'all' : 'none',
  reporter: [['list'], ['./reporters/summary.js']],
  // Be gentle with the target site (production runs are read-only but still real traffic).
  workers: 2,
  timeout: 90000,
  retries: 1,
  use: {
    baseURL,
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: isLocal,
    httpCredentials: user && pass ? { username: user, password: pass } : undefined,
    screenshot: 'only-on-failure',
  },
});
