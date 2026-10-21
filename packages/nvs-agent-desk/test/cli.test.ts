import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (...a: string[]) => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'bin/audit.ts', ...a], { cwd: root, encoding: 'utf8' });

test('pilot CLI: audits the synthetic fixture and names the wasted-spend campaigns as drafts', () => {
  const r = run('fixtures/synthetic-google-ads.csv', '--platform', 'Google Ads', '--start', '2026-09-01', '--end', '2026-09-30', '--currency', '$');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Prospecting: \$450\.00, 0 conversions/);
  assert.match(r.stdout, /Draft change proposals \(not applied\)/);
});

test('pilot CLI: without a date range the score is withheld', () => {
  const r = run('fixtures/synthetic-google-ads.csv', '--platform', 'Google Ads');
  assert.match(r.stdout, /UNSCORED/);
});

test('pilot CLI: no arguments prints usage and exits 2', () => {
  assert.equal(run().status, 2);
});
