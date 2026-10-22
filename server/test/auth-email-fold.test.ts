/**
 * Addresses stored before canonical registration must still sign in.
 * The folded form is written back. The address is not logged.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db, foldUserEmails } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

test('a stored mixed-case email signs in as the canonical address', async () => {
  const created = await register(server.url, 'fold.me@example.test');
  assert.equal(created.status, 201);
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run('Fold.Me@example.test', created.body.user.id);

  const login = await call(server.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fold.me@example.test', password: 'test-password-123' }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'fold.me@example.test');
  const row = db.prepare('SELECT email FROM users WHERE id = ?').get(created.body.user.id) as { email: string };
  assert.equal(row.email, 'fold.me@example.test');
});

test('boot folding rewrites a stored mixed-case email when it does not collide', async () => {
  const created = await register(server.url, 'again.fold@example.test');
  assert.equal(created.status, 201);
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(' Again.Fold@example.test ', created.body.user.id);
  foldUserEmails();
  const row = db.prepare('SELECT email FROM users WHERE id = ?').get(created.body.user.id) as { email: string };
  assert.equal(row.email, 'again.fold@example.test');
});
