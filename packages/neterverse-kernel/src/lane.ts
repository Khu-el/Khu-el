/**
 * The lane firewall, expressed as code rather than as a paragraph someone has
 * to remember.
 *
 * Lane A (NTE / Equity of the Divine Ministries - enterprise, technology,
 * commerce) and Lane B (CCRLT / House of Ransom - family estate, beneficiaries,
 * succession) are separate by design. The same human participating in both
 * structures is not authority to merge them: capacity travels with the act, not
 * with the person.
 *
 * A cross-lane relationship is legitimate, but never implicit. It requires a
 * declared bridge that records a *reference* between two records - never a
 * merge of them.
 */

import type { Lane } from './types.ts';

/** Thrown when an operation would join two lanes without a declared bridge. */
export class LaneFirewallError extends Error {
  readonly from: Lane;
  readonly to: Lane;

  constructor(from: Lane, to: Lane, detail: string) {
    super(`Lane firewall: ${from} -> ${to} is not permitted. ${detail}`);
    this.name = 'LaneFirewallError';
    this.from = from;
    this.to = to;
  }
}

/**
 * A declared cross-lane bridge.
 *
 * `authority_ref` is the instrument that permits the reference. A bridge
 * without one is not a bridge; it is an assumption, and this module refuses it.
 */
export interface LaneBridge {
  bridge_id: string;
  from_lane: Lane;
  to_lane: Lane;
  /** The agreement, memorandum, instrument or express instruction that permits it. */
  authority_ref: string;
  /** What is being referenced across the boundary - never what is being merged. */
  reference_description: string;
  declared_at: string;
}

/** Lanes that hold private, non-enterprise records. */
const PRIVATE_LANES: ReadonlySet<Lane> = new Set<Lane>(['LANE_B', 'PERSONAL']);

/**
 * True when data may move from `from` to `to` with no declared bridge.
 *
 * Same lane is always fine. Everything else is refused, including
 * `UNCLASSIFIED`, because "we have not classified it yet" is the state in which
 * mistakes are easiest to make.
 */
export function isSameLane(from: Lane, to: Lane): boolean {
  return from === to;
}

/**
 * Whether a bridge, if one is offered, could ever authorize this direction.
 *
 * Movement *out of* a private lane into an enterprise lane is the direction
 * that causes estate contamination, so it demands a bridge naming that exact
 * pair. A bridge is still required in the other direction; this predicate only
 * marks which crossings are the dangerous ones.
 */
export function isPrivateToEnterprise(from: Lane, to: Lane): boolean {
  return PRIVATE_LANES.has(from) && (to === 'LANE_A' || to === 'PHILANTHROPIC');
}

/**
 * Guard every cross-lane operation with this.
 *
 * Throws `LaneFirewallError` unless the lanes match, or a bridge is supplied
 * that names this exact pair and carries an authority reference.
 */
export function assertLaneCompatible(from: Lane, to: Lane, bridge?: LaneBridge): void {
  if (isSameLane(from, to)) return;

  if (!bridge) {
    const extra = isPrivateToEnterprise(from, to)
      ? 'Moving a private-lane record into an enterprise lane requires an express instrument.'
      : 'A cross-lane reference requires a declared bridge.';
    throw new LaneFirewallError(from, to, extra);
  }

  if (bridge.from_lane !== from || bridge.to_lane !== to) {
    throw new LaneFirewallError(
      from,
      to,
      `Bridge ${bridge.bridge_id} authorizes ${bridge.from_lane} -> ${bridge.to_lane}, not this crossing.`,
    );
  }

  if (!bridge.authority_ref || bridge.authority_ref.trim() === '') {
    throw new LaneFirewallError(
      from,
      to,
      `Bridge ${bridge.bridge_id} carries no authority reference, so it authorizes nothing.`,
    );
  }
}

/** Non-throwing form, for callers that want to branch rather than catch. */
export function canCrossLane(from: Lane, to: Lane, bridge?: LaneBridge): boolean {
  try {
    assertLaneCompatible(from, to, bridge);
    return true;
  } catch {
    return false;
  }
}
