/**
 * Risk tiers and the approval boundary.
 *
 * The boundary is not a style preference. R2 work may be prepared in full and
 * must not be released; R3 and R4 stop at the gate even when the runtime is
 * technically capable of proceeding. "Autonomous" describes how work is
 * sequenced, not what may be done without a human.
 */

import { RISK_ORDER, type RiskTier } from './types.ts';

/** Actions that always require a human, whatever tier a caller assigned them. */
export const HUMAN_ONLY_ACTIONS = [
  'send',
  'publish',
  'file',
  'record',
  'serve',
  'sign',
  'seal',
  'contract',
  'transact',
  'move_money',
  'trade',
  'purchase',
  'change_beneficiary',
  'change_credentials',
  'change_security',
  'change_account_ownership',
  'delete_records',
  'represent_principal',
  'issue_public_statement',
] as const;

export type HumanOnlyAction = (typeof HUMAN_ONLY_ACTIONS)[number];

const HUMAN_ONLY = new Set<string>(HUMAN_ONLY_ACTIONS);

export interface ApprovalRequest {
  approval_id: string;
  task_id: string;
  requested_action: string;
  lane: string;
  entity: string;
  capacity: string;
  risk_tier: RiskTier;
  requested_by: string;
  required_approver: string;
  supporting_sources: string[];
  impact: string;
  rollback: string;
  status: 'PENDING' | 'GRANTED' | 'DENIED';
  approved_at: string | null;
  evidence: string | null;
}

export function riskAtLeast(tier: RiskTier, floor: RiskTier): boolean {
  return RISK_ORDER.indexOf(tier) >= RISK_ORDER.indexOf(floor);
}

/** The strictest of the supplied tiers. Classification never rounds down. */
export function strictestRisk(...tiers: RiskTier[]): RiskTier {
  return tiers.reduce<RiskTier>(
    (worst, t) => (RISK_ORDER.indexOf(t) > RISK_ORDER.indexOf(worst) ? t : worst),
    'R0',
  );
}

/**
 * Whether an action needs a human before it may proceed.
 *
 * Two independent triggers, either sufficient: the tier is R3 or above, or the
 * action names something on the human-only list regardless of tier. The second
 * exists because mis-tiering is the likeliest failure - an action labelled R1
 * that actually sends an email is still a send.
 */
export function requiresHumanApproval(action: string, tier: RiskTier): boolean {
  return riskAtLeast(tier, 'R3') || HUMAN_ONLY.has(action);
}

/**
 * Whether a runtime holding `ceiling` may execute `tier` unattended.
 *
 * R3 and above are never autonomous, however high a ceiling an agent registry
 * entry claims. A registry is a record, not a grant of authority.
 */
export function mayExecuteUnattended(tier: RiskTier, ceiling: RiskTier): boolean {
  if (riskAtLeast(tier, 'R3')) return false;
  return RISK_ORDER.indexOf(tier) <= RISK_ORDER.indexOf(ceiling);
}

/** Builds a pending approval object. It records the ask; it never grants it. */
export function buildApprovalRequest(
  input: Omit<ApprovalRequest, 'approval_id' | 'status' | 'approved_at' | 'evidence'> & { approval_id: string },
): ApprovalRequest {
  return { ...input, status: 'PENDING', approved_at: null, evidence: null };
}
