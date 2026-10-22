/**
 * Revenue rows are drafts. Figures require an evidence link. An empty
 * summary says so instead of reporting zero.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());
const owner = await register(server.url, 'revenue-owner@example.test');
const token: string = owner.body.token;

after(async () => {
  await server.close();
  env.cleanup();
});

function countRows() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM network_revenue').get() as { n: number };
  return row.n;
}

test('an empty summary does not report zero', async () => {
  const summary = await call(server.url, '/api/network/revenue/summary', { token });
  assert.equal(summary.status, 200);
  assert.equal(summary.body.evidence, 'no evidence recorded');
  assert.equal(summary.body.gross, null);
  assert.equal(summary.body.refunds, null);
  assert.equal(summary.body.net, null);
  assert.equal(summary.body.draft, true);
});

test('figures without evidence, estimates, and unbalanced nets are refused', async () => {
  const missing = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({ period: '2026-10', product: 'SAMPLE draft', gross: 10, refunds: 0, net: 10, entityId: 'QVI' }),
  });
  assert.equal(missing.status, 400);
  assert.equal(countRows(), 0);

  const blank = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({ period: '2026-10', product: 'SAMPLE draft', gross: null, refunds: 0, net: 0, evidenceLink: 'file://sample', entityId: 'QVI' }),
  });
  assert.equal(blank.status, 400);
  assert.equal(countRows(), 0);

  const estimate = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({ period: '2026-10', product: 'SAMPLE draft', gross: 10, refunds: 0, net: 10, evidenceLink: 'file://sample', estimate: true, entityId: 'QVI' }),
  });
  assert.equal(estimate.status, 400);

  const unbalanced = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({ period: '2026-10', product: 'SAMPLE draft', gross: 10, refunds: 1, net: 10, evidenceLink: 'file://sample', entityId: 'QVI' }),
  });
  assert.equal(unbalanced.status, 400);
  assert.equal(countRows(), 0);

  const unknown = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({ period: '2026-10', product: 'SAMPLE draft', gross: 10, refunds: 0, net: 10, evidenceLink: 'file://sample', entityId: 'HOR' }),
  });
  assert.equal(unknown.status, 400);
});

test('a recorded row keeps the evidence link and the summary stops saying empty', async () => {
  const created = await call(server.url, '/api/network/revenue', {
    method: 'POST',
    token,
    body: JSON.stringify({
      period: '2026-10',
      product: 'SAMPLE draft product',
      gross: 12.5,
      refunds: 2.5,
      net: 10,
      evidenceLink: 'SAMPLE evidence note, not a live statement',
      entityId: 'QVI',
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.entry.draft, true);
  assert.equal(created.body.entry.recordedBy, owner.body.user.id);
  assert.equal(created.body.entry.formationStatus, 'unformed');
  assert.equal(created.body.entry.net, 10);

  const summary = await call(server.url, '/api/network/revenue/summary?entity=QVI', { token });
  assert.equal(summary.body.evidence, 'recorded');
  assert.equal(summary.body.net, 10);
  assert.notEqual(summary.body.evidence, 'no evidence recorded');

  const events = await call(server.url, '/api/network/events?entity=QVI', { token });
  assert.equal(events.body.events.some((event: { event: string }) => event.event === 'revenue.recorded'), true);
});
