/**
 * NTE ministry network desk. Records stay on the account that created them,
 * the lane cannot be switched to family or House of Ransom, and nothing here
 * contacts a provider or publishes a campaign.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');
const { applyIntegrationCheck, verifyChain, eventHash } = await import('../dist/network/logic.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

async function tokenFor(email: string) {
  const res = await register(server.url, email);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.token as string, id: res.body.user.id as string };
}

describe('network desk', () => {
  test('requires the bearer header and ignores a query token', async () => {
    const open = await call(server.url, '/api/network/projects');
    assert.equal(open.status, 401);
    const user = await tokenFor('network-query@example.test');
    const smuggled = await call(server.url, `/api/network/projects?token=${user.token}`);
    assert.equal(smuggled.status, 401);
  });

  test('keeps projects on the owning account and refuses other lanes', async () => {
    const a = await tokenFor('network-a@example.test');
    const b = await tokenFor('network-b@example.test');
    const created = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: a.token,
      body: JSON.stringify({ title: 'Ministry brief' }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.project.lane, 'NTE_MINISTRY');
    const hidden = await call(server.url, '/api/network/projects', { token: b.token });
    assert.equal(hidden.status, 200);
    assert.deepEqual(hidden.body.projects, []);
    const family = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: a.token,
      body: JSON.stringify({ title: 'should not store', lane: 'FAMILY' }),
    });
    assert.equal(family.status, 403);
    const house = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: a.token,
      body: JSON.stringify({ title: 'should not store', lane: 'House of Ransom' }),
    });
    assert.equal(house.status, 403);
  });

  test('validates consent and does not overwrite a duplicate lead', async () => {
    const user = await tokenFor('network-leads@example.test');
    const missing = await call(server.url, '/api/network/leads', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ name: 'No Consent', email: 'no-consent@example.test', consent: false, consentText: 'no' }),
    });
    assert.equal(missing.status, 400);
    const lead = {
      name: 'Sample Person',
      email: 'Person@Example.Test',
      phone: '(555) 010-0199',
      consent: true,
      consentText: 'Prototype consent for a fictional lead. No message is sent.',
    };
    const first = await call(server.url, '/api/network/leads', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify(lead),
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.lead.email, 'person@example.test');
    const again = await call(server.url, '/api/network/leads', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ ...lead, name: 'Different' }),
    });
    assert.equal(again.status, 409);
    const listed = await call(server.url, '/api/network/leads', { token: user.token });
    assert.equal(listed.body.leads.length, 1);
    assert.equal(listed.body.leads[0].name, 'Sample Person');
  });

  test('holds release until a human approves the current artifact hash', async () => {
    const user = await tokenFor('network-pipe@example.test');
    const created = await call(server.url, '/api/network/pipeline', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ name: 'Prototype product' }),
    });
    assert.equal(created.status, 201);
    const id = created.body.item.id as string;
    const skip = await call(server.url, `/api/network/pipeline/${id}/advance`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ toStage: 'marketing_handoff' }),
    });
    assert.equal(skip.status, 409);
    const steps: { toStage: string; note?: string }[] = [
      { toStage: 'artifact', note: 'One-page brief artifact' },
      { toStage: 'qa', note: 'QA notes for the prototype' },
      { toStage: 'release_review' },
    ];
    for (const step of steps) {
      const advanced = await call(server.url, `/api/network/pipeline/${id}/advance`, {
        method: 'POST',
        token: user.token,
        body: JSON.stringify(step),
      });
      assert.equal(advanced.status, 200, JSON.stringify(advanced.body));
    }
    const blocked = await call(server.url, `/api/network/pipeline/${id}/advance`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ toStage: 'content_handoff' }),
    });
    assert.equal(blocked.status, 403);
    const proposed = await call(server.url, `/api/network/pipeline/${id}/propose-release`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({}),
    });
    assert.equal(proposed.status, 200);
    assert.equal(proposed.body.executes, false);
    const self = await call(server.url, `/api/network/pipeline/${id}/approve`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ approvalId: proposed.body.approvalId, payloadHash: proposed.body.payloadHash }),
    });
    assert.equal(self.status, 403);
    const sampleShortcut = await call(server.url, `/api/network/pipeline/${id}/approve-sample`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ approvalId: proposed.body.approvalId, payloadHash: proposed.body.payloadHash }),
    });
    assert.equal(sampleShortcut.status, 403);
    const approver = await tokenFor('network-approver@example.test');
    const approved = await call(server.url, `/api/network/pipeline/${id}/approve`, {
      method: 'POST',
      token: approver.token,
      body: JSON.stringify({ approvalId: proposed.body.approvalId, payloadHash: proposed.body.payloadHash }),
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.published, false);
    assert.equal(approved.body.sampleActor, false);
    assert.equal(approved.body.approvedBy, approver.id);
    assert.notEqual(approved.body.approvedBy, user.id);
    const hidden = await call(server.url, '/api/network/projects', { token: approver.token });
    assert.deepEqual(hidden.body.projects, []);
    const missingHandoff = await call(server.url, `/api/network/pipeline/${id}/advance`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ toStage: 'content_handoff' }),
    });
    assert.equal(missingHandoff.status, 400);
    const handed = await call(server.url, `/api/network/pipeline/${id}/advance`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({
        toStage: 'content_handoff',
        handoff: { audience: 'Prototype readers', channel: 'draft page', draft: 'Content handoff text. Not sent.' },
      }),
    });
    assert.equal(handed.status, 200);
    assert.equal(handed.body.item.stage, 'content_handoff');
    assert.equal(handed.body.item.contentHandoff.sent, false);
    assert.equal(handed.body.item.contentHandoff.status, 'draft');
    const marketed = await call(server.url, `/api/network/pipeline/${id}/advance`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({
        toStage: 'marketing_handoff',
        handoff: { audience: 'Prototype list', channel: 'draft calendar', draft: 'Marketing handoff text. Not scheduled.' },
      }),
    });
    assert.equal(marketed.status, 200);
    assert.equal(marketed.body.item.stage, 'marketing_handoff');
    assert.equal(marketed.body.item.marketingHandoff.sent, false);
  });

  test('the labeled sample actor approves a sample item and is not the proposer', async () => {
    const user = await tokenFor('network-sample-gate@example.test');
    const seeded = await call(server.url, '/api/network/samples', { method: 'POST', token: user.token, body: '{}' });
    assert.equal(seeded.status, 201);
    const listed = await call(server.url, '/api/network/pipeline', { token: user.token });
    const item = listed.body.items.find((row: { sample: boolean }) => row.sample);
    assert.ok(item);
    const steps: { toStage: string; note?: string }[] = [
      { toStage: 'artifact', note: 'Sample artifact' },
      { toStage: 'qa', note: 'Sample QA' },
      { toStage: 'release_review' },
    ];
    for (const step of steps) {
      const advanced = await call(server.url, `/api/network/pipeline/${item.id}/advance`, {
        method: 'POST',
        token: user.token,
        body: JSON.stringify(step),
      });
      assert.equal(advanced.status, 200, JSON.stringify(advanced.body));
    }
    const proposed = await call(server.url, `/api/network/pipeline/${item.id}/propose-release`, {
      method: 'POST',
      token: user.token,
      body: '{}',
    });
    const self = await call(server.url, `/api/network/pipeline/${item.id}/approve`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ approvalId: proposed.body.approvalId, payloadHash: proposed.body.payloadHash }),
    });
    assert.equal(self.status, 403);
    const approved = await call(server.url, `/api/network/pipeline/${item.id}/approve-sample`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ approvalId: proposed.body.approvalId, payloadHash: proposed.body.payloadHash }),
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.sampleActor, true);
    assert.equal(approved.body.published, false);
    assert.match(approved.body.approverLabel, /SAMPLE/);
    assert.notEqual(approved.body.approvedBy, user.id);
  });

  test('does not mark an integration verified when nothing was contacted', async () => {
    const user = await tokenFor('network-int@example.test');
    const secret = await call(server.url, '/api/network/integrations/zapier/configure', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ label: 'desk', apiKey: 'should-not-store' }),
    });
    assert.equal(secret.status, 400);
    const configured = await call(server.url, '/api/network/integrations/zapier/configure', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ label: 'local label only' }),
    });
    assert.equal(configured.status, 200);
    assert.equal(configured.body.integration.state, 'configured');
    assert.equal(configured.body.integration.adapter.transport, 'none');
    assert.equal(configured.body.integration.adapter.mountsOutbound, false);
    assert.equal(configured.body.integration.adapter.credentialsAccepted, false);
    const checked = await call(server.url, '/api/network/integrations/zapier/check', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({}),
    });
    assert.equal(checked.status, 200);
    assert.equal(checked.body.integration.contacted, false);
    assert.notEqual(checked.body.integration.state, 'verified');
    assert.equal(checked.body.integration.state, 'configured');
    const health = await call(server.url, '/api/network/health', { token: user.token });
    assert.equal(health.body.outboundAdapters, false);
    assert.equal(health.body.authority.legalStatusVerified, false);
    assert.equal(health.body.ledgerIntact, true);
    assert.ok(health.body.integrations.every((row: { state: string }) => row.state !== 'verified' || row.state === 'configured'));
  });

  test('keeps regulated work and campaigns in draft', async () => {
    const user = await tokenFor('network-queue@example.test');
    const queue = await call(server.url, '/api/network/queues', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ domain: 'debt', title: 'Review a note. Do not collect.' }),
    });
    assert.equal(queue.status, 201);
    assert.equal(queue.body.queue.status, 'draft');
    const act = await call(server.url, `/api/network/queues/${queue.body.queue.id}/act`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({}),
    });
    assert.equal(act.status, 403);
    const published = await call(server.url, '/api/network/campaigns', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ brand: 'NVS', title: 'Week of drafts', scheduledOn: '2026-11-02', status: 'published' }),
    });
    assert.equal(published.status, 403);
    const houseBrand = await call(server.url, '/api/network/assets', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ brand: 'House of Ransom', name: 'no', kind: 'logo' }),
    });
    assert.equal(houseBrand.status, 400);
  });

  test('a read-only auditor cannot write, and samples are labeled', async () => {
    const user = await tokenFor('network-audit@example.test');
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('READ_ONLY_AUDITOR', user.id);
    const denied = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ title: 'no' }),
    });
    assert.equal(denied.status, 403);
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('FAMILY_COUNCIL_MEMBER', user.id);
    const samples = await call(server.url, '/api/network/samples', { method: 'POST', token: user.token, body: '{}' });
    assert.equal(samples.status, 201);
    assert.equal(samples.body.created, true);
    const projects = await call(server.url, '/api/network/projects', { token: user.token });
    assert.equal(projects.body.projects[0].sample, true);
    assert.match(projects.body.projects[0].title, /SAMPLE/);
    const leads = await call(server.url, '/api/network/leads', { token: user.token });
    assert.equal(leads.body.leads[0].email, 'sample.lead@example.test');
    const events = await call(server.url, '/api/network/events', { token: user.token });
    assert.ok(events.body.events.length > 1);
    const intact = verifyChain(
      events.body.events.map((event: { prevHash: string; hash: string; event: string; entityType: string; entityId: string; detail: unknown }) => ({
        prevHash: event.prevHash,
        hash: event.hash,
        body: { event: event.event, entityType: event.entityType, entityId: event.entityId, detail: event.detail },
      })),
    );
    assert.equal(intact, true);
  });

  test('refuses a dependency cycle and an uncontacted probe cannot become verified', () => {
    const untouched = applyIntegrationCheck('unconfigured', { contacted: false, ok: true, detail: 'ignored' });
    assert.equal(untouched.state, 'unconfigured');
    const verified = applyIntegrationCheck('configured', { contacted: true, ok: true, detail: 'live' });
    assert.equal(verified.state, 'verified');
    const first = eventHash('GENESIS', { event: 'a', entityType: 'project', entityId: '1', detail: {} });
    assert.equal(verifyChain([{ prevHash: 'GENESIS', hash: first, body: { event: 'a', entityType: 'project', entityId: '1', detail: {} } }]), true);
    assert.equal(verifyChain([{ prevHash: 'OTHER', hash: first, body: { event: 'a', entityType: 'project', entityId: '1', detail: {} } }]), false);
  });

  test('rejects a task dependency cycle', async () => {
    const user = await tokenFor('network-tasks@example.test');
    const project = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ title: 'Command registry' }),
    });
    const id = project.body.project.id as string;
    const first = await call(server.url, `/api/network/projects/${id}/tasks`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ title: 'First', assignee: 'Operator' }),
    });
    const second = await call(server.url, `/api/network/projects/${id}/tasks`, {
      method: 'POST',
      token: user.token,
      body: JSON.stringify({ title: 'Second', assignee: 'Operator', dependsOn: [first.body.task.id] }),
    });
    assert.equal(second.status, 201);
    const blocked = await call(server.url, `/api/network/tasks/${second.body.task.id}`, {
      method: 'PATCH',
      token: user.token,
      body: JSON.stringify({ status: 'done' }),
    });
    assert.equal(blocked.status, 409);
    const cycle = await call(server.url, `/api/network/tasks/${first.body.task.id}`, {
      method: 'PATCH',
      token: user.token,
      body: JSON.stringify({ dependsOn: [second.body.task.id] }),
    });
    assert.equal(cycle.status, 409);
    const claimed = await call(server.url, `/api/network/tasks/${first.body.task.id}`, {
      method: 'PATCH',
      token: user.token,
      body: JSON.stringify({
        evidence: [{ status: 'VERIFIED', source: 'self', asOf: '2026-10-22' }],
      }),
    });
    assert.equal(claimed.status, 400);
    const recorded = await call(server.url, `/api/network/tasks/${first.body.task.id}`, {
      method: 'PATCH',
      token: user.token,
      body: JSON.stringify({
        assignee: 'Desk operator',
        evidence: [{ status: 'USER_REPORTED', source: 'prototype note', asOf: '2026-10-22', note: 'Not externally verified' }],
      }),
    });
    assert.equal(recorded.status, 200);
    assert.equal(recorded.body.task.assignee, 'Desk operator');
    assert.equal(recorded.body.task.evidence[0].status, 'USER_REPORTED');
  });
});
