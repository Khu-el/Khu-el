/**
 * The query-string token is an exception for one route, not a second way to
 * authenticate.
 *
 * `requireAuth` used to read `?token=` on every route it guarded. A JWT in a
 * URL is copied into access and proxy logs, browser history and the Referer of
 * any outward link, and these tokens last 30 days -- so one leaked log line was
 * a month of access to everything, not to one file. On a state-changing route
 * it also meant a bare cross-origin link or `<img>` could carry it, which a
 * header never can.
 *
 * scripts/check-query-token.mjs guards the shape of the code; this guards the
 * behaviour of the running server.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register, createRecord } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');

const server = await startTestServer(createApp());

const owner = await register(server.url, 'downloader@example.test');
const token: string = owner.body.token;
const record = await createRecord(server.url, token);
const recordId: string = record.body.record.id;

// Upload one file, so the download route has something real to return.
const form = new FormData();
form.append('file', new Blob(['evidence file contents'], { type: 'text/plain' }), 'evidence.txt');
const uploaded = await fetch(`${server.url}/api/records/${recordId}/attachments`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const attachmentId: string = (await uploaded.json()).attachment.id;

after(async () => {
  await server.close();
  env.cleanup();
});

describe('the one route that accepts ?token=', () => {
  test('a plain <a href> download works with no Authorization header', async () => {
    const res = await fetch(`${server.url}/api/attachments/${attachmentId}/download?token=${encodeURIComponent(token)}`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'evidence file contents');
  });

  test('the same route still works with the header', async () => {
    const res = await fetch(`${server.url}/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
  });

  test('a bad query token is refused there too', async () => {
    const res = await fetch(`${server.url}/api/attachments/${attachmentId}/download?token=not-a-real-token`);
    assert.equal(res.status, 401);
  });
});

describe('every other route ignores a query token', () => {
  const cases: Array<{ name: string; path: string; method?: string; body?: string }> = [
    { name: 'GET /api/records', path: '/api/records?appId=deal-architect' },
    { name: 'GET /api/auth/me', path: '/api/auth/me' },
    { name: 'GET /api/records/:id/attachments', path: `/api/records/RECORD_ID/attachments` },
    { name: 'DELETE /api/attachments/:id', path: `/api/attachments/ATTACHMENT_ID`, method: 'DELETE' },
    { name: 'DELETE /api/records/:id', path: `/api/records/RECORD_ID`, method: 'DELETE' },
    {
      name: 'POST /api/memo/pdf',
      path: '/api/memo/pdf',
      method: 'POST',
      body: JSON.stringify({ title: 'x', assumptions: [], lines: [] }),
    },
    { name: 'POST /api/digest/email', path: '/api/digest/email', method: 'POST' },
  ];

  for (const c of cases) {
    test(`${c.name} returns 401 with only a query token`, async () => {
      const path = c.path.replace('RECORD_ID', recordId).replace('ATTACHMENT_ID', attachmentId);
      const sep = path.includes('?') ? '&' : '?';
      const res = await call(server.url, `${path}${sep}token=${encodeURIComponent(token)}`, {
        method: c.method ?? 'GET',
        body: c.body,
      });
      assert.equal(res.status, 401, `${c.name} must not accept a token from the query string`);
    });
  }

  test('the attachment survived the refused DELETE', async () => {
    const res = await fetch(`${server.url}/api/attachments/${attachmentId}/download?token=${encodeURIComponent(token)}`);
    assert.equal(res.status, 200);
  });
});
