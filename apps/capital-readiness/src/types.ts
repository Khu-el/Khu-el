import type { GovernedRecord } from '@nte/governance-core';

export interface CapTableRow {
  id: string;
  holder: string;
  securityType: 'COMMON' | 'PREFERRED' | 'SAFE' | 'CONVERTIBLE_NOTE' | 'OPTION_POOL';
  units: number;
  pricePerUnit: number;
  dateIssued: string;
}

export interface ProceedsLine {
  id: string;
  category: string;
  amount: number;
}

export interface ReadinessItem {
  id: string;
  label: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
}

export interface RaiseData {
  entityName: string;
  entityType: string;
  entityFormed: 'YES' | 'NO' | 'UNSURE';
  jurisdiction: string;
  targetRaise: number;
  minimumRaise: number;
  exemptionTrack: 'REG_D_504' | 'REG_D_506B' | 'REG_D_506C' | 'UNDETERMINED';
  capTable: CapTableRow[];
  useOfProceeds: ProceedsLine[];
  readiness: ReadinessItem[];
  offeringReadiness: ReadinessItem[];
  debtScenario: { loanAmount: number; ratePct: number; termYears: number };
  equityScenario: { raiseAmount: number; percentOffered: number; expectedExitValue: number; exitYears: number };
  notes: string;
}

export type Raise = GovernedRecord<RaiseData>;

export const DEFAULT_READINESS: Omit<ReadinessItem, 'id'>[] = [
  { label: 'Entity formed and in good standing with the state', status: 'NOT_STARTED' },
  { label: 'EIN issued', status: 'NOT_STARTED' },
  { label: 'Operating / governing agreement executed', status: 'NOT_STARTED' },
  { label: 'Business bank account open, separate from personal', status: 'NOT_STARTED' },
  { label: 'Bookkeeping / financial statements current', status: 'NOT_STARTED' },
  { label: 'Cap table accurate and reconciled', status: 'NOT_STARTED' },
  { label: 'Business plan / financial model drafted', status: 'NOT_STARTED' },
];

export const DEFAULT_OFFERING_READINESS: Omit<ReadinessItem, 'id'>[] = [
  { label: 'Securities counsel engaged', status: 'NOT_STARTED' },
  { label: 'Exemption track selected and confirmed with counsel', status: 'NOT_STARTED' },
  { label: 'Accredited-investor verification process defined', status: 'NOT_STARTED' },
  { label: 'Private placement memorandum / offering docs drafted by counsel', status: 'NOT_STARTED' },
  { label: 'Subscription agreement drafted by counsel', status: 'NOT_STARTED' },
  { label: 'Form D task identified (filed by counsel, not this app)', status: 'NOT_STARTED' },
  { label: 'State blue-sky notice filings identified', status: 'NOT_STARTED' },
  { label: 'Risk factors drafted and reviewed', status: 'NOT_STARTED' },
];
