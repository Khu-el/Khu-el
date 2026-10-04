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

/**
 * The human-only list, split by how safely each entry can be matched.
 *
 * `send`, `publish` and `transact` are distinctive: a token spelling one of
 * them anywhere in an action name means the action does that thing, so
 * `send_email`, `sendEmail` and `gmail.send` all reach the same gate as `send`.
 *
 * The rest are ordinary English words that lead harmless operations -
 * `sign_in`, `serve_static`, `read_file`, `contract_review`,
 * `purchase_order_review`. Matching those inside a compound name fires the gate
 * on everyday work, and a gate that fires on everyday work gets routed around;
 * they are therefore matched only when they are the whole action name.
 *
 * The residual is deliberate and worth stating plainly: a compound built on an
 * ambiguous verb - `file_return`, `record_deed` - is NOT caught by name. Those
 * rely on being tiered R3 or above, which is the primary trigger. This list is
 * the backstop for a mis-tiered action, not a substitute for tiering one
 * correctly.
 */
const AMBIGUOUS = new Set(['file', 'record', 'serve', 'sign', 'seal', 'contract', 'trade', 'purchase']);

const SINGLE_WORD = HUMAN_ONLY_ACTIONS.filter((a) => !a.includes('_'));

/** Distinctive single-word entries, matched on any token of the action name. */
const ANYWHERE_TOKENS = new Set<string>(SINGLE_WORD.filter((a) => !AMBIGUOUS.has(a)));

/** Ambiguous single-word entries, matched only as the entire action name. */
const WHOLE_NAME_ONLY = new Set<string>(SINGLE_WORD.filter((a) => AMBIGUOUS.has(a)));

/** Multi-word entries, matched when every word is present. */
const HUMAN_ONLY_PHRASES: string[][] = HUMAN_ONLY_ACTIONS
  .filter((a) => a.includes('_'))
  .map((a) => a.split('_'));

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

/**
 * Position of a tier in the order, or -1 when the value is not a tier at all.
 *
 * Tiers arrive from JSON - a task file, a handoff packet, a registry entry -
 * so the type annotation is a claim about the caller, not a guarantee about
 * the value. Everything below treats -1 as "unknown", and unknown is never
 * quietly rounded down to R0: an unclassified action is the one most likely to
 * be dangerous, not the one least likely.
 */
function rank(tier: RiskTier): number {
  return RISK_ORDER.indexOf(tier);
}

/** True when `tier` is one of the five declared tiers. */
export function isRiskTier(value: unknown): value is RiskTier {
  return typeof value === 'string' && (RISK_ORDER as readonly string[]).includes(value);
}

/**
 * Whether `tier` sits at or above `floor`.
 *
 * An unrecognised tier answers `true` for every floor. That is deliberate: the
 * caller asked "is this at least this dangerous?" about a value the kernel
 * cannot place, and the safe answer to that question is yes.
 */
export function riskAtLeast(tier: RiskTier, floor: RiskTier): boolean {
  if (!isRiskTier(tier)) return true;
  return rank(tier) >= rank(floor);
}

/** The strictest of the supplied tiers. Classification never rounds down. */
export function strictestRisk(...tiers: RiskTier[]): RiskTier {
  // An unrecognised tier cannot be compared, so it takes the top of the scale
  // rather than the bottom. The alternative silently downgrades exactly the
  // inputs nobody classified.
  if (tiers.some((t) => !isRiskTier(t))) return 'R4';
  return tiers.reduce<RiskTier>((worst, t) => (rank(t) > rank(worst) ? t : worst), 'R0');
}

/**
 * Normalizes an action name for comparison against the human-only list.
 *
 * Callers name actions in whatever style their runtime uses - `sendEmail`,
 * `send_email`, `Send`, `notice.publish`. Comparing the raw string means the
 * list only catches the one spelling it happens to hold, which makes the
 * strongest control in the kernel the weakest kind of match. Splitting on case
 * and separator gives a token set that recognises all of them.
 */
function actionTokens(action: string): string[] {
  return action
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.toLowerCase())
    .filter((part) => part !== '');
}

/**
 * Whether an action needs a human before it may proceed.
 *
 * Two independent triggers, either sufficient: the tier is R3 or above, or the
 * action names something on the human-only list regardless of tier. The second
 * exists because mis-tiering is the likeliest failure - an action labelled R1
 * that actually sends an email is still a send.
 *
 * Matching is by token, not by exact string, so `send_email`, `sendEmail` and
 * `Send` all reach the gate that `send` reaches. Over-matching here costs an
 * approval prompt; under-matching costs the boundary.
 */
export function requiresHumanApproval(action: string, tier: RiskTier): boolean {
  if (riskAtLeast(tier, 'R3')) return true;

  const tokens = actionTokens(action);
  if (tokens.length === 0) return false;

  const seen = new Set(tokens);
  for (const token of seen) if (ANYWHERE_TOKENS.has(token)) return true;
  if (tokens.length === 1 && WHOLE_NAME_ONLY.has(tokens[0]!)) return true;

  // Multi-word entries such as `move_money` match when every word is present.
  return HUMAN_ONLY_PHRASES.some((phrase) => phrase.every((word) => seen.has(word)));
}

/**
 * Whether a runtime holding `ceiling` may execute `tier` unattended.
 *
 * R3 and above are never autonomous, however high a ceiling an agent registry
 * entry claims. A registry is a record, not a grant of authority. An
 * unrecognised tier or ceiling is refused rather than permitted.
 */
export function mayExecuteUnattended(tier: RiskTier, ceiling: RiskTier): boolean {
  if (!isRiskTier(tier) || !isRiskTier(ceiling)) return false;
  if (riskAtLeast(tier, 'R3')) return false;
  return rank(tier) <= rank(ceiling);
}

/** Builds a pending approval object. It records the ask; it never grants it. */
export function buildApprovalRequest(
  input: Omit<ApprovalRequest, 'approval_id' | 'status' | 'approved_at' | 'evidence'> & { approval_id: string },
): ApprovalRequest {
  return { ...input, status: 'PENDING', approved_at: null, evidence: null };
}
