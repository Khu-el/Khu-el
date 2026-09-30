/**
 * Each test file runs in its own process under `node --test`, so the
 * environment set here is set before lib/env.ts and lib/db.ts are first
 * imported. That ordering is the whole trick: both read their configuration at
 * import time, so the app under test gets a private SQLite file and a known
 * JWT secret without either module being mocked. The routes, middleware order
 * and auth stack exercised are the real ones.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

export interface TestEnvOptions {
  inviteCode?: string;
  bootstrapAdminEmail?: string;
}

/** Call at the very top of a test file, before importing anything from ../src. */
export function configureTestEnv(options: TestEnvOptions = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'nte-server-test-'));
  process.env.NTE_DATA_DIR = join(dir, 'data');
  process.env.NTE_UPLOADS_DIR = join(dir, 'uploads');
  process.env.JWT_SECRET = 'test-secret-not-used-anywhere-real';
  process.env.INVITE_CODE = options.inviteCode ?? 'test-invite-code';
  if (options.bootstrapAdminEmail === undefined) delete process.env.BOOTSTRAP_ADMIN_EMAIL;
  else process.env.BOOTSTRAP_ADMIN_EMAIL = options.bootstrapAdminEmail;
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export async function startTestServer(app: import('express').Express): Promise<TestServer> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export interface ApiResult<T = any> {
  status: number;
  body: T;
}

/** Thin fetch wrapper: returns the status alongside the parsed body so a test can assert on both. */
export async function call(
  base: string,
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<ApiResult> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

export async function register(
  base: string,
  email: string,
  extra: Record<string, unknown> = {}
): Promise<ApiResult> {
  return call(base, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'test-password-123',
      displayName: 'Test User',
      inviteCode: process.env.INVITE_CODE,
      ...extra,
    }),
  });
}

/** A record in one of the three per-user private apps. */
export async function createRecord(base: string, token: string, appId = 'deal-architect'): Promise<ApiResult> {
  return call(base, '/api/records', {
    method: 'POST',
    token,
    body: JSON.stringify({
      appId,
      type: 'deal',
      authority: { lane: 'LANE_A', assertionStatus: 'CURRENT_INTERNAL_MODEL' },
      data: { address: 'private to its owner' },
    }),
  });
}
