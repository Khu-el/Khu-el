/**
 * An address is stored in one form: trimmed and lowercase. An untrimmed
 * value is rejected and does not create a row.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

test('registration rejects an untrimmed email and inserts nothing', async () => {
  const email = ' spaced@example.test ';
  const res = await register(server.url, email);
  assert.equal(res.status, 400);
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as { id: string } | undefined;
  assert.equal(row, undefined);
});

test('registration stores the trimmed lowercase address', async () => {
  const res = await register(server.url, 'Mixed.Case@Example.TEST');
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'mixed.case@example.test');
  const row = db.prepare('SELECT email FROM users WHERE id = ?').get(res.body.user.id) as { email: string };
  assert.equal(row.email, 'mixed.case@example.test');
});

test('login rejects an untrimmed email and accepts the canonical form', async () => {
  const spaced = await call(server.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ' Mixed.Case@Example.TEST ', password: 'test-password-123' }),
  });
  assert.equal(spaced.status, 400);

  const ok = await call(server.url, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'Mixed.Case@Example.TEST', password: 'test-password-123' }),
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, 'mixed.case@example.test');
});
