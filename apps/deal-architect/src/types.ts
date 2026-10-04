import type { GovernedRecord, MaybeNumber } from '@nte/governance-core';

export interface CapitalSource {
  id: string;
  label: string;
  type: 'CASH' | 'DEBT' | 'SELLER_CARRY' | 'PARTNER_EQUITY' | 'OTHER';
  amount: MaybeNumber;
}

export interface DiligenceItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SellerFinanceTerms {
  purchasePrice: MaybeNumber;
  downPayment: MaybeNumber;
  annualRatePct: MaybeNumber;
  termMonths: MaybeNumber;
  balloonMonths: MaybeNumber;
}

export interface DealData {
  address: string;
  source: string;
  sourceDate: string;
  askingPrice: MaybeNumber;
  arv: MaybeNumber;
  repairEstimate: MaybeNumber;
  moaRule: MaybeNumber;
  monthlyRent: MaybeNumber;
  monthlyExpenses: MaybeNumber;
  loanAmount: MaybeNumber;
  loanRatePct: MaybeNumber;
  loanTermMonths: MaybeNumber;
  notes: string;
  capitalStack: CapitalSource[];
  diligence: DiligenceItem[];
  sellerFinance: SellerFinanceTerms;
}

export type Deal = GovernedRecord<DealData>;

export const DEFAULT_DILIGENCE: Omit<DiligenceItem, 'id'>[] = [
  { label: 'Title search ordered / lien check complete', done: false },
  { label: 'Zoning and permitted-use confirmed', done: false },
  { label: 'Property inspection scheduled', done: false },
  { label: 'Comparable sales (comps) pulled for ARV', done: false },
  { label: 'Repair scope walked with a contractor', done: false },
  { label: 'Insurance quote obtained', done: false },
  { label: 'Entity / purchasing vehicle selected', done: false },
  { label: 'Purchase & sale agreement reviewed by counsel', done: false },
];
