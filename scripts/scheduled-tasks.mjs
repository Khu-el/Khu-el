#!/usr/bin/env node
// Validate the scheduled-task definitions in docs/scheduled-tasks/.
//
//   node scripts/scheduled-tasks.mjs            # what CI runs
//
// SPEC v2 says "No orphan tasks" and "A task is not scheduled until it has a row
// here and a filled-in file in tasks/". Nothing enforced either, so a task could
// be scheduled with no definition, or defined with no row, and the registry
// would still read as correct. This checks the parts of that promise a script
// can check.
//
// What it cannot check, stated plainly so the green line is not read as more
// than it is: whether a Routine ID names a Routine that actually exists, and
// whether a running Routine has a definition here at all. Both live in the
// Routines API, not in this repository. The registry is the record of intent;
// reconciling it against what is actually scheduled is a task's job, not a
// validator's.
//
// Zero dependencies, like claude-projects.mjs next door: this runs on a fresh
// clone before `npm install` has ever happened.
//
// Governing spec: docs/scheduled-tasks/SPEC.md

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(REPO_ROOT, 'docs', 'scheduled-tasks');
const TASKS_DIR = join(DOCS, 'tasks');
const REGISTRY = join(DOCS, 'REGISTRY.md');

// Every section SPEC.md defines. The template ships all of them, so a file
// copied from it starts complete and the check is about filling them in.
const REQUIRED_SECTIONS = [
  'MISSION', 'CAPACITY', 'SCHEDULE / TRIGGER', 'INPUTS', 'CANONICAL ARTIFACTS',
  'PRIOR-RUN CONTINUITY', 'WEB RESEARCH MODE', 'RESEARCH QUESTIONS', 'SOURCE PRIORITY',
  'RED-TEAM CHECK', 'PROCESS', 'SCENARIOS', 'VISUALS REQUIRED', 'GRAPHICS',
  'OUTPUT ARTIFACT', 'DISPLAY STANDARD', 'EVIDENCE', 'CONTRADICTIONS',
  'EXCEPTION CONDITIONS', 'GUARDRAILS', 'PROOF REQUIRED', 'STATE UPDATE',
  'HANDOFF', 'SUCCESS METRIC', 'KILL / MERGE RULE', 'SCALE CHECK', 'FINAL OUTPUT',
];

const CAPACITIES = ['PERS', 'HOPE', 'VZB', 'REPR', 'DIGP', 'NTE', 'HOR', 'CCRLT', 'MM', 'OTHER'];
const VALID_STATUS = ['DRAFT', 'ACTIVE', 'PAUSED', 'MERGED', 'REPLACED', 'TERMINATED'];
// A status that means the task is meant to be firing right now.
const LIVE_STATUS = ['ACTIVE'];
const WEB_MODES = ['NONE', 'QUICK VERIFY', 'STANDARD RESEARCH', 'DEEP RESEARCH'];

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

/**
 * Strip code ticks and *paired* emphasis so `ACTIVE` and **ACTIVE** compare equal.
 *
 * Only paired, and only wrapping the whole value: a blanket strip of [*_~] also
 * eats the asterisks in a cron expression, turning `0 12 * * 1` into "0 12   1"
 * and reporting a valid schedule as malformed.
 */
