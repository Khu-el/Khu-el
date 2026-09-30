/**
 * Test scaffolding: builds a throwaway bus in a temp directory using the real
 * schemas from the repository, so tests exercise the shipped contract rather
 * than a convenient copy of it.
 */

import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_SCHEMAS = join(here, '..', '..', '..', '.neterverse', 'schemas');

export function makeBus(): { root: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'neterverse-bus-'));
  const root = join(dir, '.neterverse');
  for (const sub of ['state', 'locks', 'events', 'schemas']) {
    mkdirSync(join(root, sub), { recursive: true });
  }
  cpSync(REPO_SCHEMAS, join(root, 'schemas'), { recursive: true });
  return { root, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export const CLAUDE = { runtime: 'CLAUDE_CODE', instance_id: 'claude-test' } as const;
export const CODEX = { runtime: 'CODEX', instance_id: 'codex-test' } as const;
