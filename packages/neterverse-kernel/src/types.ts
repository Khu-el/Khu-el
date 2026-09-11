/**
 * Vocabulary for the Neterverse control plane.
 *
 * `Lane` and the assertion vocabulary deliberately mirror
 * `@nte/governance-core` (`packages/governance-core/src/types.ts`) rather than
 * introducing a parallel one. Executive OS section 4 (artifact-first) and
 * section 53 of the orchestration standard (consolidate before adding) both
 * point the same way: one vocabulary, three spellings, no fourth.
 */

/** Mirrors `Lane` in @nte/governance-core. Kept structurally identical on purpose. */
export type Lane = 'LANE_A' | 'LANE_B' | 'PERSONAL' | 'PHILANTHROPIC' | 'UNCLASSIFIED';

/** Which runtime is acting. Claude Code and Codex are peers, never each other. */
export type Runtime = 'CLAUDE_CODE' | 'CODEX' | 'OTHER_AUTHORIZED_RUNTIME' | 'HUMAN';

/**
 * Risk tiers.
 *
 * R0 read-only, R1 reversible internal write, R2 external draft,
 * R3 external action, R4 financial / legal / high consequence.
 */
export type RiskTier = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';

export const RISK_ORDER: readonly RiskTier[] = ['R0', 'R1', 'R2', 'R3', 'R4'];

/**
 * Deployment state vocabulary. There is no `LIVE` shortcut: reaching
 * `LIVE_VERIFIED` requires evidence that the live surface answered, which is
 * why `DEPLOYED` and `LIVE_VERIFIED` are separate states.
 */
export type DeploymentState =
  | 'DESIGNED'
  | 'AUTHORED'
  | 'CONFIGURED'
  | 'TESTED_LOCALLY'
  | 'TESTED_INTEGRATION'
  | 'STAGED'
  | 'DEPLOYED'
  | 'LIVE_VERIFIED'
  | 'FAILED'
  | 'BLOCKED'
  | 'UNKNOWN';

/** What a capability discovery actually observed. Exposure is not verification. */
export type VerificationState =
  | 'LIVE_VERIFIED'
  | 'EXPOSED_UNVERIFIED'
  | 'FAILED'
  | 'NOT_EXPOSED'
  | 'UNKNOWN';

export type EventKind =
  | 'TASK_CREATED' | 'TASK_CLAIMED' | 'TASK_HANDOFF' | 'TASK_BLOCKED' | 'TASK_COMPLETED'
  | 'SOURCE_VERIFIED' | 'SOURCE_CONFLICT'
  | 'CAPABILITY_DISCOVERED' | 'CONNECTION_VERIFIED' | 'CONNECTION_FAILED'
  | 'FILE_CREATED' | 'FILE_UPDATED' | 'FILE_SUPERSEDED'
  | 'CODE_CHANGED'
  | 'TEST_STARTED' | 'TEST_PASSED' | 'TEST_FAILED'
  | 'BUILD_STARTED' | 'BUILD_COMPLETED' | 'BUILD_FAILED'
  | 'DEPLOY_REQUESTED' | 'DEPLOY_APPROVED' | 'DEPLOY_STARTED' | 'DEPLOY_SUCCEEDED'
  | 'DEPLOY_FAILED' | 'DEPLOY_ROLLED_BACK'
  | 'AUTOMATION_ENABLED' | 'AUTOMATION_DISABLED' | 'AUTOMATION_FAILED'
  | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED'
  | 'SECURITY_EXCEPTION' | 'POLICY_EXCEPTION' | 'DATA_BOUNDARY_EXCEPTION'
  | 'LEASE_ACQUIRED' | 'LEASE_RELEASED' | 'LEASE_DENIED' | 'LEASE_EXPIRED'
  | 'RELEASE_CREATED' | 'ROLLBACK_COMPLETED' | 'CORRECTION';

export interface Actor {
  runtime: Runtime;
  instance_id: string;
}

export interface SystemRef {
  system: 'GITHUB' | 'DRIVE' | 'CLICKUP' | 'NOTION' | 'CALENDAR' | 'GMAIL' | 'SHEETS' | 'REPO' | 'OTHER';
  ref: string;
  note?: string;
}

export interface BusEvent {
  event_id: string;
  timestamp: string;
  kind: EventKind;
  actor: Actor;
  lane: Lane;
  risk_tier: RiskTier;
  subject: string;
  summary: string;
  correlation_id?: string;
  corrects_event_id?: string;
  refs?: SystemRef[];
}

export interface Lease {
  lease_id: string;
  task_id: string;
  agent: Actor;
  scope: string;
  resources: string[];
  start_time: string;
  expiration: string;
  risk_tier: RiskTier;
  lane?: Lane;
  note?: string;
}

export interface ConnectorEntry {
  connector_id: string;
  name: string;
  role: string;
  system_of_record_for?: string[];
  verification_state: VerificationState;
  verification_method?: string;
  access: 'READ' | 'READ_WRITE' | 'WRITE_ONLY' | 'UNKNOWN';
  write_authorized?: boolean;
  lane_scope?: Lane[];
  last_verified: string;
  notes?: string;
}

/** A deterministic-enough id for bus records. Not a security token. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
