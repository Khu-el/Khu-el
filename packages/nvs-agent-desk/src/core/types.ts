// Vocabulary shared by every module. Mirrors the governance vocabulary used in
// Khu-el/Khu-el (docs/EXECUTIVE_OS.md, packages/governance-core) so records carry
// over without translation. Map, do not multiply.

/** Which part of the enterprise a record or action belongs to. Lanes never auto-connect. */
export type Lane =
  | 'NVS_DELIVERY' // NTE Virtual Solutions commercial delivery
  | 'NTE_PRIVATE'
  | 'EXCELLENCE_DISTRICT'
  | 'HOPE_PRIMERICA'
  | 'LICENSED_PRACTICE'
  | 'EMPLOYER'
  | 'UNCLASSIFIED';

export type Confidentiality = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

/** Claim-level evidence (SPEC v2 spelling). UNKNOWN is a real answer and never degrades to VERIFIED. */
export type Evidence =
  | 'VERIFIED'
  | 'SYSTEM_RECORDED'
  | 'USER_REPORTED'
  | 'DOCUMENT_STATED'
  | 'INFERRED'
  | 'UNKNOWN';

/** Ordering used by gates: higher is stronger. INFERRED and UNKNOWN never satisfy a gate. */
export const EVIDENCE_RANK: Record<Evidence, number> = {
  VERIFIED: 5,
  SYSTEM_RECORDED: 4,
  USER_REPORTED: 3,
  DOCUMENT_STATED: 2,
  INFERRED: 1,
  UNKNOWN: 0,
};

export interface EvidenceRef {
  status: Evidence;
  source: string; // system, document, URL
  asOf: string; // ISO date
  note?: string;
}

/** Delivery state of a piece of work. Report only the state actually reached. */
export type DeliveryState =
  | 'PROPOSED'
  | 'DRAFTED'
  | 'SAVED'
  | 'LOCALLY_TESTED'
  | 'DEPLOYED'
  | 'LIVE_VERIFIED';

/** Everything the principal asked to see declared before a consequential action. */
export interface ActionContext {
  entity: string; // e.g. "NTE Virtual Solutions"
  lane: Lane;
  tenant: string | null; // client/tenant, null for internal work
  sourceOfTruth: string;
  owner: string;
  confidentiality: Confidentiality;
}

export type Actor = { kind: 'human' | 'agent'; id: string };

/** DRAFT: reversible, local, may run unattended. CONSEQUENTIAL: always needs a named human. */
export type ActionClass = 'DRAFT' | 'CONSEQUENTIAL';

export type ActionStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING' // claimed in the database; a crash here needs a human to resolve, never an automatic retry
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVOKED';

export interface ActionRecord {
  id: string;
  kind: string;
  class: ActionClass;
  status: ActionStatus;
  context: ActionContext;
  payload: unknown;
  payloadHash: string;
  costCents: number;
  proposedBy: Actor;
  proposedAt: string;
  expiresAt: string;
  approvedBy: string | null;
  approvedHash: string | null;
  result: unknown;
  error: string | null;
}

/** What the principal named as consequential. Kinds starting with these prefixes can never be classed DRAFT. */
export const CONSEQUENTIAL_PREFIXES = [
  'email.send',
  'publish.',
  'deploy.',
  'spend.',
  'credential.',
  'access.',
  'prod-data.',
  'trade.live',
  'ads.change',
  'external.',
] as const;
