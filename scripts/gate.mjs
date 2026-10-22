/**
 * Local pre-merge gate. Exits non-zero on the first failing step.
 * It does not deploy, push, or read a secret.
 */
import { spawnSync } from 'node:child_process';

const steps = [
  ['npm', ['test']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'build', '--workspace=apps/network-desk']],
  ['npm', ['run', 'lint']],
  ['node', ['--test', 'server/test/network-doctrine.test.ts']],
];

for (const [command, args] of steps) {
  const label = [command, ...args].join(' ');
  console.log(`\n[gate] ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[gate] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[gate] passed');
