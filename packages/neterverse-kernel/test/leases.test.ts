import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBus, CLAUDE, CODEX } from './helpers.ts';
import { acquireLease, releaseLease, activeLeases, reapExpired } from '../src/leases.ts';
import { readEvents } from '../src/bus.ts';

const req = (over: Partial<Parameters<typeof acquireLease>[1]> = {}) => ({
  task_id: 'tsk_alpha',
  agent: CLAUDE,
  scope: 'kernel refactor',
  resources: ['packages/neterverse-kernel/src/bus.ts'],
  risk_tier: 'R1' as const,
  lane: 'LANE_A' as const,
  ...over,
});

test('a first claim succeeds and shows up as active', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const result = acquireLease(bus.root, req());
  assert.equal(result.ok, true);
  assert.equal(activeLeases(bus.root).length, 1);
});

test('a second agent is denied on an overlapping resource', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  acquireLease(bus.root, req());
  const second = acquireLease(bus.root, req({ task_id: 'tsk_beta', agent: CODEX }));

  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.conflicts.length, 1);
  assert.deepEqual(second.conflicts[0]?.resources, ['packages/neterverse-kernel/src/bus.ts']);
  assert.equal(activeLeases(bus.root).length, 1, 'a denied claim writes no lease');
});

test('a denial is recorded on the event log with the remedy', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  acquireLease(bus.root, req());
  acquireLease(bus.root, req({ task_id: 'tsk_beta', agent: CODEX }));

  const denied = readEvents(bus.root).filter((e) => e.kind === 'LEASE_DENIED');
  assert.equal(denied.length, 1);
  assert.match(denied[0]?.summary ?? '', /non-conflicting work/);
});

test('non-overlapping resources are granted concurrently', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.equal(acquireLease(bus.root, req()).ok, true);
  const other = acquireLease(bus.root, req({
    task_id: 'tsk_beta',
    agent: CODEX,
    resources: ['server/src/routes/records.ts'],
  }));
  assert.equal(other.ok, true);
  assert.equal(activeLeases(bus.root).length, 2);
});

test('the same agent renewing its own task is not a conflict', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.equal(acquireLease(bus.root, req()).ok, true);
  assert.equal(acquireLease(bus.root, req()).ok, true, 'renewal by the same task and agent is allowed');
});

test('an expired lease no longer blocks, and the reclaim is logged', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const start = new Date('2026-09-10T12:00:00Z');
  acquireLease(bus.root, req({ ttl_minutes: 30 }), start);

  const later = new Date('2026-09-10T13:00:00Z');
  assert.equal(activeLeases(bus.root, later).length, 0);

  const taken = acquireLease(bus.root, req({ task_id: 'tsk_beta', agent: CODEX }), later);
  assert.equal(taken.ok, true, 'a dead runtime must not hold a resource forever');

  const expired = readEvents(bus.root).filter((e) => e.kind === 'LEASE_EXPIRED');
  assert.equal(expired.length, 1);
});

test('reapExpired removes nothing while a lease is in force', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const start = new Date('2026-09-10T12:00:00Z');
  acquireLease(bus.root, req({ ttl_minutes: 60 }), start);
  assert.equal(reapExpired(bus.root, new Date('2026-09-10T12:30:00Z')).length, 0);
});

test('releasing frees the resource and logs the release', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const first = acquireLease(bus.root, req());
  assert.equal(first.ok, true);
  if (!first.ok) return;

  assert.equal(releaseLease(bus.root, first.lease.lease_id), true);
  assert.equal(activeLeases(bus.root).length, 0);
  assert.equal(acquireLease(bus.root, req({ task_id: 'tsk_beta', agent: CODEX })).ok, true);
  assert.equal(readEvents(bus.root).filter((e) => e.kind === 'LEASE_RELEASED').length, 1);
});

test('releasing an unknown lease reports false rather than pretending', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  assert.equal(releaseLease(bus.root, 'lease_does_not_exist'), false);
});
