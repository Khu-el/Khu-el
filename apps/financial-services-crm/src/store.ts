import { newId, nowIso, type EvidenceRef, type GovernedRecord } from '@nte/governance-core';
import { emptyData } from './defaults';
import { RECORD_TYPES, type EntityDataMap, type EntityKind } from './types';

/**
 * Every CRM record is a GovernedRecord. The lane is UNCLASSIFIED on purpose:
 * which governance lane this business belongs to has not been decided, and
 * guessing would be the ❓ → ✅ degradation CLAUDE.md forbids.
 */
export function createRecord<K extends EntityKind>(
  kind: K,
  data: EntityDataMap[K],
  opts: { sourceRef?: string; evidence?: Omit<EvidenceRef, 'id'> } = {}
): GovernedRecord<EntityDataMap[K]> {
  const now = nowIso();
  return {
    id: newId(`fs${kind.slice(0, 3)}`),
    type: RECORD_TYPES[kind],
    authority: {
      lane: 'UNCLASSIFIED',
      principalId: 'local-user',
      actingOfficeId: 'financial-services-crm-app',
      capacity: 'preparer',
      sourceRef: opts.sourceRef,
      assertionStatus: 'CURRENT_INTERNAL_MODEL',
    },
    data,
    evidenceRefs: opts.evidence ? [{ id: newId('ev'), ...opts.evidence }] : [],
    reconciliationStatus: 'STAGED',
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlank<K extends EntityKind>(kind: K, today: string, weekStart: string) {
  return createRecord(kind, emptyData(kind, today, weekStart));
}

export function patchRecord<T>(record: GovernedRecord<T>, patch: Partial<T>): GovernedRecord<T> {
  return { ...record, data: { ...record.data, ...patch }, updatedAt: nowIso() };
}

/** Which kind a stored record is, from its type tag. Unknown tags are left out rather than guessed. */
export function kindOf(type: string): EntityKind | null {
  const entry = (Object.entries(RECORD_TYPES) as [EntityKind, string][]).find(([, t]) => t === type);
  return entry ? entry[0] : null;
}
