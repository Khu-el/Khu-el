/**
 * Ledger checkpoints live outside SQLite. A changed event hash must fail
 * verification against the file that was written first.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { startTestServer, call, register } = await import('./helpers.ts');
const { createApp } = await import('../dist/app.js');
const { db } = await import('../dist/lib/db.js');

const server = await startTestServer(createApp());

after(async () => {
  await server.close();
  env.cleanup();
});

describe('network ledger checkpoints', () => {
  test('anchors the chain head and notices a tampered hash', async () => {
    const res = await register(server.url, 'checkpoint@example.test');
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const created = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token,
      body: JSON.stringify({ title: 'Checkpoint brief' }),
    });
    assert.equal(created.status, 201);
    const again = await call(server.url, '/api/network/projects', {
      method: 'POST',
      token,
      body: JSON.stringify({ title: 'Second brief' }),
    });
    assert.equal(again.status, 201);

    const file = path.join(process.env.NTE_DATA_DIR!, 'network-ledger-checkpoints.jsonl');
    const lines = readFileSync(file, 'utf8').trim().split('\n');
    assert.ok(lines.length >= 2);
    const first = JSON.parse(lines[0]) as { count: number; headHash: string; ownerId: string };
    assert.equal(first.ownerId, userId);
    assert.equal(first.count, 1);
    assert.equal(JSON.parse(lines[0]).headHash, first.headHash);

    const before = await call(server.url, '/api/network/ledger/verify', { token });
    assert.equal(before.status, 200);
    assert.equal(before.body.chainIntact, true);
    assert.equal(before.body.anchored, true);
    assert.equal(before.body.matches, true);

    const exported = await call(server.url, '/api/network/ledger/checkpoint', { method: 'POST', token, body: '{}' });
    assert.equal(exported.status, 201);
    assert.equal(exported.body.checkpoint.count, before.body.count);
    const afterExport = readFileSync(file, 'utf8').trim().split('\n');
    assert.ok(afterExport.length > lines.length);
    assert.equal(afterExport[0], lines[0]);

    db.prepare('UPDATE network_events SET hash = ? WHERE owner_id = ?').run('tampered', userId);
    const tampered = await call(server.url, '/api/network/ledger/verify', { token });
    assert.equal(tampered.status, 200);
    assert.equal(tampered.body.matches, false);
    assert.match(tampered.body.reason, /does not match/);

    const cli = spawnSync(process.execPath, ['dist/network/checkpoint-cli.js'], {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
    });
    assert.equal(cli.status, 1, cli.stderr || cli.stdout);
    assert.match(cli.stdout, /matches":false/);
    assert.doesNotMatch(cli.stdout, /tampered|Checkpoint brief|Bearer/);
  });
});
