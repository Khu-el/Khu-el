import type { GovernedRecord } from '@nte/governance-core';

export type WorkoutStatus = 'PERFORMING' | 'DELINQUENT' | 'IN_WORKOUT' | 'IN_FORECLOSURE' | 'REO' | 'RESOLVED';

export interface RecoveryScenario {
  id: string;
  label: string;
  probabilityPct: number;
  recoveryAmount: number;
  monthsToResolve: number;
}

export interface LienItem {
  id: string;
  label: string;
  done: boolean;
}

export interface NoteData {
  obligorRef: string;
  collateralDescription: string;
  lienPosition: string;
  upb: number;
  contractRatePct: number;
  expectedMonthlyPayment: number;
  discountRatePct: number;
  acquisitionPrice: number;
  workoutStatus: WorkoutStatus;
  statusNotes: string;
  lienChecklist: LienItem[];
  scenarios: RecoveryScenario[];
  notes: string;
}

export type Note = GovernedRecord<NoteData>;

export const DEFAULT_LIEN_CHECKLIST: Omit<LienItem, 'id'>[] = [
  { label: 'Title/lien search pulled (current, not stale)', done: false },
  { label: 'Security instrument recorded and legible', done: false },
  { label: 'Lien priority / senior encumbrances confirmed', done: false },
  { label: 'Chain of assignment / allonge reviewed', done: false },
  { label: 'Original note / certified copy located', done: false },
  { label: 'Property insurance status confirmed', done: false },
  { label: 'Applicable state foreclosure / collection rules reviewed with counsel', done: false },
];

export const DEFAULT_SCENARIOS: Omit<RecoveryScenario, 'id'>[] = [
  { label: 'Full payoff at par', probabilityPct: 20, recoveryAmount: 0, monthsToResolve: 6 },
  { label: 'Discounted payoff (DPO)', probabilityPct: 35, recoveryAmount: 0, monthsToResolve: 9 },
  { label: 'Loan modification / re-performing', probabilityPct: 20, recoveryAmount: 0, monthsToResolve: 18 },
  { label: 'Foreclosure / REO sale', probabilityPct: 25, recoveryAmount: 0, monthsToResolve: 14 },
];
