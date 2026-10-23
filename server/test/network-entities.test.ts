/**
 * Desk records carry an entity id. The server filters by it. Unknown ids are
 * refused. Formation is always unformed and cannot be written.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());
const owner = await register(server.url, 'entity-owner@example.test');
const other = await register(server.url, 'entity-other@example.test');
const token: string = owner.body.token;
const otherToken: string = other.body.token;

after(async () => {
  await server.close();
  env.cleanup();
});

test('unknown entities are refused and known ones stay on the owning account', async () => {
  const bad = await call(server.url, '/api/network/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'Nope', entityId: 'HOR' }),
  });
  assert.equal(bad.status, 400);

  const formed = await call(server.url, '/api/network/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'Formed claim', entityId: 'VEI', formationStatus: 'formed' }),
  });
  assert.equal(formed.status, 400);

  const vei = await call(server.url, '/api/network/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'SAMPLE · VEI desk project', entityId: 'VEI' }),
  });
  assert.equal(vei.status, 201);
  assert.equal(vei.body.project.entityId, 'VEI');
  assert.equal(vei.body.project.formationStatus, 'unformed');

  const network = await call(server.url, '/api/network/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'SAMPLE · network bucket' }),
  });
  assert.equal(network.body.project.entityId, 'NETWORK');
  assert.equal(network.body.project.formationStatus, 'unformed');

  const filtered = await call(server.url, '/api/network/projects?entity=VEI', { token });
  assert.equal(filtered.status, 200);
  assert.deepEqual(filtered.body.projects.map((row: { title: string }) => row.title), ['SAMPLE · VEI desk project']);

  const unknownFilter = await call(server.url, '/api/network/projects?entity=TRUST', { token });
  assert.equal(unknownFilter.status, 400);

  const leaked = await call(server.url, '/api/network/projects?entity=VEI', { token: otherToken });
  assert.equal(leaked.status, 200);
  assert.equal(leaked.body.projects.length, 0);

  const lead = await call(server.url, '/api/network/leads', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: 'Sample Entity Lead',
      email: 'entity.lead@example.test',
      phone: '',
      consent: true,
      consentText: 'SAMPLE prototype consent.',
      entityId: 'OPS',
    }),
  });
  assert.equal(lead.status, 201);
  assert.equal(lead.body.lead.entityId, 'OPS');
  assert.equal(lead.body.lead.formationStatus, 'unformed');

  const asset = await call(server.url, '/api/network/assets', {
    method: 'POST',
    token,
    body: JSON.stringify({ brand: 'NVS', name: 'SAMPLE · OPS mark', kind: 'other', entityId: 'OPS' }),
  });
  assert.equal(asset.body.asset.entityId, 'OPS');
  assert.equal(asset.body.asset.formationStatus, 'unformed');

  const events = await call(server.url, '/api/network/events?entity=OPS', { token });
  assert.equal(events.status, 200);
  assert.ok(events.body.events.length >= 2);
  assert.ok(events.body.events.every((event: { orgEntity: string; formationStatus: string }) => event.orgEntity === 'OPS' && event.formationStatus === 'unformed'));
});

test('task and pipeline updates refuse a formation claim', async () => {
  const created = await call(server.url, '/api/network/projects', {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'SAMPLE · formation guard', entityId: 'MFG' }),
  });
  assert.equal(created.status, 201);
  const projectId = created.body.project.id as string;
  const task = await call(server.url, `/api/network/projects/${projectId}/tasks`, {
    method: 'POST',
    token,
    body: JSON.stringify({ title: 'SAMPLE · task', assignee: 'Sample operator' }),
  });
  assert.equal(task.status, 201);
  const formed = await call(server.url, `/api/network/tasks/${task.body.task.id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status: 'queued', formationStatus: 'formed' }),
  });
  assert.equal(formed.status, 400);

  const pipe = await call(server.url, '/api/network/pipeline', {
    method: 'POST',
    token,
    body: JSON.stringify({ name: 'SAMPLE · formation pipeline', entityId: 'MFG' }),
  });
  assert.equal(pipe.status, 201);
  const advanced = await call(server.url, `/api/network/pipeline/${pipe.body.item.id}/advance`, {
    method: 'POST',
    token,
    body: JSON.stringify({ toStage: 'artifact', note: 'SAMPLE note', formed: true }),
  });
  assert.equal(advanced.status, 400);
});
