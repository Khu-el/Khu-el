/**
 * Network-desk source and seeds must not assert a tax classification.
 * The scan lives outside apps/network-desk and server/src/network so the
 * prohibited phrases can be named here without failing the scan.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ROOTS = [path.join(ROOT, 'apps/network-desk'), path.join(ROOT, 'server/src/network')];
const FORBIDDEN = [/non-grantor/i, /irrevocable/i];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      out.push(...files(full));
    } else out.push(full);
  }
  return out;
}

test('network-desk source and seeds do not assert a tax classification', () => {
  const hits: string[] = [];
  for (const dir of ROOTS) {
    for (const file of files(dir)) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        if (FORBIDDEN.some((pattern) => pattern.test(line))) {
          hits.push(`${path.relative(ROOT, file)}:${index + 1}`);
        }
      });
    }
  }
  assert.deepEqual(hits, []);
});
