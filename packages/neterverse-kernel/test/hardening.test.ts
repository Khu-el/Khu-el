/**
 * Regression tests for the defects found verifying ho_0001.
 *
 * Each test below reproduces something that used to pass. They are grouped here
 * rather than scattered into the module suites so the next reader can see, in
 * one place, which guarantees were once only claimed - and so a refactor that
 * quietly restores a fail-open path fails loudly instead.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { requiresHumanApproval, mayExecuteUnattended, strictestRisk, riskAtLeast, isRiskTier } from '../src/risk.ts';
import { validate } from '../src/validate.ts';
import { acquireLease, activeLeases, reapExpired } from '../src/leases.ts';
import { auditCommittedState } from '../src/audit.ts';
import { validateAllRegistries, unvalidatedStateFiles, REGISTRY_SCHEMAS } from '../src/registries.ts';
import { appendEvent, readEvents, readEventsDetailed, loadSchema, writeJson } from '../src/bus.ts';
import { makeBus, CLAUDE, CODEX } from './helpers.ts';

// --- the approval boundary ------------------------------------------------

test('the human-only list matches an action however the caller spells it', () => {
  // Each of these used to pass the gate because matching was exact-string.
  for (const action of ['send_email', 'Send', 'sendEmail', 'gmail.send', 'PUBLISH', 'publish_notice']) {
    assert.equal(requiresHumanApproval(action, 'R1'), true, `${action} must reach the gate`);
  }
});

test('the human-only list does not fire on ordinary work', () => {
  // A gate that stops `read_file` is a gate that gets routed around, which
  // costs the boundary just as surely as one that misses `send_email`.
  for (const action of ['read_file', 'write_file', 'sign_in', 'signOut', 'serve_static', 'contract_review', 'list_records', 'purchase_order_review']) {
    assert.equal(requiresHumanApproval(action, 'R1'), false, `${action} must not reach the gate`);
  }
});

test('an unrecognised risk tier fails closed everywhere', () => {
  const bogus = 'R9' as never;

  assert.equal(isRiskTier(bogus), false);
  assert.equal(riskAtLeast(bogus, 'R3'), true, 'an unplaceable tier is treated as at least as dangerous');
  assert.equal(requiresHumanApproval('anything', bogus), true, 'it reaches the gate');
  assert.equal(mayExecuteUnattended(bogus, 'R4'), false, 'it never runs unattended');
  assert.equal(mayExecuteUnattended('R1', bogus), false, 'nor against an unplaceable ceiling');
  assert.equal(strictestRisk(bogus, 'R0'), 'R4', 'classification rounds up, never down');
});

test('the tiers that were already right stay right', () => {
  assert.equal(requiresHumanApproval('read_file', 'R3'), true);
  assert.equal(requiresHumanApproval('read_file', 'R0'), false);
  assert.equal(mayExecuteUnattended('R2', 'R2'), true);
  assert.equal(mayExecuteUnattended('R3', 'R4'), false);
  assert.equal(strictestRisk('R0', 'R2', 'R1'), 'R2');
});

// --- the validator --------------------------------------------------------

test('format: date-time rejects a well-shaped date that is not a date', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  const schema = loadSchema(bus.root, 'lease');

  const lease = {
    lease_id: 'lease_x',
    task_id: 'tsk_0001',
    agent: CODEX,
    scope: 'kernel',
    resources: ['packages/neterverse-kernel'],
    start_time: '2026-09-21T00:00:00Z',
    expiration: '2026-13-45T99:99:99Z',
    risk_tier: 'R1',
  };

  assert.equal(validate(lease, schema).valid, false, 'month 13 day 45 hour 99 is not an instant');
  assert.equal(validate({ ...lease, expiration: '2026-09-21T10:00:00Z' }, schema).valid, true);
});

test('an unsupported keyword is reported even on a property the instance omits', () => {
  // Checking during the instance walk meant the same schema was judged strict
  // for one record and lax for the next.
  const schema = {
    type: 'object',
    properties: { id: { type: 'string' }, size: { type: 'integer', minimum: 3 } },
  };

  assert.equal(validate({ id: 'a', size: 5 }, schema).valid, false, 'reported when present');
  assert.equal(validate({ id: 'a' }, schema).valid, false, 'and still reported when absent');
});

// --- leases ---------------------------------------------------------------

test('a lease whose expiration cannot be parsed counts as expired, not eternal', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  writeJson(join(bus.root, 'locks', 'active-locks.json'), [{
    lease_id: 'lease_corrupt',
    task_id: 'tsk_0001',
    agent: CODEX,
    scope: 'kernel',
    resources: ['packages/neterverse-kernel'],
    start_time: '2026-09-21T00:00:00Z',
    expiration: 'not-a-date',
    risk_tier: 'R1',
  }]);

  assert.deepEqual(activeLeases(bus.root), [], 'it does not hold the resource');
  assert.equal(reapExpired(bus.root).length, 1, 'and it is reclaimed');

  const result = acquireLease(bus.root, {
    task_id: 'tsk_0002', agent: CLAUDE, scope: 'kernel',
    resources: ['packages/neterverse-kernel'], risk_tier: 'R1',
  });
  assert.equal(result.ok, true, 'so the resource is claimable again');
});

test('two runtimes sharing an instance id do not inherit each other\'s lease', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  const resources = ['packages/neterverse-kernel'];

  const first = acquireLease(bus.root, {
    task_id: 'tsk_0002', agent: { runtime: 'CLAUDE_CODE', instance_id: 'worker-1' },
    scope: 'kernel', resources, risk_tier: 'R1',
  });
  assert.equal(first.ok, true);

  const second = acquireLease(bus.root, {
    task_id: 'tsk_0002', agent: { runtime: 'CODEX', instance_id: 'worker-1' },
    scope: 'kernel', resources, risk_tier: 'R1',
  });
  assert.equal(second.ok, false, 'a different runtime is a different claimant');
});

test('the same runtime and instance may still renew its own lease', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  const request = {
    task_id: 'tsk_0002', agent: CODEX, scope: 'kernel',
    resources: ['packages/neterverse-kernel'], risk_tier: 'R1' as const,
  };

  assert.equal(acquireLease(bus.root, request).ok, true);
  assert.equal(acquireLease(bus.root, request).ok, true, 'renewal is not a conflict');
});

// --- the committed-state audit --------------------------------------------

const DRIVE_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

function place(root: string, relativePath: string, body: string) {
  const full = join(root, relativePath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body, 'utf8');
}

test('the audit scans every directory git publishes, not a hand-kept list', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  // evidence/ and locks/ are tracked by git and were both outside the old list.
  place(bus.root, 'evidence/test-results/run.json', JSON.stringify({ file_id: DRIVE_ID }));
  place(bus.root, 'locks/active-locks.json', JSON.stringify({ file_id: DRIVE_ID }));
  place(bus.root, 'NOTES.md', `see ${DRIVE_ID}`);

  const flagged = new Set(auditCommittedState(bus.root).map((f) => f.file));
  assert.ok(flagged.has(join('evidence', 'test-results', 'run.json')));
  assert.ok(flagged.has(join('locks', 'active-locks.json')));
  assert.ok(flagged.has('NOTES.md'));
});

test('the audit never scans the ignored live directory', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  place(bus.root, 'live/observation.json', JSON.stringify({ file_id: DRIVE_ID }));

  assert.deepEqual(auditCommittedState(bus.root), [], 'live/ is where identifiers are allowed to be');
});

test('a filename carrying an identifier is caught, not only the contents', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  place(bus.root, `state/drive-${DRIVE_ID}.json`, '{}');

  const findings = auditCommittedState(bus.root);
  assert.ok(findings.length > 0, 'the identifier in the path is reported');
  assert.ok(findings.every((f) => f.line === 0), 'line 0 means the path itself, not a line of content');
});

test('a Drive identifier broken up by separators no longer slips through', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  // Each segment is short enough that the unsegmented rule never saw it.
  place(bus.root, 'state/leak.json', JSON.stringify({ file_id: '1XyZ-aBcDeFg-HiJkLmN-oPqRsTuV-wXyZ0123' }));

  assert.equal(auditCommittedState(bus.root).length, 1);
});

test('our own hyphenated names stay quiet', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  place(bus.root, 'state/ours.json', JSON.stringify({
    decision: 'ADR-0002-connecting-to-systems-of-record',
    instance_id: 'claude-code-init-2026-09-10',
    correlation_id: 'nterverse_init_2026_09_10',
    commit: 'ede1e2fc5b0871810b8eab802f21afd7df291197',
    attribution: 'noreply@anthropic.com',
  }));

  assert.deepEqual(auditCommittedState(bus.root), []);
});

// --- registry coverage ----------------------------------------------------

test('a registry file that has gone missing is reported, not counted as clean', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  writeJson(join(bus.root, 'state', 'connector-registry.json'), { entries: [] });
  writeJson(join(bus.root, 'state', 'capability-registry.json'), { entries: [] });
  writeJson(join(bus.root, 'state', 'agent-registry.json'), { entries: [] });
  assert.deepEqual(validateAllRegistries(bus.root), []);

  rmSync(join(bus.root, 'state', 'agent-registry.json'));
  const problems = validateAllRegistries(bus.root);
  assert.equal(problems.length, 1);
  assert.equal(problems[0]?.kind, 'FILE_MISSING');
});

test('state files with no schema are named rather than passed over in silence', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  writeJson(join(bus.root, 'state', 'ecosystem-state.json'), { anything: true });

  assert.deepEqual(unvalidatedStateFiles(bus.root), ['ecosystem-state']);
  assert.ok(!('ecosystem-state' in REGISTRY_SCHEMAS), 'and it genuinely has no schema');
});

// --- the append-only log --------------------------------------------------

test('the log stamps its own time and id, so a caller cannot backdate history', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const forged = {
    kind: 'APPROVAL_GRANTED', actor: CODEX, lane: 'LANE_A', risk_tier: 'R0',
    subject: 'gate', summary: 'Backdated.',
    // These are not part of the accepted input and must not survive.
    event_id: 'evt_forged', timestamp: '1999-01-01T00:00:00Z',
  } as never;

  const written = appendEvent(bus.root, forged);
  assert.notEqual(written.event_id, 'evt_forged');
  assert.notEqual(written.timestamp, '1999-01-01T00:00:00Z');
  assert.ok(new Date(written.timestamp).getTime() > Date.parse('2026-01-01T00:00:00Z'));
});

test('a damaged line is counted and skipped rather than taking the log down', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const good = appendEvent(bus.root, {
    kind: 'TEST_PASSED', actor: CLAUDE, lane: 'LANE_A', risk_tier: 'R0',
    subject: 'kernel', summary: 'Suite green.',
  });

  const log = join(bus.root, 'events', 'events.jsonl');
  writeFileSync(log, `${JSON.stringify(good)}\n{"half-written":\n`, 'utf8');

  const { events, unreadableLines } = readEventsDetailed(bus.root);
  assert.equal(events.length, 1, 'the intact record survives');
  assert.deepEqual(unreadableLines, [2], 'and the damage is reported, not hidden');
  assert.equal(readEvents(bus.root).length, 1);
});
