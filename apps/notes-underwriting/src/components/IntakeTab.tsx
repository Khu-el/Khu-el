import { AssertionStatusBadge, Card, Field, NumberInput, Select, TextInput, type AssertionStatus } from '@nte/governance-core';
import type { Note, WorkoutStatus } from '../types';

const STATUS_OPTIONS: { value: WorkoutStatus; label: string }[] = [
  { value: 'PERFORMING', label: 'Performing' },
  { value: 'DELINQUENT', label: 'Delinquent' },
  { value: 'IN_WORKOUT', label: 'In workout' },
  { value: 'IN_FORECLOSURE', label: 'In foreclosure' },
  { value: 'REO', label: 'REO (post-foreclosure)' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export function IntakeTab({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const d = note.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...note, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Note & collateral" subtitle="Use a file reference, not full personal identifiers, if this record might ever be shared" right={<AssertionStatusBadge status={note.authority.assertionStatus} />}>
        <Field label="Obligor reference" hint="e.g. 'Loan #4471' rather than a full name/SSN">
          <TextInput value={d.obligorRef} onChange={(e) => set({ obligorRef: e.target.value })} />
        </Field>
        <Field label="Collateral description">
          <TextInput value={d.collateralDescription} onChange={(e) => set({ collateralDescription: e.target.value })} />
        </Field>
        <Field label="Lien position">
          <TextInput value={d.lienPosition} onChange={(e) => set({ lienPosition: e.target.value })} />
        </Field>
        <Field label="Current status">
          <Select value={d.workoutStatus} onChange={(v) => set({ workoutStatus: v as WorkoutStatus })} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Status notes">
          <textarea className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm min-h-20" value={d.statusNotes} onChange={(e) => set({ statusNotes: e.target.value })} />
        </Field>
      </Card>

      <Card title="Terms">
        <div className="grid grid-cols-2 gap-3">
          <Field label="UPB (unpaid principal balance)">
            <NumberInput value={d.upb || ''} onChange={(e) => set({ upb: Number(e.target.value) })} />
          </Field>
          <Field label="Contract rate (annual %)">
            <NumberInput value={d.contractRatePct || ''} onChange={(e) => set({ contractRatePct: Number(e.target.value) })} />
          </Field>
          <Field label="Expected monthly payment">
            <NumberInput value={d.expectedMonthlyPayment || ''} onChange={(e) => set({ expectedMonthlyPayment: Number(e.target.value) })} />
          </Field>
          <Field label="Discount rate (your required return, annual %)">
            <NumberInput value={d.discountRatePct || ''} onChange={(e) => set({ discountRatePct: Number(e.target.value) })} />
          </Field>
          <Field label="Acquisition price (what you'd pay)">
            <NumberInput value={d.acquisitionPrice || ''} onChange={(e) => set({ acquisitionPrice: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Data confidence" hint="">
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm bg-white"
            value={note.authority.assertionStatus}
            onChange={(e) => onChange({ ...note, authority: { ...note.authority, assertionStatus: e.target.value as AssertionStatus } })}
          >
            <option value="CURRENT_INTERNAL_MODEL">Working estimate</option>
            <option value="DOCUMENT_CLAIM">From a document (payoff letter, servicer file)</option>
            <option value="EXTERNALLY_VERIFIED">Verified (title search, servicer confirmation)</option>
            <option value="PROFESSIONAL_REVIEW_REQUIRED">Needs professional review</option>
          </select>
        </Field>
      </Card>
    </div>
  );
}
