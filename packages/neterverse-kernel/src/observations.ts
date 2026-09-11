/**
 * Recording what a connector actually returned, and knowing when that record
 * has gone stale.
 *
 * Staleness is the point of this module. A control plane that reports six
 * connectors as healthy on the strength of a look taken days ago is worse than
 * one that reports nothing, because it is confidently wrong. Every observation
 * carries the moment it was taken, and every summary is computed against the
 * connector's freshness budget rather than against a memory of "we checked".
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate, formatErrors } from './validate.ts';
import { busPaths, loadSchema, writeJson, appendEvent } from './bus.ts';
import { requireConnector, CONNECTORS } from './connectors.ts';
import { type Actor, newId, nowIso } from './types.ts';

/**
 * Live observations are never committed. They may carry account identifiers,
 * file identifiers and record content, and this repository is public.
 * `.gitignore` enforces it; `audit.ts` verifies the enforcement held.
 */
export const LIVE_DIRNAME = 'live';

export type ObservationOutcome = 'OK' | 'FAILED' | 'PARTIAL';

export interface Observation {
  observation_id: string;
  connector_id: string;
  observed_at: string;
  observed_by: Actor;
  outcome: ObservationOutcome;
  call?: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  summary: string;
  error?: string;
  /** Non-identifying scalars. These may be projected into committed state. */
  metrics?: Record<string, number | string | boolean>;
  /** Identifying material. Stays in the ignored directory, always. */
  detail?: Record<string, unknown>;
}

export type Freshness = 'FRESH' | 'STALE' | 'NEVER_OBSERVED';

export interface ConnectorHealth {
  connector_id: string;
  name: string;
  freshness: Freshness;
  outcome: ObservationOutcome | null;
  observed_at: string | null;
  age_minutes: number | null;
  budget_minutes: number;
  summary: string | null;
}

export function livePath(root: string): string {
  return join(root, LIVE_DIRNAME);
}

/**
 * Validates an observation and writes it as the connector's latest.
 *
 * Only the newest observation per connector is kept on disk; the durable
 * history is the event log, which records every observation as it happens.
 * Keeping one file avoids an unbounded ignored directory while leaving the
 * append-only record intact.
 */
export function recordObservation(
  root: string,
  input: Omit<Observation, 'observation_id' | 'observed_at'> &
    Partial<Pick<Observation, 'observation_id' | 'observed_at'>>,
): Observation {
  const declaration = requireConnector(input.connector_id);

  const observation: Observation = {
    ...input,
    observation_id: input.observation_id ?? newId('obs'),
    observed_at: input.observed_at ?? nowIso(),
  };

  const result = validate(observation, loadSchema(root, 'observation'));
  if (!result.valid) {
    throw new Error(`Refusing to record an invalid observation:\n${formatErrors(result.errors)}`);
  }

  const dir = livePath(root);
  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, `${observation.connector_id}.json`), observation);

  appendEvent(root, {
    kind: observation.outcome === 'FAILED' ? 'CONNECTION_FAILED' : 'CONNECTION_VERIFIED',
    actor: observation.observed_by,
    lane: declaration.lane_scope[0] ?? 'UNCLASSIFIED',
    risk_tier: 'R0',
    subject: declaration.name,
    // The event log is committed, so it carries the summary and never the detail.
    summary: observation.summary,
  });

  return observation;
}

export function readObservation(root: string, connectorId: string): Observation | null {
  const path = join(livePath(root), `${connectorId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Observation;
}

export function readAllObservations(root: string): Observation[] {
  const dir = livePath(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Observation);
}

function ageMinutes(observedAt: string, at: Date): number {
  return Math.max(0, Math.round((at.getTime() - new Date(observedAt).getTime()) / 60_000));
}

/**
 * Health of one declared connector.
 *
 * A failed observation is never FRESH, however recently it was taken: a
 * connector that just told us it is broken is not a connector in good standing.
 */
export function connectorHealth(
  root: string,
  connectorId: string,
  at: Date = new Date(),
): ConnectorHealth {
  const declaration = requireConnector(connectorId);
  const observation = readObservation(root, connectorId);

  if (!observation) {
    return {
      connector_id: connectorId,
      name: declaration.name,
      freshness: 'NEVER_OBSERVED',
      outcome: null,
      observed_at: null,
      age_minutes: null,
      budget_minutes: declaration.freshness_minutes,
      summary: null,
    };
  }

  const age = ageMinutes(observation.observed_at, at);
  const withinBudget = age <= declaration.freshness_minutes;

  return {
    connector_id: connectorId,
    name: declaration.name,
    freshness: withinBudget && observation.outcome !== 'FAILED' ? 'FRESH' : 'STALE',
    outcome: observation.outcome,
    observed_at: observation.observed_at,
    age_minutes: age,
    budget_minutes: declaration.freshness_minutes,
    summary: observation.summary,
  };
}

export function allConnectorHealth(root: string, at: Date = new Date()): ConnectorHealth[] {
  return CONNECTORS.map((c) => connectorHealth(root, c.connector_id, at));
}

/**
 * The committed projection: counts and states, never content.
 *
 * This is what may be written into `.neterverse/state/`. It deliberately drops
 * `detail`, and drops `metrics` too - a metric is non-identifying by intent,
 * but "by intent" is not a guarantee worth making in a public repository.
 */
export function publicProjection(root: string, at: Date = new Date()): {
  as_of: string;
  connectors: Array<{ connector_id: string; freshness: Freshness; outcome: ObservationOutcome | null; age_minutes: number | null; budget_minutes: number }>;
} {
  return {
    as_of: at.toISOString(),
    connectors: allConnectorHealth(root, at).map((h) => ({
      connector_id: h.connector_id,
      freshness: h.freshness,
      outcome: h.outcome,
      age_minutes: h.age_minutes,
      budget_minutes: h.budget_minutes,
    })),
  };
}
