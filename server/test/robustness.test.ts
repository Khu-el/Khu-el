/**
 * One request must never be able to take the server down for everyone else.
 *
 * Express 4 ignores the promise an async handler returns, so a throw after the
 * first `await` was an unhandled rejection -- and Node exits on those. A memo
 * body with `assumptions: [null]` did exactly that: PDFKit read `.label` off
 * null, the process died, and every signed-in user lost the backend. These
 * tests drive the running app and then check it is still answering.
 *
 * Also covered: client errors that surfaced as 500s, and an upload to a record
 * that does not exist, which used to leave the file on disk.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { readdirSync } = await import('node:fs');
const { startTestServer, call, register, createRecord } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

async function stillAlive() {
  const health = await call(server.url, '/api/health');
  assert.equal(health.status, 200, 'the server must survive the previous request');
}

const reg = await register(server.url, 'robust@example.test');
const token: string = reg.body.token;

describe('memo payload validation', () => {
  for (const [name, body] of [
    ['a null assumption', { title: 'x', assumptions: [null], lines: [] }],
    ['a bare string line', { title: 'x', assumptions: [], lines: ['not a line'] }],
    ['a line with no label', { title: 'x', assumptions: [{ value: '1' }], lines: [] }],
    ['assumptions that are not an array', { title: 'x', assumptions: 'nope', lines: [] }],
  ] as const) {
    test(`${name} is a 400, and the server keeps running`, async () => {
      for (const path of ['/api/memo/pdf', '/api/memo/email']) {
        const res = await call(server.url, path, { method: 'POST', token, body: JSON.stringify(body) });
        assert.equal(res.status, 400, `${path} with ${name}`);
      }
      await stillAlive();
    });
  }

  test('a well-formed memo still renders a PDF', async () => {
    const res = await fetch(`${server.url}/api/memo/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Deal memo', assumptions: [{ label: 'ARV', value: '$1' }], lines: [{ label: 'DSCR', value: 1.3 }], notes: ['n'] }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  });

  test('a missing value renders as a dash rather than being refused', async () => {
    const res = await fetch(`${server.url}/api/memo/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'x', assumptions: [{ label: 'Exemption track' }], lines: [] }),
    });
    assert.equal(res.status, 200);
  });
});

describe('email without SMTP configured', () => {
  test('memo email is a 501 naming the missing configuration', async () => {
    const res = await call(server.url, '/api/memo/email', {
      method: 'POST',
      token,
      body: JSON.stringify({ title: 'x', assumptions: [], lines: [] }),
    });
    assert.equal(res.status, 501);
    assert.match(res.body.error, /SMTP is not configured/);
  });

  test('digest email is a 501 as well', async () => {
    const res = await call(server.url, '/api/digest/email', { method: 'POST', token });
    assert.equal(res.status, 501);
    await stillAlive();
  });
});

describe('digest data robustness', () => {
  test('malformed stored JSON shapes are ignored rather than crashing the digest', async () => {
    db.prepare('INSERT INTO records (id, app_id, owner_id, record_type, lane, assertion_status, reconciliation_status, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        'rec_bad-shape',
        'legacy-estate',
        reg.body.user.id,
        'estate',
        'LANE_B',
        'CURRENT_INTERNAL_MODEL',
        'STAGED',
        JSON.stringify({ data: { beneficiaries: { accountOrPolicy: 'not-an-array' } } }),
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      );
    db.prepare('INSERT INTO records (id, app_id, owner_id, record_type, lane, assertion_status, reconciliation_status, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        'rec_bad-json',
        'deal-architect',
        reg.body.user.id,
        'deal',
        'LANE_A',
        'CURRENT_INTERNAL_MODEL',
        'STAGED',
        '{not valid json',
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      );

    const res = await call(server.url, '/api/digest', { token });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    await stillAlive();
  });
});

describe('client errors are reported as client errors', () => {
  test('malformed JSON is a 400, not a 500', async () => {
    const res = await call(server.url, '/api/auth/login', {
      method: 'POST',
      body: '{"email": ',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 400);
  });
});

describe('concurrent registration', () => {
  test('two simultaneous registrations for one address: one 201, one 409, never a 500', async () => {
    const results = await Promise.all([register(server.url, 'race@example.test'), register(server.url, 'race@example.test')]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    await stillAlive();
  });
});

describe('uploads', () => {
  function upload(recordId: string, bytes: number) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)]), 'scan.pdf');
    return fetch(`${server.url}/api/records/${recordId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    describe('sqlite foreign keys', () => {
      test('an attachment cannot point at a record that does not exist', () => {
        assert.throws(
          () =>
            db.prepare(
              'INSERT INTO attachments (id, record_id, owner_id, stored_filename, original_name, mime_type, size_bytes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run('att_orphan', 'rec_missing', reg.body.user.id, 'x.bin', 'x.bin', 'application/octet-stream', 1, '2026-01-01T00:00:00.000Z'),
          /FOREIGN KEY/i
        );
      });
    });
  }

  test('an upload to a record that does not exist leaves nothing on disk', async () => {
    const before = readdirSync(process.env.NTE_UPLOADS_DIR!).length;
    const res = await upload('rec_does-not-exist', 1024);
    assert.equal(res.status, 404);
    assert.equal(readdirSync(process.env.NTE_UPLOADS_DIR!).length, before);
  });

  test("an upload to another user's private record is refused and leaves nothing on disk", async () => {
    const other = await register(server.url, 'robust-other@example.test');
    const rec = await createRecord(server.url, other.body.token);
    const before = readdirSync(process.env.NTE_UPLOADS_DIR!).length;
    const res = await upload(rec.body.record.id, 1024);
    assert.equal(res.status, 403);
    assert.equal(readdirSync(process.env.NTE_UPLOADS_DIR!).length, before);
  });

  test('a file over the size limit is a 413', async () => {
    const rec = await createRecord(server.url, token);
    const res = await upload(rec.body.record.id, 15 * 1024 * 1024 + 1);
    assert.equal(res.status, 413);
    await stillAlive();
  });
});
