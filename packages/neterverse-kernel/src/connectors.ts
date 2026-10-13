/**
 * Connector declarations: what each system of record is authoritative for, and
 * how fresh an observation of it has to be before the control plane should stop
 * trusting its own summary.
 *
 * THIS FILE IS THE ONLY SOURCE for those facts.
 * `.neterverse/state/connector-registry.json` is GENERATED from it by
 * `npm run connectors`, and `npm run connectors:check` fails when the committed
 * copy has drifted. It used to be hand-maintained beside this file, and the two
 * had already disagreed about which connectors may be written to -- which is the
 * whole argument for generating it. `docs/CONNECTORS.md` keeps what neither can
 * express: a per-connector verdict, the boundary prose, and the connectors a
 * session can reach that the control plane never observes.
 *
 * No credentials and no network calls live here, by design. The kernel never
 * holds a secret and never opens a socket; an authorized runtime performs the
 * read and hands the result to `recordObservation`. That split is what lets the
 * kernel run on a fresh clone with nothing configured, and what keeps a token
 * out of a public repository.
 */

import type { Lane } from './types.ts';

export interface ConnectorDeclaration {
  connector_id: string;
  name: string;
  /** One line on what this connector is for. The generated registry carries it. */
  role: string;
  /** What this system is the authority for. Everything else about it is a projection. */
  system_of_record_for: string[];
  /**
   * How long an observation stays useful, in minutes.
   *
   * These are judgements about rate of change, not guarantees. A task ledger
   * moves hourly; a document store moves daily; an entity's own identity
   * barely moves at all. Past this budget the control plane reports the entry
   * as stale rather than quietly presenting an old number as current.
   */
  freshness_minutes: number;
  lane_scope: Lane[];
  /**
   * Whether the principal has authorized writes through this connector at all.
   *
   * DECLARATIVE, NOT A GATE. Nothing in the kernel reads this to permit or
   * refuse a write -- a write happens in an authorized runtime, outside here.
   * It records a human decision so the registry cannot claim an authorization
   * nobody gave, which is exactly how the hand-maintained copy came to assert
   * Notion writes that no record supports. A task still has to authorize the
   * specific write; blanket connector-level permission is not a thing.
   */
  write_authorized: boolean;
}

export const CONNECTORS: readonly ConnectorDeclaration[] = [
  {
    connector_id: 'github',
    name: 'GitHub',
    role: 'Source code, branches, pull requests and releases - software version truth',
    system_of_record_for: ['source code', 'branches', 'pull requests', 'releases'],
    freshness_minutes: 60,
    lane_scope: ['LANE_A'],
    write_authorized: true,
  },
  {
    connector_id: 'clickup',
    name: 'ClickUp',
    role: 'Action truth - the task execution ledger',
    system_of_record_for: ['tasks', 'execution status'],
    freshness_minutes: 240,
    lane_scope: ['LANE_A', 'LANE_B'],
    write_authorized: false,
  },
  {
    connector_id: 'google-calendar',
    name: 'Google Calendar',
    role: 'Commitment truth - scheduled events and availability',
    system_of_record_for: ['commitments', 'scheduled events'],
    freshness_minutes: 240,
    lane_scope: ['LANE_A', 'PERSONAL'],
    write_authorized: false,
  },
  {
    // Writes authorized by the principal 2026-10-03 and exercised once: the
    // document the governance hub linked as an entity registry was renamed in
    // place to declare it a superseded AI draft (SOURCE_CONFLICTS.md SC-11).
    // This flag said false until 2026-10-05 while both the hand-maintained
    // registry and docs/CONNECTORS.md recorded the authorization -- the drift
    // that generating the registry is meant to stop. Sharing and trashing are
    // NOT covered: a share changes who can see a file (a §10 publish action),
    // and Drive can trash a file without being able to restore it.
    connector_id: 'google-drive',
    name: 'Google Drive',
    role: 'Canonical files, evidence and issued artifacts',
    system_of_record_for: ['evidence', 'issued artifacts', 'release packets'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A', 'LANE_B', 'PERSONAL'],
    write_authorized: true,
  },
  {
    connector_id: 'gmail',
    name: 'Gmail',
    role: 'Correspondence - reading, searching and drafting only',
    system_of_record_for: ['email correspondence'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A', 'PERSONAL'],
    write_authorized: false,
  },
  {
    // Stays false. The hand-maintained registry asserted true; nothing records
    // an authorization, and docs/CONNECTORS.md has it gated. An unsupported
    // true is a ❓ UNKNOWN rendered as ✅, so the generated registry drops it.
    connector_id: 'notion',
    name: 'Notion',
    role: 'Governance registries and the knowledge base',
    system_of_record_for: ['governance registries', 'knowledge base'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A'],
    write_authorized: false,
  },
  {
    // ADR-0003: the private runtime store for jobs. Writes go through the
    // runner's own jr_* functions only, never through raw table writes.
    connector_id: 'supabase',
    name: 'Supabase',
    role: 'Durable job state for the orchestration runner (ADR-0003)',
    system_of_record_for: ['job state', 'job approvals', 'job audit chain'],
    freshness_minutes: 240,
    lane_scope: ['LANE_A'],
    write_authorized: true,
  },
  {
    connector_id: 'linear',
    name: 'Linear',
    role: 'Issue tracking. Connected but routed nothing - no task uses it',
    system_of_record_for: ['issue tracking (unused by any task)'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A'],
    write_authorized: false,
  },
];

export function findConnector(connectorId: string): ConnectorDeclaration | undefined {
  return CONNECTORS.find((c) => c.connector_id === connectorId);
}

/** Throws on an unknown connector rather than inventing a default budget. */
export function requireConnector(connectorId: string): ConnectorDeclaration {
  const found = findConnector(connectorId);
  if (!found) {
    throw new Error(
      `Unknown connector "${connectorId}". Declare it in connectors.ts before recording observations against it.`,
    );
  }
  return found;
}
