import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeBus, CLAUDE } from './helpers.ts';
import {
  recordObservation,
  readObservation,
  connectorHealth,
  allConnectorHealth,
  publicProjection,
  livePath,
} from '../src/observations.ts';
import { readEvents } from '../src/bus.ts';
import { CONNECTORS, requireConnector } from '../src/connectors.ts';

const ok = (over: Record<string, unknown> = {}) => ({
  connector_id: 'clickup',
  observed_by: CLAUDE,
  outcome: 'OK' as const,
  call: 'workspace hierarchy',
  classification: 'INTERNAL' as const,
  summary: 'Workspace hierarchy returned 3 spaces.',
  ...over,
});

test('an observation is recorded and read back', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const written = recordObservation(bus.root, ok());
  assert.match(written.observation_id, /^obs_/);

  const read = readObservation(bus.root, 'clickup');
  assert.equal(read?.observation_id, written.observation_id);
  assert.ok(existsSync(join(livePath(bus.root), 'clickup.json')));
});

test('recording appends a verification event to the committed log', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  recordObservation(bus.root, ok());
  const events = readEvents(bus.root).filter((e) => e.kind === 'CONNECTION_VERIFIED');
  assert.equal(events.length, 1);
});

test('a failed read logs CONNECTION_FAILED, not success', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  recordObservation(bus.root, ok({ outcome: 'FAILED', summary: 'Call returned 403.', error: '403' }));
  const kinds = readEvents(bus.root).map((e) => e.kind);
  assert.ok(kinds.includes('CONNECTION_FAILED'));
  assert.ok(!kinds.includes('CONNECTION_VERIFIED'));
});

test('an undeclared connector is refused rather than given a default budget', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.throws(
    () => recordObservation(bus.root, ok({ connector_id: 'imaginary-service' })),
    /Unknown connector/,
  );
  assert.throws(() => requireConnector('imaginary-service'), /Unknown connector/);
});

test('an invalid observation never reaches disk', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.throws(
    () => recordObservation(bus.root, ok({ outcome: 'PROBABLY_FINE' })),
    /Refusing to record an invalid observation/,
  );
  assert.equal(readObservation(bus.root, 'clickup'), null);
});

test('a connector never looked at reports NEVER_OBSERVED, not healthy', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const health = connectorHealth(bus.root, 'gmail');
  assert.equal(health.freshness, 'NEVER_OBSERVED');
  assert.equal(health.observed_at, null);
  assert.equal(health.age_minutes, null);
});

test('an observation goes stale once past its freshness budget', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const budget = requireConnector('clickup').freshness_minutes;
  const observedAt = new Date('2026-09-11T00:00:00Z');
  recordObservation(bus.root, ok({ observed_at: observedAt.toISOString() }));

  const withinBudget = new Date(observedAt.getTime() + (budget - 1) * 60_000);
  assert.equal(connectorHealth(bus.root, 'clickup', withinBudget).freshness, 'FRESH');

  const pastBudget = new Date(observedAt.getTime() + (budget + 1) * 60_000);
  const stale = connectorHealth(bus.root, 'clickup', pastBudget);
  assert.equal(stale.freshness, 'STALE');
  assert.equal(stale.age_minutes, budget + 1);
});

test('a failed observation is never FRESH, however recent', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const at = new Date('2026-09-11T00:00:00Z');
  recordObservation(bus.root, ok({ outcome: 'FAILED', observed_at: at.toISOString(), summary: 'Call failed.' }));

  // One minute old, and still not healthy: a connector that just told us it is
  // broken is not a connector in good standing.
  const health = connectorHealth(bus.root, 'clickup', new Date(at.getTime() + 60_000));
  assert.equal(health.freshness, 'STALE');
  assert.equal(health.outcome, 'FAILED');
});

test('health covers every declared connector, observed or not', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  recordObservation(bus.root, ok());
  const health = allConnectorHealth(bus.root);
  assert.equal(health.length, CONNECTORS.length);
  assert.equal(health.filter((h) => h.freshness === 'NEVER_OBSERVED').length, CONNECTORS.length - 1);
});

test('the public projection carries no detail and no metrics', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  recordObservation(bus.root, ok({
    metrics: { spaces: 3 },
    detail: { workspace_id: '9010107468', owner: 'owner@example.com' },
  }));

  const serialized = JSON.stringify(publicProjection(bus.root));
  assert.ok(!serialized.includes('9010107468'), 'identifiers must not reach the projection');
  assert.ok(!serialized.includes('owner@example.com'));
  assert.ok(!serialized.includes('spaces'), 'even metrics stay out of committed state');
  assert.ok(serialized.includes('clickup'));
});
