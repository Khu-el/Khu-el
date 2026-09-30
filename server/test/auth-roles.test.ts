/**
 * Roles are assigned by the deployment, never chosen by the person registering.
 *
 * Both holes these cover were live: registration took `role` from the request
 * body, and `PATCH /me` let any signed-in user set their own. Either reached
 * SYSTEM_ADMIN, which `canAccess` treats as access to every record in every
 * app regardless of owner. The invite code is the shareable credential -- it is
 * printed to the logs on first boot -- so it must not confer authority over
 * anyone else's records.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register, createRecord } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

describe('role assignment at registration', () => {
  test('a role in the request body is not honoured', async () => {
    const res = await register(server.url, 'asks-for-admin@example.test', { role: 'SYSTEM_ADMIN' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });

  test('with no BOOTSTRAP_ADMIN_EMAIL set, no registration can produce an admin', async () => {
    assert.equal(process.env.BOOTSTRAP_ADMIN_EMAIL, undefined);
    for (const role of ['SYSTEM_ADMIN', 'NTE_TRUSTEE_OFFICE', 'HOUSE_TRUSTEE_OFFICE']) {
      const res = await register(server.url, `wants-${role}@example.test`, { role });
      assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER', `${role} must not be self-assignable`);
    }
  });

  test('the issued token carries the assigned role, not the requested one', async () => {
    const res = await register(server.url, 'token-role@example.test', { role: 'SYSTEM_ADMIN' });
    const claims = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64url').toString());
    assert.equal(claims.role, 'FAMILY_COUNCIL_MEMBER');
  });
});

describe('PATCH /api/auth/me', () => {
  test('refuses a role rather than silently ignoring it', async () => {
    const reg = await register(server.url, 'self-promote@example.test');
    const token = reg.body.token;

    const patch = await call(server.url, '/api/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role: 'SYSTEM_ADMIN' }),
    });
    assert.equal(patch.status, 403);

    const me = await call(server.url, '/api/auth/me', { token });
    assert.equal(me.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });

  test('a role alongside a display name fails the whole request', async () => {
    const reg = await register(server.url, 'combined-patch@example.test');
    const token = reg.body.token;

    const patch = await call(server.url, '/api/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ displayName: 'New Name', role: 'SYSTEM_ADMIN' }),
    });
    assert.equal(patch.status, 403);

    const me = await call(server.url, '/api/auth/me', { token });
    assert.equal(me.body.user.role, 'FAMILY_COUNCIL_MEMBER');
    assert.equal(me.body.user.displayName, 'Test User', 'the name must not change on a refused request');
  });

  test('still updates a display name on its own', async () => {
    const reg = await register(server.url, 'rename@example.test');
    const patch = await call(server.url, '/api/auth/me', {
      method: 'PATCH',
      token: reg.body.token,
      body: JSON.stringify({ displayName: 'Renamed' }),
    });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.user.displayName, 'Renamed');
    assert.equal(patch.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });
});

describe('what a non-admin cannot reach', () => {
  test("one user's private record is invisible and undeletable to another", async () => {
    const owner = await register(server.url, 'owner-of-record@example.test');
    const created = await createRecord(server.url, owner.body.token);
    assert.equal(created.status, 201);
    const recordId = created.body.record.id;

    // Registered asking for admin, which is exactly the escalation that used to work.
    const other = await register(server.url, 'other-user@example.test', { role: 'SYSTEM_ADMIN' });
    const otherToken = other.body.token;

    const list = await call(server.url, '/api/records?appId=deal-architect', { token: otherToken });
    assert.equal(list.status, 200);
    assert.equal(
      list.body.records.some((r: any) => r.id === recordId),
      false,
      "another user's private record must not appear in the listing"
    );

    const del = await call(server.url, `/api/records/${recordId}`, { method: 'DELETE', token: otherToken });
    assert.equal(del.status, 403);

    const stillThere = await call(server.url, '/api/records?appId=deal-architect', { token: owner.body.token });
    assert.equal(stillThere.body.records.some((r: any) => r.id === recordId), true);
  });
});

describe('GET /api/auth/users', () => {
  test('returns the lightweight roster without email addresses', async () => {
    const one = await register(server.url, 'roster-one@example.test');
    await register(server.url, 'roster-two@example.test');

    const res = await call(server.url, '/api/auth/users', { token: one.body.token });
    assert.equal(res.status, 200);
    assert.ok(res.body.users.length >= 2);
    assert.equal('email' in res.body.users[0], false);
    assert.equal(typeof res.body.users[0].displayName, 'string');
    assert.equal(typeof res.body.users[0].role, 'string');
  });
});
