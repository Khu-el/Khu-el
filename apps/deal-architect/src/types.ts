import type { GovernedRecord } from '@nte/governance-core';

export interface CapitalSource {
  id: string;
  label: string;
  type: 'CASH' | 'DEBT' | 'SELLER_CARRY' | 'PARTNER_EQUITY' | 'OTHER';
  amount: number;
}

export interface DiligenceItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SellerFinanceTerms {
  purchasePrice: number;
  downPayment: number;
  annualRatePct: number;
  termMonths: number;
  balloonMonths: number;
}

export interface DealData {
  address: string;
  source: string;
  sourceDate: string;
  askingPrice: number;
  arv: number;
  repairEstimate: number;
  moaRule: number;
  monthlyRent: number;
  monthlyExpenses: number;
  loanAmount: number;
  loanRatePct: number;
  loanTermMonths: number;
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
