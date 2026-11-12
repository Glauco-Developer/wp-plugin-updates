// Shared helpers. Everything project-specific comes from plugin-updates/test-config.json, never from the tests.
const path = require('path');
const projectDir = process.env.PLUGIN_UPDATES_PROJECT_DIR;
if (!projectDir) throw new Error('PLUGIN_UPDATES_PROJECT_DIR is not set (path of the WordPress project root)');
const config = require(path.join(projectDir, 'plugin-updates', 'test-config.json'));

const testing = config.testing || {};
const plugins = config.plugins || {};

// '' is the main site; other entries are language/site path prefixes such as '/ga'.
const prefixes = ['', ...(testing.languages || [])];

const hasPlugin = (slug) => Object.prototype.hasOwnProperty.call(plugins, slug);

// Accepts a path ('/about/') or a full URL pasted by the developer ('https://site.com/about/?x=1') and returns the path.
const toPath = (value) => {
  if (!value) return '/';
  if (/^https?:\/\//i.test(value)) {
    const u = new URL(value);
    return (u.pathname || '/') + (u.search || '');
  }
  return value.startsWith('/') ? value : `/${value}`;
};

// Pages configured for a plugin, or the fallback when none are set.
const pluginPages = (slug, fallback = ['/']) => ((plugins[slug] && plugins[slug].pages) || fallback).map(toPath);

// Every path crossed with every language prefix ('/about/' -> '/about/', '/ga/about/').
const withPrefixes = (paths) => paths.flatMap((p) => prefixes.map((x) => x + p));

const allPluginPages = () => Object.values(plugins).flatMap((p) => p.pages || []).map(toPath);

// The site's most important pages, chosen by the developer in Setup (testing.keyPages). Used by smoke, SEO and the before/after snapshot.
const keyPages = () => (testing.keyPages || []).map(toPath);

// Home + plugin pages (with language prefixes) + key pages (taken as given: translated key pages are listed explicitly), de-duplicated.
const testPages = () => [...new Set([...withPrefixes(['/', ...allPluginPages()]), ...keyPages()])];

// Returns '' when the tag is absent (no waiting for it to appear).
const metaContent = (page, selector) => page.evaluate((s) => (document.querySelector(s) || {}).content || '', selector);

// Soft findings: reported as Warning in the summary, never fail the run.
const warn = (info, message) => info.annotations.push({ type: 'warning', description: message });

// Problems that already existed before the deploy: listed in the report, never counted against the update.
const preexisting = (info, message) => info.annotations.push({ type: 'preexisting', description: message });

module.exports = { config, testing, prefixes, hasPlugin, toPath, pluginPages, withPrefixes, allPluginPages, keyPages, testPages, metaContent, warn, preexisting };
