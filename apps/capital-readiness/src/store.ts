import { newId, nowIso } from '@nte/governance-core';
import { DEFAULT_OFFERING_READINESS, DEFAULT_READINESS, type Raise } from './types';

export function createRaise(entityName: string): Raise {
  const now = nowIso();
  return {
    id: newId('raise'),
    type: 'CAPITAL_RAISE_MATTER',
    authority: {
      lane: 'UNCLASSIFIED',
      principalId: 'local-user',
      actingOfficeId: 'capital-readiness-app',
      capacity: 'preparer',
      assertionStatus: 'CURRENT_INTERNAL_MODEL',
    },
    data: {
      entityName,
      entityType: '',
      entityFormed: 'UNSURE',
      jurisdiction: '',
      targetRaise: 0,
      minimumRaise: 0,
      exemptionTrack: 'UNDETERMINED',
      capTable: [],
      useOfProceeds: [],
      readiness: DEFAULT_READINESS.map((r) => ({ ...r, id: newId('rdy') })),
      offeringReadiness: DEFAULT_OFFERING_READINESS.map((r) => ({ ...r, id: newId('off') })),
      debtScenario: { loanAmount: 0, ratePct: 10, termYears: 5 },
      equityScenario: { raiseAmount: 0, percentOffered: 10, expectedExitValue: 0, exitYears: 5 },
      notes: '',
    },
    evidenceRefs: [],
    reconciliationStatus: 'STAGED',
    createdAt: now,
    updatedAt: now,
  };
}
