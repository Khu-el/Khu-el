/**
 * Fail closed: with no BOOTSTRAP_ADMIN_SECRET, the bootstrap address cannot
 * become SYSTEM_ADMIN even when the invite code is valid.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv({ bootstrapAdminEmail: 'admin@example.test' });

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

test('an unset bootstrap secret refuses the admin address and inserts nothing', async () => {
  const res = await register(server.url, 'admin@example.test', { bootstrapAdminSecret: 'anything' });
  assert.equal(res.status, 403);
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.test');
  assert.equal(row, undefined);
});
