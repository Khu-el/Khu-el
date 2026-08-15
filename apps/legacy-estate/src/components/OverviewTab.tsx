import { AssertionStatusBadge, Card, Field, LaneBadge, ProfessionalReviewGate, Select, TextInput, type AssertionStatus } from '@nte/governance-core';
import type { Estate } from '../types';

export function OverviewTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const d = estate.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...estate, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="Internal family record, not a legal filing">
        Everything in this app describes your own internal understanding of your family's estate. It does not
        create, amend, execute, or record any trust, deed, or beneficiary designation — those only happen through
        the actual document, account, or registry, ideally with an estate attorney involved.
      </ProfessionalReviewGate>

      <Card title="Identity" subtitle="This app is private/Lane B by default — nothing here is meant for public or client-facing use." right={<LaneBadge lane={estate.authority.lane} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Family name">
            <TextInput value={d.familyName} onChange={(e) => set({ familyName: e.target.value })} />
          </Field>
          <Field label="Trust name" hint="e.g. Christopher Chaz Ransom-El Living Trust (CCRLT)">
            <TextInput value={d.trustName} onChange={(e) => set({ trustName: e.target.value })} />
          </Field>
          <Field label="Trustee office" hint="e.g. House of Ransom (Family Church) — the office, not a personal claim of trusteeship">
            <TextInput value={d.trusteeOffice} onChange={(e) => set({ trusteeOffice: e.target.value })} />
          </Field>
          <Field label="Trust status confidence">
            <Select
              value={estate.authority.assertionStatus}
              onChange={(v) => onChange({ ...estate, authority: { ...estate.authority, assertionStatus: v as AssertionStatus } })}
              options={[
                { value: 'CURRENT_INTERNAL_MODEL', label: 'Internal model / working understanding' },
                { value: 'DOCUMENT_CLAIM', label: 'From a document (not independently verified)' },
                { value: 'EXTERNALLY_VERIFIED', label: 'Externally verified (attorney/filing confirmed)' },
                { value: 'PROFESSIONAL_REVIEW_REQUIRED', label: 'Needs professional review' },
              ]}
            />
          </Field>
        </div>
        <div className="mt-2">
          <AssertionStatusBadge status={estate.authority.assertionStatus} />
        </div>
      </Card>
    </div>
  );
}
