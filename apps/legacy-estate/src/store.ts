import { newId, nowIso } from '@nte/governance-core';
import type { Estate } from './types';

export function createEstate(familyName: string): Estate {
  const now = nowIso();
  return {
    id: newId('estate'),
    type: 'FAMILY_ESTATE_MATTER',
    authority: {
      lane: 'LANE_B',
      principalId: 'local-user',
      actingOfficeId: 'legacy-estate-app',
      capacity: 'preparer',
      assertionStatus: 'CURRENT_INTERNAL_MODEL',
    },
    data: {
      familyName,
      trustName: '',
      trusteeOffice: '',
      assets: [],
      documents: [],
      beneficiaries: [],
      insurance: [],
      businessInterests: [],
      distributions: [],
      continuityContacts: [],
      archive: [],
    },
    evidenceRefs: [],
    reconciliationStatus: 'STAGED',
    createdAt: now,
    updatedAt: now,
  };
}
