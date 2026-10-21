import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger, LedgerError, hashPayload } from '../src/core/ledger.ts';
import type { ActionContext, Actor } from '../src/core/types.ts';

const chief: Actor = { kind: 'human', id: 'chief-ransom' };
const bot: Actor = { kind: 'agent', id: 'drafter' };
const ctx = (over: Partial<ActionContext> = {}): ActionContext => ({
  entity: 'NTE Virtual Solutions',
  lane: 'NVS_DELIVERY',
  tenant: null,
  sourceOfTruth: 'test',
  owner: 'Chief Ransom',
  confidentiality: 'INTERNAL',
  ...over,
});

function make(opts: { now?: () => Date; per?: number; daily?: number } = {}) {
  const l = new Ledger({
    humanApprovers: [chief.id],
    perActionCapCents: opts.per ?? 0,
    dailyCapCents: opts.daily ?? 0,
    now: opts.now,
  });
  const calls: unknown[] = [];
  l.registerExecutor('email.send', { lanes: ['NVS_DELIVERY'], run: async (p) => (calls.push(p), { sent: true }) });
  l.registerExecutor('note.save', { lanes: ['NVS_DELIVERY'], run: async (p) => (calls.push(p), { saved: true }) });
  l.registerExecutor('spend.video', { lanes: ['NVS_DELIVERY'], run: async (p) => (calls.push(p), { ok: 1 }) });
  return { l, calls };
}

const rejects = (p: Promise<unknown> | (() => unknown), code: string) =>
  assert.rejects(async () => (typeof p === 'function' ? p() : p), (e: unknown) => e instanceof LedgerError && e.code === code);

test('a DRAFT action runs without approval and is logged', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'note.save', context: ctx(), payload: { t: 'x' }, actor: bot });
  assert.equal(a.class, 'DRAFT');
  const done = await l.execute(a.id, bot);
  assert.equal(done.status, 'EXECUTED');
  assert.equal(calls.length, 1);
  assert.ok(l.verifyChain());
});

test('email.send is consequential and cannot be downgraded to DRAFT', () => {
  const { l } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { to: 'a@b.co' }, actor: bot });
  assert.equal(a.class, 'CONSEQUENTIAL');
  assert.throws(
    () => l.propose({ kind: 'email.send', class: 'DRAFT', context: ctx(), payload: {}, actor: bot }),
    (e: unknown) => e instanceof LedgerError && e.code === 'class_downgrade',
  );
});

test('anything with a cost is consequential, whatever its kind', () => {
  const { l } = make();
  assert.equal(l.propose({ kind: 'note.save', context: ctx(), payload: {}, actor: bot, costCents: 5 }).class, 'CONSEQUENTIAL');
});

test('a consequential action does not run unapproved', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { to: 'a@b.co' }, actor: bot });
  await rejects(l.execute(a.id, bot), 'state');
  assert.equal(calls.length, 0);
});

test('an agent cannot approve, even one listed as an approver id', async () => {
  const { l } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { n: 1 }, actor: bot });
  assert.throws(() => l.approve(a.id, { kind: 'agent', id: chief.id }, a.payloadHash), (e: unknown) => (e as LedgerError).code === 'not_approver');
  assert.throws(() => l.approve(a.id, { kind: 'human', id: 'stranger' }, a.payloadHash), (e: unknown) => (e as LedgerError).code === 'not_approver');
  assert.equal(l.get(a.id).status, 'PROPOSED');
  assert.equal(l.auditTrail().filter((r) => r.event === 'approval_denied').length, 2);
});

test('approval must name the payload hash that was reviewed', () => {
  const { l } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { n: 1 }, actor: bot });
  assert.throws(() => l.approve(a.id, chief, hashPayload({ n: 2 })), (e: unknown) => (e as LedgerError).code === 'hash_mismatch');
});

test('approve then execute runs once and is idempotent', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { n: 1 }, actor: bot });
  l.approve(a.id, chief, a.payloadHash);
  const r1 = await l.execute(a.id, chief);
  const r2 = await l.execute(a.id, chief);
  assert.equal(r1.status, 'EXECUTED');
  assert.deepEqual(r2.result, { sent: true });
  assert.equal(calls.length, 1, 'second execute must not send again');
});

