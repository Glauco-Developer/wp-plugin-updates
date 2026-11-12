// Writes a compact summary the agent reads instead of the full log:
//   plugin-updates/<month>/artifacts/playwright-summary.json                      (plain runs)
//   plugin-updates/<month>/artifacts/playwright-summary-<env>-<before|after>.json (snapshot runs)
// Labels follow the workflow: Passed, Failed, Warning, Not Run. Pre-existing problems (already there before the deploy)
// are listed apart and never change a test's label.
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-control-regex
const stripAnsi = (t) => t.replace(/\u001b\[[0-9;]*m/g, '');

class Summary {
  constructor() { this.results = new Map(); }
  onTestEnd(test, result) {
    const warnings = test.annotations.filter((a) => a.type === 'warning').map((a) => stripAnsi(a.description));
    const pre = test.annotations.filter((a) => a.type === 'preexisting').map((a) => a.description);
    let status = { passed: 'Passed', skipped: 'Not Run' }[result.status] || 'Failed';
    const error = stripAnsi(result.error?.message || '').split('\n')[0];
    const warned = [...new Set(warnings)].join('; ');
    let notes = result.status === 'passed' || result.status === 'skipped' ? '' : error;
    if (status === 'Passed' && warnings.length) { status = 'Warning'; notes = warned; }
    else if (status === 'Failed' && warnings.length) notes = `${notes} | also: ${warned}`;
    const diffs = result.attachments.filter((a) => a.path && /-(diff|actual)\.png$/.test(a.path)).map((a) => a.path);
    // Retries report the same test again: keep the last attempt only.
    this.results.set(test.id, { test: test.titlePath().slice(1).join(' > '), status, notes, preexisting: [...new Set(pre)], diffs });
  }
  onEnd() {
    const all = [...this.results.values()];
    const count = (s) => all.filter((r) => r.status === s).length;
    const month = process.env.PLUGIN_UPDATES_MONTH || 'artifacts';
    const phase = process.env.PLUGIN_UPDATES_SNAPSHOT;
    const env = process.env.PLUGIN_UPDATES_ENV;
    const name = phase ? `playwright-summary-${env || 'unknown'}-${phase}.json` : 'playwright-summary.json';
    const out = path.join(process.env.PLUGIN_UPDATES_PROJECT_DIR, 'plugin-updates', month, 'artifacts', name);
    const summary = {
      baseUrl: process.env.PLUGIN_UPDATES_BASE_URL,
      environment: env || null,
      snapshot: phase || null,
      totals: { Passed: count('Passed'), Warning: count('Warning'), Failed: count('Failed'), 'Not Run': count('Not Run') },
      results: all.filter((r) => r.status !== 'Passed').map(({ preexisting, ...r }) => r),
      preexisting: all.filter((r) => r.preexisting.length).map((r) => ({ test: r.test, notes: r.preexisting.join('; ') })),
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(summary, null, 2));
    console.log(`Summary: ${JSON.stringify(summary.totals)} -> ${out}`);
  }
}
module.exports = Summary;
