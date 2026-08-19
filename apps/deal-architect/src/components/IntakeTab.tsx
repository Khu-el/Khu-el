import { AssertionStatusBadge, Card, Field, NumberInput, TextInput, type AssertionStatus } from '@nte/governance-core';
import type { Deal } from '../types';

export function IntakeTab({ deal, onChange }: { deal: Deal; onChange: (d: Deal) => void }) {
  const d = deal.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...deal, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Property & source" right={<AssertionStatusBadge status={deal.authority.assertionStatus} />}>
        <Field label="Address / identifier">
          <TextInput value={d.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Lead source" hint="Where this deal came from (list, driving-for-dollars, wholesaler, MLS...)">
          <TextInput value={d.source} onChange={(e) => set({ source: e.target.value })} />
        </Field>
        <Field label="Source date">
          <TextInput type="date" value={d.sourceDate} onChange={(e) => set({ sourceDate: e.target.value })} />
        </Field>
        <Field label="Record status" hint="How confident you are in this data, not the deal's legal status">
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm bg-white"
            value={deal.authority.assertionStatus}
            onChange={(e) =>
              onChange({ ...deal, authority: { ...deal.authority, assertionStatus: e.target.value as AssertionStatus } })
            }
          >
            <option value="CURRENT_INTERNAL_MODEL">Working estimate</option>
            <option value="DOCUMENT_CLAIM">From a document (seller disclosure, listing)</option>
            <option value="EXTERNALLY_VERIFIED">Verified (title co., appraisal, inspection)</option>
            <option value="PROFESSIONAL_REVIEW_REQUIRED">Needs professional review</option>
          </select>
        </Field>
      </Card>

      <Card title="Numbers">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asking price">
            <NumberInput value={d.askingPrice || ''} onChange={(e) => set({ askingPrice: Number(e.target.value) })} />
          </Field>
          <Field label="ARV (after-repair value)">
            <NumberInput value={d.arv || ''} onChange={(e) => set({ arv: Number(e.target.value) })} />
          </Field>
          <Field label="Repair estimate">
            <NumberInput value={d.repairEstimate || ''} onChange={(e) => set({ repairEstimate: Number(e.target.value) })} />
          </Field>
          <Field label="Monthly rent (est.)">
            <NumberInput value={d.monthlyRent || ''} onChange={(e) => set({ monthlyRent: Number(e.target.value) })} />
          </Field>
          <Field label="Monthly operating expenses" hint="Taxes, insurance, mgmt, maintenance reserve — not debt service">
            <NumberInput value={d.monthlyExpenses || ''} onChange={(e) => set({ monthlyExpenses: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm min-h-20"
            value={d.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </Card>
    </div>
  );
}
