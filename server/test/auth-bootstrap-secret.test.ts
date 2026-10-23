/**
 * BOOTSTRAP_ADMIN_EMAIL is not enough. The shared invite code cannot create
 * SYSTEM_ADMIN unless BOOTSTRAP_ADMIN_SECRET matches, and only one admin row
 * is allowed. An unset secret fails closed.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv({
  bootstrapAdminEmail: 'admin@example.test',
  bootstrapAdminSecret: 'desk-admin-secret',
});

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, register, call } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

function adminCount() {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'SYSTEM_ADMIN'`).get() as { n: number };
  return row.n;
}

test('a wrong secret is 403 and inserts nothing', async () => {
  const res = await register(server.url, 'admin@example.test', { bootstrapAdminSecret: 'nope' });
  assert.equal(res.status, 403);
  assert.equal(adminCount(), 0);
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.test');
  assert.equal(row, undefined);
});

test('a missing secret is 403 and inserts nothing', async () => {
  const res = await register(server.url, 'admin@example.test');
  assert.equal(res.status, 403);
  assert.equal(adminCount(), 0);
});

test('the matching secret creates one SYSTEM_ADMIN and a second attempt is 409', async () => {
  const first = await register(server.url, 'admin@example.test', { bootstrapAdminSecret: 'desk-admin-secret' });
  assert.equal(first.status, 201);
  assert.equal(first.body.user.role, 'SYSTEM_ADMIN');
  assert.equal(adminCount(), 1);

  const second = await register(server.url, 'admin@example.test', { bootstrapAdminSecret: 'desk-admin-secret' });
  assert.equal(second.status, 409);
  assert.equal(adminCount(), 1);

  const roster = await call(server.url, '/api/auth/users', { token: first.body.token });
  assert.equal(roster.status, 200);
  assert.equal(roster.body.users.some((user: { role?: string }) => user.role === 'SYSTEM_ADMIN'), true);

  const member = await register(server.url, 'member@example.test');
  const hidden = await call(server.url, '/api/auth/users', { token: member.body.token });
  assert.equal(hidden.body.users.every((user: { role?: string }) => user.role === undefined), true);
});
