import { Button, Card, ProfessionalReviewGate, Select, TextInput, newId } from '@nte/governance-core';
import type { DistributionRequest, DistributionStage, Estate } from '../types';

const STAGES: { value: DistributionStage; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FAMILY_COUNCIL_REVIEW', label: 'Family council review' },
  { value: 'TRUSTEE_REVIEW', label: 'Trustee review' },
  { value: 'PROFESSIONAL_REVIEW', label: 'Professional review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
];

export function DistributionsTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const rows = estate.data.distributions;
  const setRows = (next: DistributionRequest[]) => onChange({ ...estate, data: { ...estate.data, distributions: next }, updatedAt: new Date().toISOString() });
  const add = () => setRows([...rows, { id: newId('dist'), description: '', assetOrAmount: '', requestedBy: '', stage: 'DRAFT', notes: '' }]);
  const update = (id: string, patch: Partial<DistributionRequest>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="A stage change here moves nothing">
        Marking a request "Approved" in this app records that a decision was made — it does not retitle an asset,
        move money, or amend the trust. The actual distribution still has to happen through the real account,
        deed, or trustee action, ideally with professional review before "Approved."
      </ProfessionalReviewGate>

      <Card title="Distribution requests" subtitle="Draft → Family Council → Trustee → Professional Review → Approved/Declined" right={<Button onClick={add}>New request</Button>}>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-5 gap-2 items-end">
              <TextInput placeholder="Description" value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} />
              <TextInput placeholder="Asset / amount" value={r.assetOrAmount} onChange={(e) => update(r.id, { assetOrAmount: e.target.value })} />
              <TextInput placeholder="Requested by" value={r.requestedBy} onChange={(e) => update(r.id, { requestedBy: e.target.value })} />
              <Select value={r.stage} onChange={(v) => update(r.id, { stage: v as DistributionStage })} options={STAGES} />
              <Button variant="danger" onClick={() => remove(r.id)}>
                Remove
              </Button>
              <div className="md:col-span-5">
                <TextInput placeholder="Notes" value={r.notes} onChange={(e) => update(r.id, { notes: e.target.value })} />
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-neutral-400">No distribution requests yet.</p>}
        </div>
      </Card>
    </div>
  );
}
