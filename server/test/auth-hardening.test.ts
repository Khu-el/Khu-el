/**
 * Sign-in hardening: failures are rate limited, an unknown address costs as
 * much time as a wrong password, and a token carries only who signed in --
 * never a role or an account the database no longer holds.
 *
 * Before this: no limit on sign-in attempts at all; an unknown email answered
 * before bcrypt ran, so timing told anyone which addresses had accounts; and
 * the role inside a 30-day token stayed in force after the database changed it,
 * including after the account was deleted.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register, createRecord } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

const login = (email: string, password: string) =>
  call(server.url, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

describe('the token names the account; the database says what it may do', () => {
  test('a role lowered in the database applies at once, not when the token expires', async () => {
    const reg = await register(server.url, 'demoted@example.test');
    const token = reg.body.token;
    assert.equal((await createRecord(server.url, token)).status, 201);

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('READ_ONLY_AUDITOR', reg.body.user.id);
    const after = await createRecord(server.url, token);
    assert.equal(after.status, 403, 'the old token must not keep write access');
  });

  test('a deleted account is signed out, not served for the rest of the token', async () => {
    const reg = await register(server.url, 'deleted@example.test');
    db.prepare('DELETE FROM users WHERE id = ?').run(reg.body.user.id);
    const me = await call(server.url, '/api/auth/me', { token: reg.body.token });
    assert.equal(me.status, 401);
  });

  test('an unrecognized database role is refused rather than treated as writable', async () => {
    const reg = await register(server.url, 'broken-role@example.test');
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('BROKEN_ROLE', reg.body.user.id);
    const me = await call(server.url, '/api/auth/me', { token: reg.body.token });
    assert.equal(me.status, 403);
  });
});

describe('an unknown address is not faster than a wrong password', () => {
  test('both run bcrypt', async () => {
    await register(server.url, 'timing@example.test');
    const median = async (email: string) => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        await login(email, 'not-the-password');
        times.push(performance.now() - t);
      }
      return times.sort((a, b) => a - b)[2];
    };
    const known = await median('timing@example.test');
    const unknown = await median('nobody-here@example.test');
    // Before the fix the unknown path skipped bcrypt entirely and answered in
    // about a millisecond; with it, both paths do the same work.
    assert.ok(unknown > known * 0.5, `unknown ${unknown.toFixed(1)}ms vs known ${known.toFixed(1)}ms`);
  });
});

describe('failed sign-ins are limited per address', () => {
  test('ten failures lock the address -- even the right password gets a 429 with Retry-After', async () => {
    await register(server.url, 'guessed@example.test');
    for (let i = 0; i < 10; i++) assert.equal((await login('guessed@example.test', `wrong-${i}`)).status, 401);

    const res = await fetch(`${server.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'guessed@example.test', password: 'test-password-123' }),
    });
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) > 0);
  });

  test('another address is unaffected', async () => {
    await register(server.url, 'bystander@example.test');
    assert.equal((await login('bystander@example.test', 'test-password-123')).status, 200);
  });

  test('a successful login clears the client IP bucket as well as the address bucket', async () => {
    await register(server.url, 'ip-reset@example.test');
    for (let i = 0; i < 9; i++) assert.equal((await login('ip-reset@example.test', `wrong-${i}`)).status, 401);
    assert.equal((await login('ip-reset@example.test', 'test-password-123')).status, 200);
    assert.equal((await login('fresh-after-success@example.test', 'wrong-password')).status, 401);
  });
});

// Last: once this IP is limited, it cannot register again in this process.
describe('failed invite codes are limited per client', () => {
  test('ten wrong codes, and the eleventh attempt is refused even with the right code', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await register(server.url, `invite-${i}@example.test`, { inviteCode: `wrong-${i}` });
      assert.equal(res.status, 403);
    }
    const res = await register(server.url, 'invite-right@example.test');
    assert.equal(res.status, 429);
  });
});
