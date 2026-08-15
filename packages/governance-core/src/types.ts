/**
 * Shared governance types used across all four NTE apps.
 *
 * These exist to keep a hard, visible line between what a document
 * or connector *claims* and what has actually been externally verified,
 * and to keep Lane A (enterprise/technology) and Lane B (family/estate)
 * data from silently merging.
 */

export type Lane = 'LANE_A' | 'LANE_B' | 'PERSONAL' | 'PHILANTHROPIC' | 'UNCLASSIFIED';

export type AssertionStatus =
  | 'CURRENT_INTERNAL_MODEL'
  | 'DOCUMENT_CLAIM'
  | 'EXTERNALLY_VERIFIED'
  | 'PROFESSIONAL_REVIEW_REQUIRED'
  | 'SUPERSEDED'
  | 'UNCLASSIFIED';

export type ReconciliationStatus =
  | 'STAGED'
  | 'HOLD'
  | 'REVIEW'
  | 'RECONCILED'
  | 'EXCLUDED'
  | 'EXCEPTION';

export interface AuthorityContext {
  lane: Lane;
  principalId: string;
  actingOfficeId: string;
  capacity: string;
  authorityRef?: string;
  sourceRef?: string;
  assertionStatus: AssertionStatus;
}

export interface EvidenceRef {
  id: string;
  sourceSystem: 'UPLOAD' | 'DRIVE' | 'GMAIL' | 'NOTION' | 'FINANCES' | 'CALENDAR' | 'MANUAL' | 'OTHER';
  sourceId?: string;
  sourceDate?: string;
  description: string;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

export interface GovernedRecord<T> {
  id: string;
  type: string;
  authority: AuthorityContext;
  data: T;
  evidenceRefs: EvidenceRef[];
  reconciliationStatus: ReconciliationStatus;
  createdAt: string;
  updatedAt: string;
  reconciledAt?: string;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
