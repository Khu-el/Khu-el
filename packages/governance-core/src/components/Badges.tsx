import type { AssertionStatus, Lane, ReconciliationStatus } from '../types';

const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border';

const assertionStyles: Record<AssertionStatus, string> = {
  CURRENT_INTERNAL_MODEL: 'bg-slate-100 text-slate-700 border-slate-300',
  DOCUMENT_CLAIM: 'bg-amber-50 text-amber-800 border-amber-300',
  EXTERNALLY_VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  PROFESSIONAL_REVIEW_REQUIRED: 'bg-rose-50 text-rose-800 border-rose-300',
  SUPERSEDED: 'bg-neutral-100 text-neutral-500 border-neutral-300 line-through',
  UNCLASSIFIED: 'bg-neutral-50 text-neutral-500 border-neutral-300 border-dashed',
};

const assertionLabels: Record<AssertionStatus, string> = {
  CURRENT_INTERNAL_MODEL: 'Internal model',
  DOCUMENT_CLAIM: 'Document claim',
  EXTERNALLY_VERIFIED: 'Externally verified',
  PROFESSIONAL_REVIEW_REQUIRED: 'Professional review required',
  SUPERSEDED: 'Superseded',
  UNCLASSIFIED: 'Unclassified',
};

export function AssertionStatusBadge({ status }: { status: AssertionStatus }) {
  return <span className={`${base} ${assertionStyles[status]}`}>{assertionLabels[status]}</span>;
}

const laneStyles: Record<Lane, string> = {
  LANE_A: 'bg-blue-50 text-blue-800 border-blue-300',
  LANE_B: 'bg-purple-50 text-purple-800 border-purple-300',
  PERSONAL: 'bg-teal-50 text-teal-800 border-teal-300',
  PHILANTHROPIC: 'bg-lime-50 text-lime-800 border-lime-300',
  UNCLASSIFIED: 'bg-neutral-50 text-neutral-500 border-neutral-300 border-dashed',
};

const laneLabels: Record<Lane, string> = {
  LANE_A: 'Lane A · Enterprise',
  LANE_B: 'Lane B · Family/Estate',
  PERSONAL: 'Personal',
  PHILANTHROPIC: 'Philanthropic',
  UNCLASSIFIED: 'Unclassified',
};

export function LaneBadge({ lane }: { lane: Lane }) {
  return <span className={`${base} ${laneStyles[lane]}`}>{laneLabels[lane]}</span>;
}

const reconStyles: Record<ReconciliationStatus, string> = {
  STAGED: 'bg-slate-100 text-slate-700 border-slate-300',
  HOLD: 'bg-amber-50 text-amber-800 border-amber-300',
  REVIEW: 'bg-orange-50 text-orange-800 border-orange-300',
  RECONCILED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  EXCLUDED: 'bg-neutral-100 text-neutral-500 border-neutral-300',
  EXCEPTION: 'bg-rose-50 text-rose-800 border-rose-300',
};

export function ReconciliationStatusBadge({ status }: { status: ReconciliationStatus }) {
  return <span className={`${base} ${reconStyles[status]}`}>{status[0] + status.slice(1).toLowerCase()}</span>;
}

export function SourceBadge({ label }: { label: string }) {
  return <span className={`${base} bg-white text-neutral-600 border-neutral-300`}>Source: {label}</span>;
}
