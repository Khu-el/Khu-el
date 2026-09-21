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

// Fields that change on every run regardless of whether anything real changed,
// plus one that cannot be generated correctly at the moment it must be written.
// Kept out of the comparison in --check so the guard flags drift, not bookkeeping.
//
// tracked_file_count is here rather than below because of a genuine ordering
// problem, found when CI rejected the very commit that introduced this guard.
// The file is generated before `git add`, so a commit that adds files records a
// count from before they were tracked -- committed 225, actual 227 on a clean
// checkout. It is a snapshot fact like the commit SHA, useful to read and
// impossible to gate on, so it is recorded and not compared.
const volatile = {
  generated_at: new Date().toISOString(),
  branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
  commit: git('rev-parse', 'HEAD'),
  working_tree_clean: git('status', '--porcelain') === '',
  tracked_file_count: git('ls-files').split('\n').filter(Boolean).length,
};

// The shape of the repository. A change here without a regenerated file means the
// committed inventory is describing a repository that no longer exists.
const structural = {
  generated_by: 'scripts/build-inventory.mjs',
  repository: 'Khu-el/Khu-el',
  root_scripts: Object.keys(rootPkg.scripts ?? {}).sort(),
  workspaces,
  untested_workspaces: workspaces.filter((w) => !w.test_runner).map((w) => w.path),
  linter: null, // none configured anywhere in this repository
  notes: [
    'test_runner records whether a runner is configured, not whether the suite passes.',
    'Dated run results live in docs/continuation/CONTINUATION_AUDIT.md.',
    'governance-core has no tsconfig of its own; it is typechecked through the apps that import its source.',
    'Regenerate with `npm run inventory`; `npm run inventory:check` fails when this file has drifted.',
    'tracked_file_count, commit, branch and generated_at are snapshot facts and are not gated on.',
  ],
};

const inventory = { ...structural, ...volatile };
const out = 'docs/continuation/inventory.json';
const outPath = join(ROOT, out);

const STRUCTURAL_KEYS = Object.keys(structural);

if (process.argv.includes('--check')) {
  if (!existsSync(outPath)) {
    console.error(`${out} does not exist. Run \`npm run inventory\`.`);
    process.exit(1);
  }
  const committed = JSON.parse(readFileSync(outPath, 'utf-8'));
  const drifted = STRUCTURAL_KEYS.filter((k) => JSON.stringify(committed[k]) !== JSON.stringify(structural[k]));

  if (drifted.length > 0) {
    console.error(`${out} no longer describes this repository.\n`);
    for (const k of drifted) {
      console.error(`  ${k}`);
      // `workspaces` is an array of sizeable objects. Printing both copies whole
      // buries the one changed field in a wall of JSON, so narrow it to the
      // workspace that actually differs and the field within it.
      if (k === 'workspaces') {
        const byPath = (arr) => new Map((arr ?? []).map((w) => [w.path, w]));
        const before = byPath(committed[k]);
        const after = byPath(structural[k]);
        for (const path of new Set([...before.keys(), ...after.keys()])) {
          const a = before.get(path);
          const b = after.get(path);
          if (!a) { console.error(`    + ${path} (new workspace)`); continue; }
          if (!b) { console.error(`    - ${path} (no longer present)`); continue; }
          for (const field of new Set([...Object.keys(a), ...Object.keys(b)])) {
            if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
              console.error(`    ~ ${path}.${field}: ${JSON.stringify(a[field])} -> ${JSON.stringify(b[field])}`);
            }
          }
        }
      } else if (Array.isArray(committed[k]) && Array.isArray(structural[k])) {
        const before = new Set(committed[k].map((x) => JSON.stringify(x)));
        const after = new Set(structural[k].map((x) => JSON.stringify(x)));
        for (const x of after) if (!before.has(x)) console.error(`    + ${JSON.parse(x)}`);
        for (const x of before) if (!after.has(x)) console.error(`    - ${JSON.parse(x)}`);
      } else {
        console.error(`    committed: ${JSON.stringify(committed[k])}`);
        console.error(`    actual:    ${JSON.stringify(structural[k])}`);
      }
    }
    console.error(`\nRun \`npm run inventory\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${out} matches the repository: ${workspaces.length} workspaces, ${structural.untested_workspaces.length} without a test runner.`);
} else {
  writeFileSync(outPath, JSON.stringify(inventory, null, 2) + '\n');
  console.log(`${out}: ${workspaces.length} workspaces, ${structural.untested_workspaces.length} without a test runner`);
}
