/**
 * Registry import previews before it writes, refuses an unknown entity, and
 * appends ledger events for the rows it keeps.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());
const owner = await register(server.url, 'registry-owner@example.test');
const token: string = owner.body.token;

const systems = [
  'system,area,state,source_of_truth,evidence,next_action',
  'SAMPLE registry system,ministry,draft,local file,DOCUMENT_STATED,Review the row',
].join('\n');

after(async () => {
  await server.close();
  env.cleanup();
});

test('preview writes nothing and import appends the rows', async () => {
  const anonymous = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    body: JSON.stringify({ format: 'csv', kind: 'systems', text: systems, entityId: 'NETWORK', dryRun: true }),
  });
  assert.equal(anonymous.status, 401);

  const preview = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    token,
    body: JSON.stringify({ format: 'csv', kind: 'systems', text: systems, entityId: 'NPE', dryRun: true }),
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.written, false);
  assert.equal(preview.body.projects, 1);
  assert.equal(preview.body.tasks, 1);
  assert.equal(preview.body.formationStatus, 'unformed');

  const before = await call(server.url, '/api/network/projects', { token });
  assert.equal(before.body.projects.length, 0);

  const imported = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    token,
    body: JSON.stringify({ format: 'csv', kind: 'systems', text: systems, entityId: 'NPE', dryRun: false }),
  });
  assert.equal(imported.status, 201);
  assert.equal(imported.body.written, true);

  const projects = await call(server.url, '/api/network/projects?entity=NPE', { token });
  assert.equal(projects.body.projects.length, 1);
  assert.equal(projects.body.projects[0].entityId, 'NPE');
  assert.equal(projects.body.projects[0].formationStatus, 'unformed');

  const events = await call(server.url, '/api/network/events?entity=NPE', { token });
  const names = events.body.events.map((event: { event: string }) => event.event);
  assert.ok(names.includes('project.created'));
  assert.ok(names.includes('task.created'));
  assert.ok(names.includes('registry.imported'));
});

test('unknown entities and elevated evidence are refused', async () => {
  const unknown = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    token,
    body: JSON.stringify({ format: 'csv', kind: 'systems', text: systems, entityId: 'HOR', dryRun: true }),
  });
  assert.equal(unknown.status, 400);

  const elevated = [
    'system,area,state,source_of_truth,evidence,next_action',
    'Nope,ministry,draft,file,VERIFIED,Do not import',
  ].join('\n');
  const refused = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    token,
    body: JSON.stringify({ format: 'csv', kind: 'systems', text: elevated, entityId: 'NETWORK', dryRun: false }),
  });
  assert.equal(refused.status, 400);
  const projects = await call(server.url, '/api/network/projects?entity=NETWORK', { token });
  assert.equal(projects.body.projects.length, 0);
});

test('an actions file loads tasks under one project', async () => {
  const text = JSON.stringify({
    actions: [
      { rank: '1', action: 'SAMPLE confirm the gate', owner: 'Desk operator', gate: 'counsel', why: 'draft only', status: 'queued' },
    ],
  });
  const imported = await call(server.url, '/api/network/registry/import', {
    method: 'POST',
    token,
    body: JSON.stringify({ format: 'json', kind: 'actions', text, entityId: 'TFS', dryRun: false }),
  });
  assert.equal(imported.status, 201);
  assert.equal(imported.body.tasks, 1);
  const projects = await call(server.url, '/api/network/projects?entity=TFS', { token });
  assert.equal(projects.body.projects[0].title, 'Registry actions');
  assert.equal(projects.body.projects[0].formationStatus, 'unformed');
});
