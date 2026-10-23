/**
 * NTE_SYSTEMS_OPERATOR is assigned only when the registering address is listed
 * in MINISTRY_OPERATOR_EMAILS. The request body cannot choose it, and the
 * role is not SYSTEM_ADMIN.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv({ ministryOperatorEmails: 'Minister@Example.Test, second.operator@example.test' });

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

describe('MINISTRY_OPERATOR_EMAILS', () => {
  test('a listed address registers as NTE_SYSTEMS_OPERATOR even if it asks to be admin', async () => {
    const res = await register(server.url, 'minister@example.test', { role: 'SYSTEM_ADMIN' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'NTE_SYSTEMS_OPERATOR');
    const patch = await call(server.url, '/api/auth/me', {
      method: 'PATCH',
      token: res.body.token,
      body: JSON.stringify({ role: 'SYSTEM_ADMIN' }),
    });
    assert.equal(patch.status, 403);
    const me = await call(server.url, '/api/auth/me', { token: res.body.token });
    assert.equal(me.body.user.role, 'NTE_SYSTEMS_OPERATOR');
  });

  test('matching ignores case and does not open another account', async () => {
    const res = await register(server.url, 'SECOND.OPERATOR@example.test');
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'NTE_SYSTEMS_OPERATOR');
    const owner = await register(server.url, 'ministry-private@example.test');
    const created = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token: owner.body.token,
      body: JSON.stringify({ title: 'Private ministry brief' }),
    });
    assert.equal(created.status, 201);
    const seen = await call(server.url, '/api/network/projects', { token: res.body.token });
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.body.projects, []);
  });

  test('an unlisted address stays a family council member', async () => {
    const res = await register(server.url, 'not-listed@example.test', { role: 'NTE_SYSTEMS_OPERATOR' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });

  test('PATCH /api/auth/me still refuses a role change for everyone else', async () => {
    const reg = await register(server.url, 'minister-patch@example.test');
    assert.equal(reg.body.user.role, 'FAMILY_COUNCIL_MEMBER');
    const patch = await call(server.url, '/api/auth/me', {
      method: 'PATCH',
      token: reg.body.token,
      body: JSON.stringify({ role: 'SYSTEM_ADMIN' }),
    });
    assert.equal(patch.status, 403);
    const me = await call(server.url, '/api/auth/me', { token: reg.body.token });
    assert.equal(me.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });
});
