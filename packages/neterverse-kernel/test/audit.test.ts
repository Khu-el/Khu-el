import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeBus } from './helpers.ts';
import { auditCommittedState } from '../src/audit.ts';

function writeState(root: string, name: string, body: string): void {
  mkdirSync(join(root, 'state'), { recursive: true });
  writeFileSync(join(root, 'state', name), body, 'utf8');
}

test('a clean bus produces no findings', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  assert.deepEqual(auditCommittedState(bus.root), []);
});

test('the shapes that leaked into the first draft are all caught', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  // These are the real categories removed before the first commit.
  const leaks: Array<[string, string]> = [
    ['calendar address', 'owner@example.com'],
    ['Drive file identifier', '1rjhwO6ks3ry9FzStSxPoDWftXn_WnGtf'],
    ['workspace identifier', '9010107468'],
    ['Notion-style UUID', '1e8d872b-594c-815f-bd07-000228f30f22'],
  ];

  for (const [label, value] of leaks) {
    writeState(bus.root, 'leak.json', JSON.stringify({ note: value }));
    const findings = auditCommittedState(bus.root);
    assert.ok(findings.length > 0, `${label} must be caught`);
  }
});

test('secrets are caught even though they should never reach a file', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  writeState(bus.root, 'leak.json', JSON.stringify({ t: 'ghp_abcdefghij1234567890' }));
  assert.ok(auditCommittedState(bus.root).some((f) => f.rule === 'bearer or API token'));

  writeState(bus.root, 'leak.json', '-----BEGIN RSA PRIVATE KEY-----');
  assert.ok(auditCommittedState(bus.root).some((f) => f.rule === 'private key block'));
});

test('our own identifiers and filenames are not false positives', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  // Every one of these appears in real bus state and must stay quiet, or the
  // rule gets ignored and then protects nothing.
  writeState(bus.root, 'ours.json', JSON.stringify({
    correlation_id: 'nterverse_init_2026_09_10',
    instance_id: 'claude-code-init-2026-09-10',
    event_id: 'evt_mtw5rnxq_qp7abx',
    decision: 'ADR-0001-control-plane-foundation',
    commit: 'ede1e2fc5b0871810b8eab802f21afd7df291197',
    schema: 'neterverse://schemas/event.schema.json',
    attribution: 'noreply@anthropic.com',
  }));

  assert.deepEqual(auditCommittedState(bus.root), []);
});

test('the ignored live directory is never scanned', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  // live/ exists precisely to hold identifying material.
  mkdirSync(join(bus.root, 'live'), { recursive: true });
  writeFileSync(
    join(bus.root, 'live', 'google-drive.json'),
    JSON.stringify({ detail: { fileId: '1rjhwO6ks3ry9FzStSxPoDWftXn_WnGtf', owner: 'owner@example.com' } }),
    'utf8',
  );

  assert.deepEqual(auditCommittedState(bus.root), [], 'live/ is ignored by git and by the audit');
});

test('a finding names the file, line and rule', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  writeState(bus.root, 'leak.json', `{\n  "a": 1,\n  "b": "owner@example.com"\n}`);
  const [finding] = auditCommittedState(bus.root);

  assert.equal(finding?.file, join('state', 'leak.json'));
  assert.equal(finding?.line, 3);
  assert.equal(finding?.rule, 'email address');
});