test('editing the stored payload after approval blocks execution', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: { to: 'client@a.co' }, actor: bot });
  l.approve(a.id, chief, a.payloadHash);
  l.db.prepare(`UPDATE actions SET payload=? WHERE id=?`).run('{"to":"someone-else@evil.co"}', a.id);
  await rejects(l.execute(a.id, chief), 'payload_changed');
  assert.equal(calls.length, 0);
  assert.equal(l.get(a.id).status, 'FAILED');
});

test('an executor is refused outside the lanes it declares', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'note.save', context: ctx({ lane: 'FAMILY' }), payload: {}, actor: bot });
  await rejects(l.execute(a.id, bot), 'lane');
  assert.equal(calls.length, 0);
});

test('UNCLASSIFIED lane and missing owner are refused at proposal', () => {
  const { l } = make();
  assert.throws(() => l.propose({ kind: 'note.save', context: ctx({ lane: 'UNCLASSIFIED' }), payload: {}, actor: bot }), (e: unknown) => (e as LedgerError).code === 'context');
  assert.throws(() => l.propose({ kind: 'note.save', context: ctx({ owner: ' ' }), payload: {}, actor: bot }), (e: unknown) => (e as LedgerError).code === 'context');
});

test('spend is blocked by default and bounded by per-action and daily caps', async () => {
  const { l } = make(); // caps default to zero
  const a = l.propose({ kind: 'spend.video', context: ctx(), payload: {}, actor: bot, costCents: 100 });
  l.approve(a.id, chief, a.payloadHash);
  await rejects(l.execute(a.id, chief), 'cap_action');

  const { l: l2, calls } = make({ per: 500, daily: 800 });
  const ids = [500, 400].map((c) => l2.propose({ kind: 'spend.video', context: ctx(), payload: { c }, actor: bot, costCents: c }));
  for (const i of ids) l2.approve(i.id, chief, i.payloadHash);
  await l2.execute(ids[0]!.id, chief);
  await rejects(l2.execute(ids[1]!.id, chief), 'cap_daily'); // 500 + 400 > 800
  assert.equal(calls.length, 1);
});

test('halt stops execution from any actor and only a human can resume', async () => {
  const { l, calls } = make();
  const a = l.propose({ kind: 'note.save', context: ctx(), payload: {}, actor: bot });
  l.halt(bot, 'anomaly');
  await rejects(l.execute(a.id, bot), 'halted');
  assert.throws(() => l.resume(bot), (e: unknown) => (e as LedgerError).code === 'not_approver');
  l.resume(chief);
  await l.execute(a.id, bot);
  assert.equal(calls.length, 1);
});

test('an expired approval cannot be used', async () => {
  let t = Date.parse('2026-10-21T10:00:00Z');
  const { l, calls } = make({ now: () => new Date(t) });
  const a = l.propose({ kind: 'email.send', context: ctx(), payload: {}, actor: bot });
  l.approve(a.id, chief, a.payloadHash);
  t += 25 * 3600_000;
  await rejects(l.execute(a.id, chief), 'expired');
  assert.equal(calls.length, 0);
});

test('a failing executor marks FAILED and is not retried', async () => {
  const { l } = make();
  let n = 0;
  l.registerExecutor('note.save', { lanes: ['NVS_DELIVERY'], run: async () => (n++, Promise.reject(new Error('boom'))) });
  const a = l.propose({ kind: 'note.save', context: ctx(), payload: {}, actor: bot });
  await rejects(l.execute(a.id, bot), 'executor_failed');
  await rejects(l.execute(a.id, bot), 'state');
  assert.equal(n, 1);
  assert.equal(l.get(a.id).status, 'FAILED');
});

test('tampering with the audit log is detected', async () => {
  const { l } = make();
  const a = l.propose({ kind: 'note.save', context: ctx(), payload: {}, actor: bot });
  await l.execute(a.id, bot);
  assert.ok(l.verifyChain());
  l.db.prepare(`UPDATE audit SET detail='{"edited":true}' WHERE seq=1`).run();
  assert.equal(l.verifyChain(), false);
});
