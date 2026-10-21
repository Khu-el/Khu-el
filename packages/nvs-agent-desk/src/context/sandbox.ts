import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ContextStore } from './store.ts';

export interface RunOptions {
  /** Directory the script may READ. It gets no write access and no child processes. */
  readDir: string;
  label: string;
  timeoutMs?: number;
  maxReturnChars?: number;
  maxOutputBytes?: number;
}

export interface RunResult {
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  bytesProduced: number;
  /** What the model actually sees. Everything else is searchable under `indexedAs`. */
  returned: string;
  indexedAs: string;
  stderr: string;
}

/**
 * "Think in code": the agent writes a short script that does the counting, and only the result comes back.
 *
 * LIMITS, stated plainly: this uses Node's permission model (fs read limited to `readDir`, no writes, no child
 * processes, no workers) and a scrubbed environment (no API keys, no PATH). It does NOT block network access.
 * It is for analysis scripts the agent wrote for the principal, not for running untrusted code.
 */
export async function runScript(code: string, store: ContextStore, opts: RunOptions): Promise<RunResult> {
  const readDir = realpathSync(opts.readDir);
  const maxBytes = opts.maxOutputBytes ?? 5_000_000;
  const scratch = mkdtempSync(join(tmpdir(), 'nvs-ctx-'));
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;
  let timedOut = false;
  let stderr = '';

  try {
    const exitCode = await new Promise<number | null>((resolve) => {
      const child = spawn(
        process.execPath,
        ['--permission', `--allow-fs-read=${readDir}`, '--input-type=module', '-e', code],
        { cwd: scratch, env: { NODE_NO_WARNINGS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const timer = setTimeout(() => ((timedOut = true), child.kill('SIGKILL')), opts.timeoutMs ?? 5000);
      child.stdout.on('data', (b: Buffer) => {
        if (size >= maxBytes) return void (truncated = true);
        const room = maxBytes - size;
        chunks.push(b.length > room ? b.subarray(0, room) : b);
        size += Math.min(b.length, room);
        if (b.length > room) truncated = true;
      });
      child.stderr.on('data', (b: Buffer) => (stderr = (stderr + b.toString()).slice(-2000)));
      child.on('close', (c) => (clearTimeout(timer), resolve(c)));
    });

    const out = Buffer.concat(chunks).toString('utf8');
    store.index(opts.label, out);
    const cap = opts.maxReturnChars ?? 2000;
    const returned = out.length > cap ? `${out.slice(0, cap)}\n… [${out.length - cap} more chars indexed as "${opts.label}"; use search]` : out;
    store.noteReturned(Buffer.byteLength(returned));
    return { exitCode, timedOut, truncated, bytesProduced: size, returned, indexedAs: opts.label, stderr };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
