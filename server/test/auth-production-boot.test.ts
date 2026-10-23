/**
 * Production refuses to boot without JWT_SECRET and INVITE_CODE, and a
 * generated invite is never written to stdout or stderr.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverRoot = path.resolve(import.meta.dirname, '..');
const envModule = path.join(serverRoot, 'dist/lib/env.js');

function boot(extra: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'nte-boot-'));
  const childEnv: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
  childEnv.NTE_DATA_DIR = path.join(dir, 'data');
  childEnv.NTE_UPLOADS_DIR = path.join(dir, 'uploads');
  Object.assign(childEnv, extra);
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `await import(${JSON.stringify(envModule)})`],
    { cwd: dir, env: childEnv, encoding: 'utf8' },
  );
  return { dir, result };
}

test('production boot throws when JWT_SECRET is missing and does not log an invite', () => {
  const { dir, result } = boot({ NODE_ENV: 'production', INVITE_CODE: 'not-logged' });
  try {
    assert.notEqual(result.status, 0);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /JWT_SECRET/);
    assert.equal(output.includes('not-logged'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('production boot throws when INVITE_CODE is missing', () => {
  const { dir, result } = boot({ NODE_ENV: 'production', JWT_SECRET: 'prod-secret' });
  try {
    assert.notEqual(result.status, 0);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /INVITE_CODE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a locally generated invite is saved and not printed', () => {
  const { dir, result } = boot({ NODE_ENV: 'development' });
  try {
    assert.equal(result.status, 0, result.stderr);
    const invite = readFileSync(path.join(dir, 'data', '.invite-code'), 'utf8').trim();
    const secret = readFileSync(path.join(dir, 'data', '.jwt-secret'), 'utf8').trim();
    const output = `${result.stdout}\n${result.stderr}`;
    assert.ok(invite.length > 0);
    assert.equal(output.includes(invite), false);
    assert.equal(output.includes(secret), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
