#!/usr/bin/env node
// Validate the Claude Project definitions in docs/claude-projects/, and assemble
// each project's upload bundle.
//
//   node scripts/claude-projects.mjs --check          # what CI runs
//   node scripts/claude-projects.mjs --build          # bundle every project
//   node scripts/claude-projects.mjs --build CP-NTE-001
//
// Zero dependencies, like the kernel next door: this must run on a fresh clone
// before `npm install` has ever happened.
//
// Governing spec: docs/claude-projects/SPEC.md

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(REPO_ROOT, 'docs', 'claude-projects');
const PROJECTS_DIR = join(DOCS, 'projects');
const REGISTRY = join(DOCS, 'REGISTRY.md');
const OUT_ROOT = join(REPO_ROOT, 'build', 'claude-projects');

// Where each repo named in a manifest lives on disk. Siblings are resolved next
// to this repo by default; override for a different checkout layout.
const REPO_ROOTS = {
  'Khu-el/Khu-el': REPO_ROOT,
  'Khu-el/Neterverse_DAO': process.env.NETERVERSE_DAO_ROOT || join(REPO_ROOT, '..', 'Neterverse_DAO'),
  'Khu-el/Mental-Alchemy': process.env.MENTAL_ALCHEMY_ROOT || join(REPO_ROOT, '..', 'Mental-Alchemy'),
};

// Never loadable as project knowledge. Secrets, runtime data, the gitignored
// control-plane observations, and bulk files with no governance content.
// SPEC.md section "3. Secrets are never sources".
const BANNED = [
  // `.env.example` and friends are committed, value-free, and the correct way to
  // record which secrets exist. Every other `.env` file carries real values.
  { test: (p) => /(^|\/)\.env(\.|$)/.test(p) && !/\.env\.(example|sample|template)$/.test(p), why: 'secrets' },
  { test: (p) => p.includes('node_modules'), why: 'dependency tree' },
  { test: (p) => /(^|\/)package-lock\.json$/.test(p), why: 'no governance content' },
  { test: (p) => p.startsWith('server/data'), why: 'runtime database' },
  { test: (p) => p.startsWith('server/uploads/') && !p.endsWith('.gitkeep'), why: 'uploaded user files' },
  { test: (p) => p.startsWith('.neterverse/live'), why: 'gitignored observations carrying identifiers' },
  { test: (p) => /(^|\/)dist(\/|$)/.test(p), why: 'build output' },
];

const REQUIRED_SECTIONS = ['MISSION', 'CAPACITY', 'CUSTOM INSTRUCTIONS', 'SOURCES', 'REBUILD TRIGGERS', 'PROVENANCE'];
const VALID_STATUS = ['DRAFT', 'ACTIVE', 'PAUSED', 'MERGED', 'REPLACED', 'ARCHIVED'];
const VALID_LANES = ['LANE_A', 'LANE_B', 'PERSONAL', 'PHILANTHROPIC', 'UNCLASSIFIED'];
const VALID_CLASSES = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

const errors = [];
// Sources in a repo that is not checked out here cannot be verified. CI checks out
// one repo, so this is the normal case rather than a problem — aggregated by repo
// so it stays one line instead of one per source.
const unverified = new Map();
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

/** Split a markdown table row into trimmed cells, dropping the outer pipes. */
const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

