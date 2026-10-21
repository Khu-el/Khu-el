import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContextStore, chunkText, toFtsQuery } from '../src/context/store.ts';
import { runScript } from '../src/context/sandbox.ts';

test('chunking keeps paragraphs together and splits oversize ones', () => {
  const c = chunkText('aaa\n\nbbb\n\n' + 'x'.repeat(25), 10);
  assert.deepEqual(c, ['aaa\n\nbbb', 'xxxxxxxxxx', 'xxxxxxxxxx', 'xxxxx']);
});

test('query builder strips FTS syntax so user text cannot break or inject a query', () => {
  assert.equal(toFtsQuery('foo AND "bar" NEAR(baz) *'), '"foo" OR "AND" OR "bar" OR "NEAR" OR "baz"');
  assert.equal(toFtsQuery('  ***  '), null);
});

test('search finds stemmed matches, ranks, and limits what comes back', () => {
  const s = new ContextStore();
  s.index('log', 'server started\n\nrunning health checks every minute\n\ndisk usage normal\n\nerror: connection refused by upstream');
  const hits = s.search('run check');
  assert.equal(hits.length, 1);
  assert.match(hits[0]!.snippet, /«running»|«health»|«checks»|«check»/);
  assert.equal(s.search('connection refused')[0]!.label, 'log');
  assert.deepEqual(s.search('nonexistentterm'), []);
  assert.deepEqual(s.search('!!!'), []);
});

test('re-indexing a label replaces it; purge removes it', () => {
  const s = new ContextStore();
  s.index('a', 'alpha');
  s.index('a', 'beta');
  assert.equal(s.search('alpha').length, 0);
  assert.equal(s.search('beta').length, 1);
  s.purge('a');
  assert.equal(s.search('beta').length, 0);
});

test('stats report bytes the model did not have to read, and NaN before anything is indexed', () => {
  const s = new ContextStore();
  assert.ok(Number.isNaN(s.stats().avoided));
  s.index('big', ('lorem ipsum dolor sit amet\n\n').repeat(500) + 'needle in the haystack');
  s.search('needle', { limit: 1 });
  assert.ok(s.stats().avoided > 0.95);
});

// ---- script runner --------------------------------------------------------------------------------------

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'nvs-fixture-'));
  writeFileSync(join(dir, 'a.txt'), 'one\ntwo\nthree\n');
  writeFileSync(join(dir, 'b.txt'), 'four\nfive\n');
  return dir;
}

test('think-in-code: a script counts lines; only the answer returns, full output is searchable', async () => {
  const dir = fixture();
  const store = new ContextStore();
  const code = `
    import fs from 'node:fs';
    for (const f of fs.readdirSync(${JSON.stringify(dir)})) {
      console.log(f + ': ' + fs.readFileSync(${JSON.stringify(dir)} + '/' + f, 'utf8').split('\\n').filter(Boolean).length + ' lines');
    }`;
  const r = await runScript(code, store, { readDir: dir, label: 'line-counts' });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.match(r.returned, /a\.txt: 3 lines/);
  assert.equal(store.search('b.txt', { label: 'line-counts' }).length, 1);
});

test('large output is capped in what is returned but fully indexed', async () => {
  const dir = fixture();
  const store = new ContextStore();
  const r = await runScript(`for (let i=0;i<3000;i++) console.log('row '+i+' value-'+i)`, store, { readDir: dir, label: 'rows', maxReturnChars: 200 });
  assert.ok(r.returned.length < 400);
  assert.match(r.returned, /more chars indexed as "rows"/);
  const hits = store.search('value-2999', { label: 'rows', limit: 1 });
  assert.equal(hits.length, 1);
  assert.match(hits[0]!.snippet, /«2999»/, 'the rare token should outrank the common one');
});

test('the script cannot read outside readDir, write files, spawn processes, or see the environment', async () => {
  const dir = fixture();
  const sentinel = join(tmpdir(), `nvs-sentinel-${process.pid}`);
  process.env.NVS_SECRET_TEST = 'leak-me';
  const store = new ContextStore();
  const probe = async (body: string) => (await runScript(`try { ${body}; console.log('ALLOWED') } catch (e) { console.log('DENIED ' + e.code) }`, store, { readDir: dir, label: 'p' })).returned.trim();

  assert.equal(await probe(`(await import('node:fs')).readFileSync('/etc/hostname')`), 'DENIED ERR_ACCESS_DENIED');
  assert.equal(await probe(`(await import('node:fs')).writeFileSync(${JSON.stringify(sentinel)}, 'x')`), 'DENIED ERR_ACCESS_DENIED');
  assert.equal(await probe(`(await import('node:child_process')).execSync('id')`), 'DENIED ERR_ACCESS_DENIED');
  assert.equal(existsSync(sentinel), false);
  const env = await runScript(`console.log(JSON.stringify(Object.keys(process.env)))`, store, { readDir: dir, label: 'env' });
  assert.ok(!env.returned.includes('NVS_SECRET_TEST'));
  assert.ok(!env.returned.includes('PATH'));
});

test('a runaway script is killed at the timeout', async () => {
  const r = await runScript(`while(true){}`, new ContextStore(), { readDir: fixture(), label: 'spin', timeoutMs: 300 });
  assert.equal(r.timedOut, true);
  assert.equal(r.exitCode, null);
});

test('a failing script reports its exit code and stderr instead of throwing', async () => {
  const r = await runScript(`throw new Error('nope')`, new ContextStore(), { readDir: fixture(), label: 'bad' });
  assert.notEqual(r.exitCode, 0);
  assert.match(r.stderr, /nope/);
  assert.ok(readFileSync(join(fixture(), 'a.txt'), 'utf8')); // fixture untouched
});
