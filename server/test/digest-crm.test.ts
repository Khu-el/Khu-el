/**
 * The CRM's lines in the self-only attention digest, driven over HTTP against
 * the real app: an overdue or unreadable follow-up and a sensitive-data flag
 * reach the digest; a Do Not Contact record never appears as a follow-up; and
 * one account's contacts never reach another account's digest.
 */
import { configureTestEnv, call, register, startTestServer } from './helpers.ts';

const env = configureTestEnv();

const { test, before, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { createApp } = await import('../dist/app.js');
const { crmFollowUpReason, ownerToday } = await import('../dist/routes/digest.js');

const server = await startTestServer(createApp());
after(async () => {
  await server.close();
  env.cleanup();
});

const contact = (token: string, id: string, data: Record<string, unknown>) =>
  call(server.url, '/api/records', {
    method: 'POST',
    token,
    body: JSON.stringify({
      appId: 'financial-services-crm',
      id,
      type: 'FS_CONTACT',
      authority: { lane: 'UNCLASSIFIED', assertionStatus: 'CURRENT_INTERNAL_MODEL' },
      data: { consentStatus: 'Not Established', operationalLane: 'Unqualified', contactStatus: 'Active', ...data },
    }),
  });

let owner = '';
let other = '';

before(async () => {
  owner = (await register(server.url, 'crm-owner@example.test')).body.token;
  other = (await register(server.url, 'crm-other@example.test')).body.token;
  for (const [id, data] of [
    ['c_overdue', { displayName: 'Overdue Person', nextFollowUp: '2020-01-01' }],
    ['c_unreadable', { displayName: 'Unreadable Person', nextFollowUp: 'next Tuesday' }],
    ['c_future', { displayName: 'Future Person', nextFollowUp: '2999-01-01' }],
    ['c_dnc', { displayName: 'DNC Person', nextFollowUp: '2020-01-01', consentStatus: 'Do Not Contact' }],
    ['c_sensitive', { displayName: 'Sensitive Person', sensitiveDataPresent: true }],
  ] as const) {
    const res = await contact(owner, id, data);
    assert.equal(res.status, 201, JSON.stringify(res.body));
  }
});

describe('CRM items in the digest', () => {
  test('overdue and unreadable follow-ups and sensitive flags are listed', async () => {
    const res = await call(server.url, '/api/digest', { token: owner });
    assert.equal(res.status, 200);
    const byId = new Map<string, string[]>();
    for (const i of res.body.items) byId.set(i.recordId, [...(byId.get(i.recordId) ?? []), i.message]);
    assert.match(byId.get('c_overdue')?.[0] ?? '', /overdue/);
    assert.match(byId.get('c_unreadable')?.[0] ?? '', /cannot be read/);
    assert.match(byId.get('c_sensitive')?.[0] ?? '', /sensitive/);
    assert.equal(byId.has('c_future'), false);
  });

  test('a Do Not Contact record is never presented as a follow-up', async () => {
    const res = await call(server.url, '/api/digest', { token: owner });
    assert.equal(res.body.items.some((i: { recordId: string }) => i.recordId === 'c_dnc'), false);
  });

  test('the CRM is private: another account sees none of these', async () => {
    const digest = await call(server.url, '/api/digest', { token: other });
    assert.deepEqual(digest.body.items, []);
    const list = await call(server.url, '/api/records?appId=financial-services-crm', { token: other });
    assert.deepEqual(list.body.records, []);
  });
});

describe('follow-up date rule', () => {
  test('mirrors the client: only YYYY-MM-DD is a date, and an unreadable one needs attention', () => {
    const today = '2026-09-26';
    assert.equal(crmFollowUpReason('2026-09-25', today), 'overdue');
    assert.equal(crmFollowUpReason('2026-09-26', today), null);
    assert.equal(crmFollowUpReason('9/25/2026', today), 'unreadable');
    assert.equal(crmFollowUpReason('2026-02-30', today), 'unreadable');
    assert.equal(crmFollowUpReason('', today), null);
    assert.equal(crmFollowUpReason(42, today), null);
  });
});

describe("the owner's calendar decides, not the server's clock", () => {
  // 2026-09-27 03:30 UTC is still 2026-09-26 23:30 in New York (UTC-4).
  const SERVER_NOW = Date.parse('2026-09-27T03:30:00Z');

  test('the owner\'s date is used on both sides of their midnight', () => {
    const beforeMidnight = ownerToday('2026-09-26', SERVER_NOW);
    const afterMidnight = ownerToday('2026-09-27', SERVER_NOW);
    assert.equal(crmFollowUpReason('2026-09-26', beforeMidnight), null, 'due today for the owner, not overdue');
    assert.equal(crmFollowUpReason('2026-09-26', afterMidnight), 'overdue');
  });

  test('without a date from the client, the server falls back to UTC', () => {
    assert.equal(ownerToday(undefined, SERVER_NOW), '2026-09-27');
  });

  test('a claimed date more than a day from UTC, or not a real day, is ignored', () => {
    assert.equal(ownerToday('2026-09-29', SERVER_NOW), '2026-09-27');
    assert.equal(ownerToday('2026-09-31', SERVER_NOW), '2026-09-27');
    assert.equal(ownerToday('tomorrow', SERVER_NOW), '2026-09-27');
    assert.equal(ownerToday('2026-09-28', SERVER_NOW), '2026-09-28', 'UTC+14 can be a day ahead');
  });

  test('the digest route honours ?today', async () => {
    const res = await call(server.url, '/api/digest?today=2999-01-01', { token: owner });
    // 2999 is out of range, so the server's own date applies and the far-future follow-up stays out.
    assert.equal(res.body.items.some((i: { recordId: string }) => i.recordId === 'c_future'), false);
  });
});
