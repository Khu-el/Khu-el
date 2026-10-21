import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseNumber } from '../src/audit/csv.ts';
import { readExport, runChecks, type ExportMeta } from '../src/audit/checks.ts';
import { buildReport, draftChanges, queueDrafts, renderMarkdown } from '../src/audit/report.ts';
import { Ledger, LedgerError } from '../src/core/ledger.ts';

const meta: ExportMeta = { platform: 'Google Ads', currency: '$', window: { start: '2026-09-01', end: '2026-09-30' }, source: 'synthetic fixture' };
const status = (rs: ReturnType<typeof runChecks>, id: string) => rs.find((r) => r.id === id)!.status;

const HEALTHY = `Campaign,Cost,Impr.,Clicks,Conversions,Conv. value
Brand,"1,200.00",20000,2000,80,"9,600"
Search A,800,30000,1500,40,4000
Search B,700,28000,1400,35,3500
Display,300,90000,900,12,900
Total: account,3000,168000,5800,167,18000
`;

test('csv: quotes, thousands separators and CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x,1","he said ""hi"""\r\n'), [['a', 'b'], ['x,1', 'he said "hi"']]);
  assert.equal(parseNumber('$1,234.50'), 1234.5);
  assert.equal(parseNumber('--'), null);
  assert.equal(parseNumber('12%'), 12);
  assert.equal(parseNumber('abc'), null, 'unreadable is null, never 0');
});

test('export reader skips the Total row and keeps blanks as null', () => {
  const { rows } = readExport(HEALTHY);
  assert.equal(rows.length, 4);
  const { rows: r2 } = readExport('Campaign,Cost,Conversions\nA,100,\n');
  assert.equal(r2[0]!.conversions, null);
});

test('a healthy export passes the checks it can run', () => {
  const { rows } = readExport(HEALTHY);
  const rs = runChecks(rows, meta, { targetRoas: 4 });
  assert.equal(status(rs, 'tracking-present'), 'pass');
  assert.equal(status(rs, 'wasted-spend'), 'pass');
  assert.equal(status(rs, 'budget-concentration'), 'pass');
  assert.equal(status(rs, 'roas-floor'), 'pass');
});

test('zero conversions on real spend fails tracking and makes per-campaign waste UNKNOWN, not a campaign failure', () => {
  const { rows } = readExport('Campaign,Cost,Conversions\nA,500,0\nB,400,0\n');
  const rs = runChecks(rows, meta);
  assert.equal(status(rs, 'tracking-present'), 'fail');
  assert.equal(status(rs, 'wasted-spend'), 'unknown');
});

test('real waste is named when tracking is healthy', () => {
  const { rows } = readExport('Campaign,Cost,Conversions\nA,500,20\nB,400,0\nC,10,0\n');
  const rs = runChecks(rows, meta);
  const w = rs.find((r) => r.id === 'wasted-spend')!;
  assert.equal(w.status, 'fail');
  assert.deepEqual(w.findings, ['B: $400.00, 0 conversions']); // C is under the $50 floor
});

test('a missing column yields unknown, and a missing date window yields unknown', () => {
  const { rows } = readExport('Campaign,Cost\nA,500\n');
  const rs = runChecks(rows, { ...meta, window: null });
  assert.equal(status(rs, 'tracking-present'), 'unknown');
  assert.equal(status(rs, 'data-window'), 'unknown');
  assert.equal(status(rs, 'ctr-outlier'), 'unknown');
});

test('roas: no target is n/a; target without value column is unknown', () => {
  const { rows } = readExport('Campaign,Cost,Conversions\nA,500,10\nB,400,5\n');
  assert.equal(status(runChecks(rows, meta), 'roas-floor'), 'not_applicable');
  assert.equal(status(runChecks(rows, meta, { targetRoas: 3 }), 'roas-floor'), 'unknown');
});

test('score is withheld while anything is unknown, and present only when fully measured', () => {
  const { rows } = readExport('Campaign,Cost\nA,500\n');
  const partial = buildReport(meta, runChecks(rows, meta));
  assert.equal(partial.score, null);
  assert.match(renderMarkdown(partial), /UNSCORED/);

  const full = buildReport(meta, runChecks(readExport(HEALTHY).rows, meta, { targetRoas: 4 }));
  assert.equal(full.counts.unknown, 0, JSON.stringify(full.results.filter((r) => r.status === 'unknown')));
  assert.equal(typeof full.score, 'number');
});

test('drafted changes queue as consequential ledger actions that cannot execute', async () => {
  const { rows } = readExport('Campaign,Cost,Conversions\nA,500,20\nB,400,0\n');
  const report = buildReport(meta, runChecks(rows, meta));
  const drafts = draftChanges(report);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]!.campaign, 'B');

  const ledger = new Ledger({ humanApprovers: ['chief-ransom'] });
  const ctx = { entity: 'NTE Virtual Solutions', lane: 'NVS_DELIVERY' as const, tenant: 'demo-client', sourceOfTruth: 'export', owner: 'Chief Ransom', confidentiality: 'CONFIDENTIAL' as const };
  const [q] = queueDrafts(ledger, ctx, { kind: 'agent', id: 'auditor' }, drafts);
  assert.equal(q!.class, 'CONSEQUENTIAL');
  ledger.approve(q!.id, { kind: 'human', id: 'chief-ransom' }, q!.payloadHash);
  await assert.rejects(ledger.execute(q!.id, { kind: 'human', id: 'chief-ransom' }), (e: unknown) => e instanceof LedgerError && e.code === 'no_executor');
});
