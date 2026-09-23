import { newId, nowIso } from '@nte/governance-core';
import { DEFAULT_LIEN_CHECKLIST, DEFAULT_SCENARIOS, type Note } from './types';

export function createNote(obligorRef: string): Note {
  const now = nowIso();
  return {
    id: newId('note'),
    type: 'NOTE_UNDERWRITING_MATTER',
    authority: {
      lane: 'UNCLASSIFIED',
      principalId: 'local-user',
      actingOfficeId: 'notes-underwriting-app',
      capacity: 'preparer',
      assertionStatus: 'CURRENT_INTERNAL_MODEL',
    },
    data: {
      obligorRef,
      collateralDescription: '',
      lienPosition: '1st',
      upb: null,
      contractRatePct: null,
      expectedMonthlyPayment: null,
      discountRatePct: 12,
      acquisitionPrice: null,
      workoutStatus: 'PERFORMING',
      statusNotes: '',
      lienChecklist: DEFAULT_LIEN_CHECKLIST.map((l) => ({ ...l, id: newId('lien') })),
      scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s, id: newId('scn') })),
      notes: '',
    },
    evidenceRefs: [],
    reconciliationStatus: 'STAGED',
    createdAt: now,
    updatedAt: now,
  };
}