function bare(s) {
  let v = String(s).replace(/`/g, '').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const mark of ['**', '__', '~~', '*', '_']) {
      if (v.length > mark.length * 2 && v.startsWith(mark) && v.endsWith(mark)) {
        v = v.slice(mark.length, -mark.length).trim();
        changed = true;
      }
    }
  }
  return v;
}

/** The raw lines of a section, heading excluded. */
function sectionLines(source, heading) {
  const lines = source.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && bare(l.replace(/^##\s*/, '')).toUpperCase().includes(heading));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * A section counts as filled only once template scaffolding is gone: guidance
 * comments, empty bullets, and table rows with nothing in any cell. Used to
 * judge emptiness only -- never to parse, because stripping rows this way
 * damages a real table. Parsing reads sectionLines() instead.
 */
function sectionBody(source, heading) {
  const lines = sectionLines(source, heading);
  if (lines === null) return null;
  return lines
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')                        // template guidance comments
    .replace(/^\s*[-*]\s*$/gm, '')                           // empty bullets
    .replace(/^\s*\|[\s|:-]*\|\s*$/gm, '')                   // separator rows and all-empty rows
    .trim();
}

function parseHeaderTable(source) {
  const out = {};
  for (const line of source.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length !== 2) continue;
    const key = bare(c[0]).replace(/^[^\w]+/, '').trim().toLowerCase();
    if (key) out[key] = bare(c[1]);
  }
  return out;
}

/** Five space-separated cron fields, each a plausible cron token. */
function isCron(v) {
  const f = v.trim().split(/\s+/);
  return f.length === 5 && f.every((x) => /^[\d*,\-/]+$/.test(x));
}

function checkTask(file) {
  const id = file.replace(/\.md$/, '');
  const source = readFileSync(join(TASKS_DIR, file), 'utf8');
  const header = parseHeaderTable(source);

  const m = /^ST-([A-Z]+)-(\d{3})$/.exec(id);
  if (!m) {
    fail(id, 'filename is not a valid task ID (expected ST-<CAPACITY>-<NNN>)');
    return null;
  }
  const [, capacity] = m;
  if (!CAPACITIES.includes(capacity)) fail(id, `capacity "${capacity}" is not one of ${CAPACITIES.join(', ')}`);

  if (header['task id'] && header['task id'] !== id) {
    fail(id, `header Task ID is "${header['task id']}" but the file is named ${id}.md`);
  }
  if (!header['name']) fail(id, 'header has no Name');

  const status = header['status'];
  // The template ships the whole menu on one line; that is an unfilled field.
  if (!status || status.includes('/')) fail(id, 'header Status is still the template placeholder');
  else if (!VALID_STATUS.includes(status)) fail(id, `status "${status}" is not one of ${VALID_STATUS.join(', ')}`);

  for (const section of REQUIRED_SECTIONS) {
    const body = sectionBody(source, section);
    if (body === null) fail(id, `missing section: ${section}`);
    else if (body === '') fail(id, `section is empty: ${section}`);
  }

  // SPEC: "Record the local time and the UTC cron so the conversion is auditable."
  const schedFields = {};
  for (const line of sectionLines(source, 'SCHEDULE / TRIGGER') ?? []) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length === 2) schedFields[bare(c[0]).toLowerCase()] = bare(c[1]);
  }
  const cron = schedFields['utc cron'];
  const localTime = schedFields['local time'];
  const tz = schedFields['timezone'];
  if (!cron) fail(id, 'SCHEDULE / TRIGGER has no UTC cron');
  else if (!isCron(cron)) fail(id, `UTC cron "${cron}" is not five cron fields`);
  if (!localTime) fail(id, 'SCHEDULE / TRIGGER has no local time — the UTC conversion must stay auditable');
  if (!tz) fail(id, 'SCHEDULE / TRIGGER has no timezone');

  const web = (sectionBody(source, 'WEB RESEARCH MODE') ?? '').toUpperCase();
  if (web && !WEB_MODES.some((mode) => web.includes(mode))) {
    fail(id, `WEB RESEARCH MODE must state one of ${WEB_MODES.join(' / ')}`);
  }

  // "No orphan tasks" is the spec's own phrase; HANDOFF is where it is honoured.
  const handoff = sectionBody(source, 'HANDOFF') ?? '';
  if (handoff && /^(tbd|todo|\?+)$/i.test(handoff)) fail(id, 'HANDOFF is a placeholder — no orphan tasks');

  const routine = header['routine id'] ?? '';
  const routineLooksReal = /^trig_[A-Za-z0-9]+$/.test(routine);
  if (LIVE_STATUS.includes(status) && !routineLooksReal) {
    fail(id, `status is ${status} but Routine ID is "${routine || 'empty'}" — an active task names the Routine that fires it`);
  }
  if (routine && !routineLooksReal && !/fill in after scheduling/i.test(routine)) {
    fail(id, `Routine ID "${routine}" is neither a trig_… id nor the template placeholder`);
  }

  return { id, capacity, status, name: header['name'], routine: routineLooksReal ? routine : '' };
}

function checkRegistry(tasks) {
  if (!existsSync(REGISTRY)) {
    errors.push('REGISTRY.md: missing');
    return;
  }
  const source = readFileSync(REGISTRY, 'utf8');
  const rows = new Map();
  const nextIds = new Map();
  let inNextTable = false;

  for (const line of source.split('\n')) {
    if (/^##\s/.test(line)) inNextTable = /next sequence/i.test(line);
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);

    if (inNextTable && c.length === 2) {
      const cap = bare(c[0]);
      if (CAPACITIES.includes(cap)) nextIds.set(cap, bare(c[1]));
      continue;
    }
    if (c.length < 8) continue;
    const id = bare(c[0]);
    if (!/^ST-[A-Z]+-\d{3}$/.test(id)) continue;
    rows.set(id, { capacity: bare(c[2]), status: bare(c[4]), routine: bare(c[6]) });
  }

  for (const t of tasks) {
    const row = rows.get(t.id);
    if (!row) {
      fail(t.id, 'has a definition file but no row in REGISTRY.md');
      continue;
    }
    rows.delete(t.id);
    if (row.capacity && row.capacity !== t.capacity) {
      fail(t.id, `capacity is "${row.capacity}" in REGISTRY.md but "${t.capacity}" in the definition`);
    }
    if (row.status && row.status !== t.status) {
      fail(t.id, `status is "${row.status}" in REGISTRY.md but "${t.status}" in the definition`);
    }
    const rowRoutine = /^trig_[A-Za-z0-9]+$/.test(row.routine) ? row.routine : '';
    if (t.routine && rowRoutine && rowRoutine !== t.routine) {
      fail(t.id, `Routine ID is "${rowRoutine}" in REGISTRY.md but "${t.routine}" in the definition`);
    }
    if (LIVE_STATUS.includes(t.status) && !rowRoutine) {
      fail(t.id, `is ${t.status} but REGISTRY.md records no Routine ID for it`);
    }
  }
  for (const id of rows.keys()) fail(id, 'has a row in REGISTRY.md but no file in tasks/');

  // A stale "next ID" silently hands the same number to two tasks.
  const highest = new Map();
  for (const t of tasks) {
    const n = Number(t.id.slice(-3));
    if (!highest.has(t.capacity) || n > highest.get(t.capacity)) highest.set(t.capacity, n);
  }
  for (const [cap, used] of highest) {
    const declared = nextIds.get(cap);
    if (!declared) continue;
    const n = Number(String(declared).slice(-3));
    if (Number.isFinite(n) && n <= used) {
      fail(`REGISTRY.md`, `next ID for ${cap} is ${declared}, but ${String(used).padStart(3, '0')} is already used — the next task would reuse an ID`);
    }
  }
}

if (!existsSync(TASKS_DIR)) {
  console.error(`${TASKS_DIR} does not exist.`);
  process.exit(1);
}

const files = readdirSync(TASKS_DIR).filter((f) => f.endsWith('.md')).sort();
const tasks = files.map(checkTask).filter(Boolean);
checkRegistry(tasks);

if (errors.length > 0) {
  console.error('Scheduled task definitions do not satisfy SPEC.md:\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}. See docs/scheduled-tasks/SPEC.md.`);
  process.exit(1);
}

const active = tasks.filter((t) => LIVE_STATUS.includes(t.status));
console.log(`✅ ${tasks.length} scheduled task definition${tasks.length === 1 ? '' : 's'} valid, registry consistent.`);
if (tasks.length > 0) {
  console.log(`   ${active.length} ACTIVE, each naming the Routine that fires it.`);
}
console.log(`   ℹ️  Whether those Routines exist, and whether anything else is scheduled without a`);
console.log(`      definition here, is not checkable from this repository — see ST-NTE-001.`);
