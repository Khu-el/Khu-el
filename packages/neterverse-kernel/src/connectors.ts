/**
 * Connector declarations: what each system of record is authoritative for, and
 * how fresh an observation of it has to be before the control plane should stop
 * trusting its own summary.
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
  /** Writes are refused unless a task explicitly authorizes that exact write. */
  write_authorized: boolean;
}

export const CONNECTORS: readonly ConnectorDeclaration[] = [
  {
    connector_id: 'github',
    name: 'GitHub',
    system_of_record_for: ['source code', 'branches', 'pull requests', 'releases'],
    freshness_minutes: 60,
    lane_scope: ['LANE_A'],
    write_authorized: true,
  },
  {
    connector_id: 'clickup',
    name: 'ClickUp',
    system_of_record_for: ['tasks', 'execution status'],
    freshness_minutes: 240,
    lane_scope: ['LANE_A', 'LANE_B'],
    write_authorized: false,
  },
  {
    connector_id: 'google-calendar',
    name: 'Google Calendar',
    system_of_record_for: ['commitments', 'scheduled events'],
    freshness_minutes: 240,
    lane_scope: ['LANE_A', 'PERSONAL'],
    write_authorized: false,
  },
  {
    connector_id: 'google-drive',
    name: 'Google Drive',
    system_of_record_for: ['evidence', 'issued artifacts', 'release packets'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A', 'LANE_B', 'PERSONAL'],
    write_authorized: false,
  },
  {
    connector_id: 'gmail',
    name: 'Gmail',
    system_of_record_for: ['email correspondence'],
    freshness_minutes: 1440,
    lane_scope: ['LANE_A', 'PERSONAL'],
    write_authorized: false,
  },
  {
    connector_id: 'notion',
    name: 'Notion',
    system_of_record_for: ['governance registries', 'knowledge base'],
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