/** Strip surrounding backticks and any trailing marker such as a 🔵 flag. */
const bare = (v) => (v.match(/`([^`]+)`/)?.[1] ?? v).trim();

function parseProject(file) {
  const raw = readFileSync(file, 'utf8');
  const lines = raw.split('\n');
  const id = file.replace(/.*\//, '').replace(/\.md$/, '');

  // --- header field table: everything before the first "## " heading ---
  const headEnd = lines.findIndex((l) => l.startsWith('## '));
  const fields = {};
  for (const line of lines.slice(0, headEnd === -1 ? lines.length : headEnd)) {
    if (!line.startsWith('|') || /^\|[\s:-]+\|/.test(line)) continue;
    const c = cells(line);
    if (c.length < 2) continue;
    const label = c[0].replace(/[^\x20-\x7E]/g, '').trim(); // drop emoji
    if (label && label !== 'Field') fields[label] = c[1];
  }

  // --- custom instructions: first fenced block under the CUSTOM INSTRUCTIONS heading ---
  let instructions = '';
  const insHeading = lines.findIndex((l) => /^##\s.*CUSTOM INSTRUCTIONS/.test(l));
  if (insHeading !== -1) {
    const open = lines.findIndex((l, i) => i > insHeading && l.startsWith('```'));
    if (open !== -1) {
      const close = lines.findIndex((l, i) => i > open && l.startsWith('```'));
      if (close !== -1) instructions = lines.slice(open + 1, close).join('\n').trim();
    }
  }

  // --- sources table: rows under the SOURCES heading, stopping at the next heading ---
  const sources = [];
  const srcHeading = lines.findIndex((l) => /^##\s.*SOURCES/.test(l));
  if (srcHeading !== -1) {
    for (let i = srcHeading + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#')) break;
      if (!line.startsWith('|') || /^\|[\s:-]+\|/.test(line)) continue;
      const c = cells(line);
      if (c.length < 4 || c[0] === 'Repo') continue;
      sources.push({ repo: c[0], path: c[1], why: c[2], cls: bare(c[3]) });
    }
  }

  const sections = lines.filter((l) => l.startsWith('## ')).map((l) => l.replace(/^##\s+/, ''));
  return { id, file, fields, instructions, sources, sections, raw };
}

function checkProject(p) {
  const id = p.id;

  for (const name of REQUIRED_SECTIONS) {
    if (!p.sections.some((s) => s.includes(name))) fail(id, `missing required section "${name}"`);
  }

  const declaredId = bare(p.fields['Project ID'] || '');
  if (declaredId !== id) fail(id, `Project ID in the table is "${declaredId}" but the filename says "${id}"`);

  const status = bare(p.fields['Status'] || '').split(/\s+/)[0];
  if (!VALID_STATUS.includes(status)) fail(id, `status "${status}" is not one of ${VALID_STATUS.join(', ')}`);

  const lane = bare(p.fields['Lane'] || '');
  if (!VALID_LANES.includes(lane)) fail(id, `lane "${lane}" is not one of ${VALID_LANES.join(', ')}`);

  const cls = bare(p.fields['Highest class'] || '');
  if (!VALID_CLASSES.includes(cls)) fail(id, `highest class "${cls}" is not one of ${VALID_CLASSES.join(', ')}`);

  if (!p.fields['Name']) fail(id, 'no Name in the header table');
  if (!p.fields['Capacity']) fail(id, 'no Capacity in the header table');
  if (!p.instructions) fail(id, 'CUSTOM INSTRUCTIONS has no fenced block, or the block is empty');
  if (p.sources.length === 0) fail(id, 'SOURCES lists no rows');

  // The highest class recorded in the header must actually be the strictest one
  // in the manifest, or the registry misreports the project's sensitivity.
  const rank = (c) => VALID_CLASSES.indexOf(c);
  let strictest = 'PUBLIC';
  for (const s of p.sources) {
    if (!VALID_CLASSES.includes(s.cls)) {
      fail(id, `source "${s.path}" has classification "${s.cls}", which is not one of ${VALID_CLASSES.join(', ')}`);
      continue;
    }
    if (rank(s.cls) > rank(strictest)) strictest = s.cls;
  }
  if (VALID_CLASSES.includes(cls) && rank(cls) < rank(strictest)) {
    fail(id, `header says highest class ${cls} but the manifest contains a ${strictest} source`);
  }

  for (const s of p.sources) {
    const banned = BANNED.find((b) => b.test(s.path));
    if (banned) {
      fail(id, `source "${s.path}" may never be loaded (${banned.why}) — see SPEC.md, the source rule`);
      continue;
    }
    const root = REPO_ROOTS[s.repo];
    if (!root) {
      fail(id, `source "${s.path}" names repo "${s.repo}", which has no known checkout location`);
      continue;
    }
    if (!existsSync(root)) {
      const seen = unverified.get(s.repo) || { count: 0, ids: new Set() };
      seen.count += 1;
      seen.ids.add(id);
      unverified.set(s.repo, seen);
      continue;
    }
    if (!existsSync(join(root, s.path))) fail(id, `source "${s.repo}/${s.path}" does not exist`);
  }
}

function checkRegistry(projects) {
  if (!existsSync(REGISTRY)) {
    errors.push('REGISTRY.md: missing');
    return;
  }
  const rows = new Map();
  for (const line of readFileSync(REGISTRY, 'utf8').split('\n')) {
    if (!line.startsWith('|') || /^\|[\s:-]+\|/.test(line)) continue;
    const c = cells(line);
    if (c.length < 7) continue;
    const id = bare(c[0]);
    if (!/^CP-[A-Z]+-\d+$/.test(id)) continue;
    rows.set(id, { name: c[1], capacity: bare(c[2]), lane: bare(c[3]), cls: bare(c[4]), status: bare(c[5]) });
  }

  for (const p of projects) {
    const row = rows.get(p.id);
    if (!row) {
      fail(p.id, 'has a definition file but no row in REGISTRY.md');
      continue;
    }
    const cmp = [
      ['name', row.name, p.fields['Name']],
      ['lane', row.lane, bare(p.fields['Lane'] || '')],
      ['highest class', row.cls, bare(p.fields['Highest class'] || '')],
      ['status', row.status, bare(p.fields['Status'] || '').split(/\s+/)[0]],
    ];
    for (const [what, inRegistry, inFile] of cmp) {
      if (inRegistry !== inFile) fail(p.id, `${what} is "${inRegistry}" in REGISTRY.md but "${inFile}" in the definition`);
    }
    rows.delete(p.id);
  }
  for (const id of rows.keys()) fail(id, 'has a row in REGISTRY.md but no file in projects/');
}

function copyInto(srcRoot, relPath, destDir) {
  const src = join(srcRoot, relPath);
  const st = statSync(src);
  if (st.isDirectory()) {
    let n = 0;
    for (const entry of readdirSync(src)) n += copyInto(srcRoot, join(relPath, entry), destDir);
    return n;
  }
  const dest = join(destDir, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  return 1;
}

function build(projects, only) {
  const built = [];
  for (const p of projects) {
    if (only && p.id !== only) continue;
    const outDir = join(OUT_ROOT, p.id);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    let copied = 0;
    const skipped = [];
    for (const s of p.sources) {
      const root = REPO_ROOTS[s.repo];
      if (!root || !existsSync(root) || !existsSync(join(root, s.path))) {
        skipped.push(`${s.repo}/${s.path}`);
        continue;
      }
      copied += copyInto(root, s.path, join(outDir, s.repo.replace('/', '__')));
    }

    writeFileSync(join(outDir, '00-INSTRUCTIONS.md'),
      `# ${p.fields['Name']} — custom instructions\n\n` +
      `Paste the block below into the project's instructions field on claude.ai.\n` +
      `Source of truth: \`docs/claude-projects/projects/${p.id}.md\`.\n\n` +
      '```text\n' + p.instructions + '\n```\n');

    const built_at = new Date().toISOString();
    writeFileSync(join(outDir, '00-MANIFEST.md'),
      `# ${p.id} — ${p.fields['Name']}\n\n` +
      `| Field | Value |\n|---|---|\n` +
      `| Capacity | ${p.fields['Capacity']} |\n` +
      `| Lane | ${p.fields['Lane']} |\n` +
      `| Highest class | ${p.fields['Highest class']} |\n` +
      `| Files | ${copied} |\n` +
      `| Built at | ${built_at} |\n\n` +
      `Everything in this bundle is a **copy as of the build time above**. It is\n` +
      `\`CURRENT_INTERNAL_MODEL\` and is not evidence that the source still says the same thing.\n` +
      `Re-read the source where a conclusion turns on current text.\n\n` +
      `## Sources\n\n| Repo | Path | Why it is here | Class |\n|---|---|---|---|\n` +
      p.sources.map((s) => `| ${s.repo} | ${s.path} | ${s.why} | ${s.cls} |`).join('\n') + '\n' +
      (skipped.length ? `\n## Not included in this build\n\n${skipped.map((s) => `- ${s} — repository not checked out here`).join('\n')}\n` : ''));

    built.push({ id: p.id, copied, skipped: skipped.length, outDir });
  }
  return built;
}

// --- main ---------------------------------------------------------------

const args = process.argv.slice(2);
const mode = args.includes('--build') ? 'build' : 'check';
const only = args.find((a) => /^CP-[A-Z]+-\d+$/.test(a));

if (!existsSync(PROJECTS_DIR)) {
  console.error(`No project definitions at ${relative(REPO_ROOT, PROJECTS_DIR)}`);
  process.exit(1);
}

const projects = readdirSync(PROJECTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => parseProject(join(PROJECTS_DIR, f)));

for (const p of projects) checkProject(p);
checkRegistry(projects);

if (errors.length) {
  console.error(`\n❌ ${errors.length} problem${errors.length === 1 ? '' : 's'} in the Claude Project definitions:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✅ ${projects.length} Claude Project definitions valid, registry consistent.`);
for (const [repo, { count, ids }] of unverified) {
  console.log(`   ℹ️  ${repo} is not checked out here — ${count} source${count === 1 ? '' : 's'} unverified (${[...ids].sort().join(', ')})`);
}

if (mode === 'build') {
  if (only && !projects.some((p) => p.id === only)) {
    console.error(`No such project: ${only}`);
    process.exit(1);
  }
  const built = build(projects, only);
  console.log(`\n📦 Built ${built.length} bundle${built.length === 1 ? '' : 's'} into ${relative(REPO_ROOT, OUT_ROOT)}/\n`);
  for (const b of built) {
    console.log(`   ${b.id}  ${b.copied} files${b.skipped ? `  (${b.skipped} source${b.skipped === 1 ? '' : 's'} unavailable)` : ''}`);
  }
  console.log('\n   Bundles are gitignored. Upload each folder to its project on claude.ai.');
}
