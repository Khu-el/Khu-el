#!/usr/bin/env node
/**
 * `neterverse` - the command surface over the bus.
 *
 * Deliberately small: status, events, lease, validate. Anything that would
 * cross the approval boundary is absent rather than guarded, because a command
 * that exists is a command someone will eventually run.
 */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireBusRoot, readEvents, appendEvent, busPaths, readJson } from './bus.ts';
import { acquireLease, releaseLease, activeLeases } from './leases.ts';
import { validateAllRegistries, formatProblems, loadRegistry } from './registries.ts';
import type { Actor, BusEvent, Lease, RiskTier, Lane, Runtime } from './types.ts';

const USAGE = `neterverse - Neterverse control-plane bus

  status                     Bus summary: registries, active leases, recent events
  events [--limit N]         Print the event log, newest last
  leases                     List leases in force
  lease acquire --task ID --scope S --resources A,B [--runtime R] [--instance I]
                             [--risk R0..R4] [--lane L] [--ttl MINUTES]
  lease release --id LEASE_ID
  validate                   Validate every registry against its schema
  log --kind K --subject S --summary T [--runtime R] [--instance I]
                             [--lane L] [--risk R0..R4]

Exit codes: 0 success, 1 usage or validation failure, 2 lease denied.
`;

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

function actorFrom(argv: string[]): Actor {
  return {
    runtime: (arg(argv, 'runtime') ?? 'CLAUDE_CODE') as Runtime,
    instance_id: arg(argv, 'instance') ?? `cli_${process.pid}`,
  };
}

function cmdStatus(root: string): number {
  const problems = validateAllRegistries(root);
  const leases = activeLeases(root);
  const events = readEvents(root);
  const connectors = loadRegistry<{ name: string; verification_state: string }>(root, 'connector-registry');

  console.log(`bus root         ${root}`);
  console.log(`registries       ${problems.length === 0 ? 'VALID' : `${problems.length} problem(s)`}`);
  console.log(`connectors       ${connectors.entries.length} registered, ` +
    `${connectors.entries.filter((c) => c.verification_state === 'LIVE_VERIFIED').length} LIVE_VERIFIED`);
  console.log(`active leases    ${leases.length}`);
  console.log(`events           ${events.length}`);

  for (const lease of leases) {
    console.log(`  lease ${lease.lease_id} ${lease.agent.runtime} ${lease.scope} -> ${lease.resources.join(', ')} until ${lease.expiration}`);
  }
  for (const e of events.slice(-5)) {
    console.log(`  ${e.timestamp} ${e.kind} ${e.subject}`);
  }
  if (problems.length > 0) {
    console.error(formatProblems(problems));
    return 1;
  }
  return 0;
}

function cmdEvents(root: string, argv: string[]): number {
  const limit = Number(arg(argv, 'limit') ?? '20');
  const events: BusEvent[] = readEvents(root);
  for (const e of events.slice(-limit)) {
    console.log(`${e.timestamp}  ${e.kind.padEnd(22)} ${e.lane.padEnd(13)} ${e.risk_tier}  ${e.subject}`);
    console.log(`    ${e.summary}`);
  }
  return 0;
}

function cmdLeases(root: string): number {
  const leases: Lease[] = activeLeases(root);
  if (leases.length === 0) console.log('No leases in force.');
  for (const l of leases) {
    console.log(`${l.lease_id}  ${l.agent.runtime}/${l.agent.instance_id}  ${l.scope}`);
    console.log(`    resources: ${l.resources.join(', ')}`);
    console.log(`    expires:   ${l.expiration}`);
  }
  return 0;
}

function cmdLease(root: string, argv: string[]): number {
  const sub = argv[1];

  if (sub === 'release') {
    const id = arg(argv, 'id');
    if (!id) { console.error('lease release requires --id'); return 1; }
    if (!releaseLease(root, id)) { console.error(`No lease ${id}.`); return 1; }
    console.log(`Released ${id}.`);
    return 0;
  }

  if (sub !== 'acquire') { console.error(USAGE); return 1; }

  const task = arg(argv, 'task');
  const scope = arg(argv, 'scope');
  const resources = (arg(argv, 'resources') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!task || !scope || resources.length === 0) {
    console.error('lease acquire requires --task, --scope and --resources');
    return 1;
  }

  const result = acquireLease(root, {
    task_id: task,
    agent: actorFrom(argv),
    scope,
    resources,
    risk_tier: (arg(argv, 'risk') ?? 'R1') as RiskTier,
    lane: (arg(argv, 'lane') ?? 'UNCLASSIFIED') as Lane,
    ...(arg(argv, 'ttl') ? { ttl_minutes: Number(arg(argv, 'ttl')) } : {}),
  });

  if (!result.ok) {
    console.error('Lease DENIED. Held by:');
    for (const c of result.conflicts) {
      console.error(`  ${c.lease.lease_id} (${c.lease.agent.runtime}/${c.lease.agent.instance_id}) holds ${c.resources.join(', ')}`);
    }
    console.error('Read that agent\'s handoff and take non-conflicting work.');
    return 2;
  }
  console.log(`Acquired ${result.lease.lease_id} until ${result.lease.expiration}.`);
  return 0;
}

function cmdValidate(root: string): number {
  const problems = validateAllRegistries(root);
  if (problems.length === 0) { console.log('All registries valid.'); return 0; }
  console.error(formatProblems(problems));
  return 1;
}

function cmdLog(root: string, argv: string[]): number {
  const kind = arg(argv, 'kind');
  const subject = arg(argv, 'subject');
  const summary = arg(argv, 'summary');
  if (!kind || !subject || !summary) {
    console.error('log requires --kind, --subject and --summary');
    return 1;
  }
  const event = appendEvent(root, {
    kind: kind as BusEvent['kind'],
    actor: actorFrom(argv),
    lane: (arg(argv, 'lane') ?? 'UNCLASSIFIED') as Lane,
    risk_tier: (arg(argv, 'risk') ?? 'R1') as RiskTier,
    subject,
    summary,
  });
  console.log(`Appended ${event.event_id}.`);
  return 0;
}

function main(argv: string[]): number {
  const command = argv[0];
  if (!command || command === 'help' || command === '--help') { console.log(USAGE); return 0; }

  const root = requireBusRoot();
  switch (command) {
    case 'status': return cmdStatus(root);
    case 'events': return cmdEvents(root, argv);
    case 'leases': return cmdLeases(root);
    case 'lease': return cmdLease(root, argv);
    case 'validate': return cmdValidate(root);
    case 'log': return cmdLog(root, argv);
    default:
      console.error(`Unknown command "${command}".\n\n${USAGE}`);
      return 1;
  }
}

/**
 * Self-execute only when this file is the entry point, so tests can import
 * `main` without the CLI running itself on import. Compared through
 * `realpathSync` so a symlinked bin resolves to the same file.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2));
}

export { main };

// `readJson` and `busPaths` are re-exported for scripts that extend the CLI.
export { readJson, busPaths };
