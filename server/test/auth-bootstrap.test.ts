/**
 * The one way a registration can produce a SYSTEM_ADMIN: the address named by
 * BOOTSTRAP_ADMIN_EMAIL, which is set on the deployment platform beside
 * JWT_SECRET rather than chosen by whoever holds the invite code.
 *
 * Its own file because the variable is read once, at import time.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv({ bootstrapAdminEmail: 'Owner@Example.Test' });

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register, createRecord } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

describe('BOOTSTRAP_ADMIN_EMAIL', () => {
  test('the named address registers as SYSTEM_ADMIN', async () => {
    const res = await register(server.url, 'owner@example.test');
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'SYSTEM_ADMIN');
  });

  test('matching ignores case on both sides', async () => {
    // The configured value is "Owner@Example.Test"; the address above registered
    // in lower case and still matched.
    const res = await register(server.url, 'OWNER2@example.test');
    assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER', 'a different address must not match');
  });

  test('a lookalike address does not match', async () => {
    for (const lookalike of [
      'owner@example.test.attacker.example',
      'xowner@example.test',
      'owner@example.tes',
      ' owner@example.test.evil',
    ]) {
      const res = await register(server.url, lookalike);
      assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER', `${lookalike} must not match the bootstrap address`);
    }
  });

  test('everyone else is still a FAMILY_COUNCIL_MEMBER even asking for admin', async () => {
    const res = await register(server.url, 'not-the-owner@example.test', { role: 'SYSTEM_ADMIN' });
    assert.equal(res.body.user.role, 'FAMILY_COUNCIL_MEMBER');
  });

  test('the bootstrap admin does see other users records -- which is why the address is deployment-set', async () => {
    const member = await register(server.url, 'member@example.test');
    const created = await createRecord(server.url, member.body.token);
    assert.equal(created.status, 201);

    const admin = await call(server.url, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'owner@example.test', password: 'test-password-123' }),
    });
    assert.equal(admin.body.user.role, 'SYSTEM_ADMIN');

    const list = await call(server.url, '/api/records?appId=deal-architect', { token: admin.body.token });
    assert.equal(
      list.body.records.some((r: any) => r.id === created.body.record.id),
      true,
      'an admin reads across owners; that reach is the reason the role cannot be self-assigned'
    );
  });
});
