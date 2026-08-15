import { newId, nowIso } from '@nte/governance-core';
import { DEFAULT_DILIGENCE, type Deal } from './types';

export function createDeal(address: string): Deal {
  const id = newId('deal');
  const now = nowIso();
  return {
    id,
    type: 'REAL_ESTATE_DEAL',
    authority: {
      lane: 'UNCLASSIFIED',
      principalId: 'local-user',
      actingOfficeId: 'deal-architect-app',
      capacity: 'preparer',
      assertionStatus: 'CURRENT_INTERNAL_MODEL',
    },
    data: {
      address,
      source: '',
      sourceDate: now.slice(0, 10),
      askingPrice: 0,
      arv: 0,
      repairEstimate: 0,
      moaRule: 0.7,
      monthlyRent: 0,
      monthlyExpenses: 0,
      loanAmount: 0,
      loanRatePct: 7.5,
      loanTermMonths: 360,
      notes: '',
      capitalStack: [],
      diligence: DEFAULT_DILIGENCE.map((d) => ({ ...d, id: newId('dil') })),
      sellerFinance: {
        purchasePrice: 0,
        downPayment: 0,
        annualRatePct: 8,
        termMonths: 60,
        balloonMonths: 60,
      },
    },
    evidenceRefs: [],
    reconciliationStatus: 'STAGED',
    createdAt: now,
    updatedAt: now,
  };
}
