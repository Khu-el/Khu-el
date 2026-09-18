/**
 * Task leases: the mechanism that stops Claude Code and Codex writing the same
 * resource at the same time.
 *
 * A lease is a claim over named resources with an expiry. Acquisition is
 * refused when a live lease held by someone else overlaps - the correct
 * response to that refusal is to read the holder's handoff and pick
 * non-conflicting work, never to overwrite.
 *
 * Expiry is deliberate: a runtime that dies mid-task must not be able to block
 * the resource permanently. An expired lease is treated as released.
 */

import { validate, formatErrors } from './validate.ts';
import { busPaths, loadSchema, readJson, writeJson, appendEvent } from './bus.ts';
import { type Actor, type Lease, type RiskTier, type Lane, newId, nowIso } from './types.ts';

export interface LeaseRequest {
  task_id: string;
  agent: Actor;
  scope: string;
  resources: string[];
  risk_tier: RiskTier;
  lane?: Lane;
  ttl_minutes?: number;
  note?: string;
}

export type AcquireResult =
  | { ok: true; lease: Lease }
  | { ok: false; conflicts: Array<{ lease: Lease; resources: string[] }> };

const DEFAULT_TTL_MINUTES = 60;

function isExpired(lease: Lease, at: Date): boolean {
  return new Date(lease.expiration).getTime() <= at.getTime();
}

function readAll(root: string): Lease[] {
  return readJson<Lease[]>(busPaths(root).locks, []);
}

/** Leases still in force at `at`. Expired ones are filtered, not deleted. */
export function activeLeases(root: string, at: Date = new Date()): Lease[] {
  return readAll(root).filter((l) => !isExpired(l, at));
}

/**
 * Removes expired leases from the lock file and logs one `LEASE_EXPIRED` event
 * per reclaimed lease, so the reclaim is visible rather than silent.
 */
export function reapExpired(root: string, at: Date = new Date()): Lease[] {
  const all = readAll(root);
  const expired = all.filter((l) => isExpired(l, at));
  if (expired.length === 0) return [];

  writeJson(busPaths(root).locks, all.filter((l) => !isExpired(l, at)));
  for (const lease of expired) {
    appendEvent(root, {
      kind: 'LEASE_EXPIRED',
      actor: lease.agent,
      lane: lease.lane ?? 'UNCLASSIFIED',
      risk_tier: lease.risk_tier,
      subject: lease.scope,
      summary: `Lease ${lease.lease_id} on ${lease.resources.join(', ')} expired and was reclaimed.`,
    });
  }
  return expired;
}

/**
 * Attempts to claim `resources`.
 *
 * A resource is any agreed string - a path, a registry name, an external record
 * id. Overlap is exact-match by design: fuzzy prefix matching would make the
 * refusal unpredictable, and an unpredictable lock gets worked around.
 *
 * Re-acquiring resources you already hold under the same task is allowed; that
 * is a renewal, not a conflict.
 */
export function acquireLease(root: string, request: LeaseRequest, at: Date = new Date()): AcquireResult {
  reapExpired(root, at);

  const held = activeLeases(root, at);
  const wanted = new Set(request.resources);

  const conflicts = held
    .filter((l) => !(l.task_id === request.task_id && l.agent.instance_id === request.agent.instance_id))
    .map((lease) => ({ lease, resources: lease.resources.filter((r) => wanted.has(r)) }))
    .filter((c) => c.resources.length > 0);

  if (conflicts.length > 0) {
    appendEvent(root, {
      kind: 'LEASE_DENIED',
      actor: request.agent,
      lane: request.lane ?? 'UNCLASSIFIED',
      risk_tier: request.risk_tier,
      subject: request.scope,
      summary:
        `Denied: ${conflicts.map((c) => `${c.lease.lease_id} holds ${c.resources.join(', ')}`).join('; ')}. ` +
        'Read the holder\'s handoff and take non-conflicting work.',
    });
    return { ok: false, conflicts };
  }

  const ttl = request.ttl_minutes ?? DEFAULT_TTL_MINUTES;
  const lease: Lease = {
    lease_id: newId('lease'),
    task_id: request.task_id,
    agent: request.agent,
    scope: request.scope,
    resources: request.resources,
    start_time: at.toISOString(),
    expiration: new Date(at.getTime() + ttl * 60_000).toISOString(),
    risk_tier: request.risk_tier,
    ...(request.lane ? { lane: request.lane } : {}),
    ...(request.note ? { note: request.note } : {}),
  };

  const result = validate(lease, loadSchema(root, 'lease'));
  if (!result.valid) {
    throw new Error(`Refusing to write an invalid lease:\n${formatErrors(result.errors)}`);
  }

  writeJson(busPaths(root).locks, [...readAll(root).filter((l) => !isExpired(l, at)), lease]);
  appendEvent(root, {
    kind: 'LEASE_ACQUIRED',
    actor: request.agent,
    lane: request.lane ?? 'UNCLASSIFIED',
    risk_tier: request.risk_tier,
    subject: request.scope,
    summary: `Lease ${lease.lease_id} over ${lease.resources.join(', ')} until ${lease.expiration}.`,
  });
  return { ok: true, lease };
}

/** Releases a lease by id. Returns false when nothing matched. */
export function releaseLease(root: string, leaseId: string, at: Date = new Date()): boolean {
  const all = readAll(root);
  const lease = all.find((l) => l.lease_id === leaseId);
  if (!lease) return false;

  writeJson(busPaths(root).locks, all.filter((l) => l.lease_id !== leaseId));
  appendEvent(root, {
    kind: 'LEASE_RELEASED',
    actor: lease.agent,
    lane: lease.lane ?? 'UNCLASSIFIED',
    risk_tier: lease.risk_tier,
    subject: lease.scope,
    summary: `Lease ${leaseId} released at ${at.toISOString()}.`,
  });
  return true;
}
