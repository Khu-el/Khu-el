// Generates docs/continuation/inventory.json from what is actually on disk.
//
// Generated rather than hand-maintained, because a hand-written inventory is a
// second source of truth that drifts the moment a workspace is added. This one
// re-derives from the workspace globs, the lockfile and the git state, so
// re-running it after a change is how it stays honest.
//
// What it records is deliberately narrow: what exists, what can be run against
// it, and what is committed. It does not record whether anything *works* --
// that is what the test and check commands are for, and their results belong
// in CONTINUATION_AUDIT.md where they can be dated.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf-8'));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' }).trim();

const rootPkg = read('package.json');

function describeWorkspace(dir) {
  const pkgPath = join(ROOT, dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const scripts = pkg.scripts ?? {};
  const testDir = join(ROOT, dir, 'test');
  const testFiles = existsSync(testDir)
    ? readdirSync(testDir).filter((f) => f.endsWith('.test.ts')).sort()
    : [];

  return {
    path: dir,
    name: pkg.name,
    private: pkg.private === true,
    scripts: Object.keys(scripts).sort(),
    has_typecheck: Boolean(scripts.typecheck) || existsSync(join(ROOT, dir, 'tsconfig.json')),
    has_build: Boolean(scripts.build),
    test_runner: scripts.test ? 'node --test' : null,
    test_files: testFiles,
    dependency_count: Object.keys(pkg.dependencies ?? {}).length,
  };
}

const workspaceDirs = [];
for (const pattern of rootPkg.workspaces ?? []) {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    for (const entry of readdirSync(join(ROOT, base))) {
      if (existsSync(join(ROOT, base, entry, 'package.json'))) workspaceDirs.push(`${base}/${entry}`);
    }
  } else {
    workspaceDirs.push(pattern);
  }
}

const workspaces = workspaceDirs.map(describeWorkspace).filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));

const inventory = {
  // Regenerate with `npm run inventory` rather than editing by hand.
  generated_by: 'scripts/build-inventory.mjs',
  generated_at: new Date().toISOString(),
  repository: 'Khu-el/Khu-el',
  branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  commit: git('rev-parse', 'HEAD'),
  tracked_file_count: git('ls-files').split('\n').filter(Boolean).length,
  working_tree_clean: git('status', '--porcelain') === '',
  root_scripts: Object.keys(rootPkg.scripts ?? {}).sort(),
  workspaces,
  untested_workspaces: workspaces.filter((w) => !w.test_runner).map((w) => w.path),
  linter: null, // none configured anywhere in this repository
  notes: [
    'test_runner records whether a runner is configured, not whether the suite passes.',
    'Dated run results live in docs/continuation/CONTINUATION_AUDIT.md.',
    'governance-core has no tsconfig of its own; it is typechecked through the apps that import its source.',
  ],
};

const out = 'docs/continuation/inventory.json';
writeFileSync(join(ROOT, out), JSON.stringify(inventory, null, 2) + '\n');
console.log(`${out}: ${workspaces.length} workspaces, ${inventory.untested_workspaces.length} without a test runner`);
