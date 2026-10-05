// Generates .neterverse/state/connector-registry.json from the kernel's
// connector declarations in packages/neterverse-kernel/src/connectors.ts.
//
// Generated rather than hand-maintained, because this repository had the same
// facts written down three times -- in the kernel, in the committed registry,
// and in docs/CONNECTORS.md -- and two of the three had already drifted:
//
//   * google-drive  write_authorized: code said false; the registry and the doc
//                   both recorded the principal authorizing writes on
//                   2026-10-03, exercised once (SOURCE_CONFLICTS.md SC-11).
//   * notion        write_authorized: the registry said true; the code said
//                   false and the doc has it gated. Nothing recorded an
//                   authorization, so the registry was claiming one that did
//                   not exist -- a ❓ UNKNOWN rendered as ✅.
//
// Declarations and prose are different kinds of thing, so they keep different
// homes rather than being merged into one file:
//
//   connectors.ts        the only source for the machine fields. The kernel
//                        reads it to budget freshness and to refuse an
//                        observation against an undeclared connector.
//   connector-registry   this file's output. What the bus reads.
//   docs/CONNECTORS.md   what neither can express: a per-connector verdict
//                        (✅ / 🟡 / ⛔️), the boundary prose, the ungoverned
//                        infrastructure gap, and the connectors a session can
//                        reach that the control plane never observes. It is
//                        deliberately broader than the eight declared here.
//
// What this does NOT generate is any claim that a connector currently works.
// The old hand-written file carried verification_state and last_verified on
// every entry, and `bus status` printed "8 LIVE_VERIFIED" from them -- a claim
// that aged silently and was weeks stale. Freshness is computed from live
// observations under .neterverse/live/ by `npm run bus -- connectors`, and the
// schema no longer has a field those stored claims could live in.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = '.neterverse/state/connector-registry.json';
const DOC = 'docs/CONNECTORS.md';

const { CONNECTORS } = await import(
  new URL('../packages/neterverse-kernel/src/connectors.ts', import.meta.url).href
);

// Sorted by id so the committed file has a stable order no matter how the
// declarations are arranged in source.
const entries = [...CONNECTORS]
  .sort((a, b) => a.connector_id.localeCompare(b.connector_id))
  .map((c) => ({
    connector_id: c.connector_id,
    name: c.name,
    role: c.role,
    system_of_record_for: c.system_of_record_for,
    freshness_minutes: c.freshness_minutes,
    lane_scope: c.lane_scope,
    write_authorized: c.write_authorized,
  }));

const structural = {
  generated_by: 'scripts/build-connectors.mjs',
  source: 'packages/neterverse-kernel/src/connectors.ts',
  classification: 'PUBLIC',
  method:
    'Declarations only. Generated from the kernel, never edited here - change connectors.ts and re-run `npm run connectors`. ' +
    'Nothing in this file says a connector currently works: whether an observation is fresh is computed at runtime from ' +
    '.neterverse/live/ by `npm run bus -- connectors`. There is deliberately no stored verification state, because a stored one ages silently.',
  identifier_policy:
    'This repository is public. Account identifiers, workspace IDs, file IDs, calendar addresses and record contents stay in ' +
    'their private systems of record and are never written here.',
  write_authorized_note:
    'Records whether the principal authorized writes through a connector at all. It is declarative - nothing in the kernel reads ' +
    'it to permit or refuse a write - and it is never blanket permission: a task still has to authorize the specific write. ' +
    'Per-connector verdicts and the actions each one may not take are in docs/CONNECTORS.md.',
  entries,
};

const volatile = { generated_at: new Date().toISOString() };
const STRUCTURAL_KEYS = Object.keys(structural);
const outPath = join(ROOT, OUT);

/**
 * One direction only: every connector the control plane observes must be
 * documented for a human. The doc legitimately lists far more than this -- a
 * session can reach Cloudflare, Firecrawl, Zapier and others that the bus never
 * observes -- so the reverse is not an error and is not checked.
 */
function connectorsMissingFromDoc() {
  const docPath = join(ROOT, DOC);
  if (!existsSync(docPath)) return entries.map((e) => e.name);
  const doc = readFileSync(docPath, 'utf-8');
  return entries.filter((e) => !doc.includes(`| ${e.name} `) && !doc.includes(`${e.name} |`)).map((e) => e.name);
}

const undocumented = connectorsMissingFromDoc();

if (process.argv.includes('--check')) {
  const failures = [];

  if (!existsSync(outPath)) {
    failures.push(`${OUT} does not exist. Run \`npm run connectors\`.`);
  } else {
    const committed = JSON.parse(readFileSync(outPath, 'utf-8'));
    const drifted = STRUCTURAL_KEYS.filter(
      (k) => JSON.stringify(committed[k]) !== JSON.stringify(structural[k]),
    );
    if (drifted.length > 0) {
      failures.push(
        `${OUT} no longer matches ${structural.source}.\n` +
          `  drifted: ${drifted.join(', ')}\n` +
          '  The registry is generated. Edit the declarations and run `npm run connectors`.',
      );
    }
  }

  if (undocumented.length > 0) {
    failures.push(
      `Declared in the kernel but absent from ${DOC}: ${undocumented.join(', ')}.\n` +
        '  A connector the control plane observes needs a row a human can read, with a verdict.',
    );
  }

  if (failures.length > 0) {
    console.error(failures.join('\n\n'));
    process.exit(1);
  }

  console.log(
    `${OUT} matches ${structural.source}: ${entries.length} connector(s), ` +
      `${entries.filter((e) => e.write_authorized).length} with writes authorized, all documented in ${DOC}.`,
  );
} else {
  writeFileSync(outPath, JSON.stringify({ ...structural, ...volatile }, null, 2) + '\n');
  console.log(`Wrote ${OUT} from ${structural.source}: ${entries.length} connector(s).`);
  for (const e of entries) {
    console.log(
      `  ${e.connector_id.padEnd(18)} ${String(e.freshness_minutes).padStart(5)} min  ` +
        `write=${e.write_authorized ? 'yes' : 'no '}  ${e.lane_scope.join('/')}`,
    );
  }
  if (undocumented.length > 0) {
    console.error(`\nNot documented in ${DOC}: ${undocumented.join(', ')}. \`connectors:check\` will fail.`);
    process.exit(1);
  }
}
