import { AssertionStatusBadge, Card, Field, NumberInput, Select, TextInput, type AssertionStatus } from '@nte/governance-core';
import type { Raise } from '../types';

export function EntityTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const d = raise.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...raise, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Entity" right={<AssertionStatusBadge status={raise.authority.assertionStatus} />}>
        <Field label="Entity name">
          <TextInput value={d.entityName} onChange={(e) => set({ entityName: e.target.value })} />
        </Field>
        <Field label="Entity type" hint="LLC, S-corp, C-corp, etc.">
          <TextInput value={d.entityType} onChange={(e) => set({ entityType: e.target.value })} />
        </Field>
        <Field label="Jurisdiction / state of formation">
          <TextInput value={d.jurisdiction} onChange={(e) => set({ jurisdiction: e.target.value })} />
        </Field>
        <Field label="Is the entity actually formed?" hint="This is a fact to verify, not assume">
          <Select
            value={d.entityFormed}
            onChange={(v) => set({ entityFormed: v as typeof d.entityFormed })}
            options={[
              { value: 'YES', label: 'Yes — filed and verifiable' },
              { value: 'NO', label: 'No — not yet formed' },
              { value: 'UNSURE', label: 'Unsure / needs verification' },
            ]}
          />
        </Field>
        <Field label="Data confidence">
          <Select
            value={raise.authority.assertionStatus}
            onChange={(v) => onChange({ ...raise, authority: { ...raise.authority, assertionStatus: v as AssertionStatus } })}
            options={[
              { value: 'CURRENT_INTERNAL_MODEL', label: 'Working estimate' },
              { value: 'DOCUMENT_CLAIM', label: 'From a document' },
              { value: 'EXTERNALLY_VERIFIED', label: 'Verified (filings, counsel)' },
              { value: 'PROFESSIONAL_REVIEW_REQUIRED', label: 'Needs professional review' },
            ]}
          />
        </Field>
      </Card>

      <Card title="Raise parameters">
        <Field label="Target raise">
          <NumberInput value={d.targetRaise || ''} onChange={(e) => set({ targetRaise: Number(e.target.value) })} />
        </Field>
        <Field label="Minimum raise">
          <NumberInput value={d.minimumRaise || ''} onChange={(e) => set({ minimumRaise: Number(e.target.value) })} />
        </Field>
        <Field label="Exemption track being considered" hint="Not a legal conclusion — confirm with securities counsel">
          <Select
            value={d.exemptionTrack}
            onChange={(v) => set({ exemptionTrack: v as typeof d.exemptionTrack })}
            options={[
              { value: 'UNDETERMINED', label: 'Undetermined' },
              { value: 'REG_D_504', label: 'Reg D 504 (up to $10M)' },
              { value: 'REG_D_506B', label: 'Reg D 506(b)' },
              { value: 'REG_D_506C', label: 'Reg D 506(c)' },
            ]}
          />
        </Field>
        <Field label="Notes">
          <textarea className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm min-h-24" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </Card>
    </div>
  );
}
