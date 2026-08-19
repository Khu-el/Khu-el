import { AssertionStatusBadge, Button, Card, LaneBadge, NumberInput, Select, TextInput, newId } from '@nte/governance-core';
import type { AssertionStatus, Lane } from '@nte/governance-core';
import type { BusinessInterest, Estate } from '../types';

const LANE_OPTIONS = [
  { value: 'LANE_A', label: 'Lane A — enterprise' },
  { value: 'LANE_B', label: 'Lane B — family' },
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
];

const STATUS_OPTIONS = [
  { value: 'CURRENT_INTERNAL_MODEL', label: 'Internal model' },
  { value: 'DOCUMENT_CLAIM', label: 'Document claim' },
  { value: 'EXTERNALLY_VERIFIED', label: 'Externally verified' },
  { value: 'PROFESSIONAL_REVIEW_REQUIRED', label: 'Review required' },
];

export function BusinessInterestsTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const rows = estate.data.businessInterests;
  const setRows = (next: BusinessInterest[]) => onChange({ ...estate, data: { ...estate.data, businessInterests: next }, updatedAt: new Date().toISOString() });
  const add = () => setRows([...rows, { id: newId('biz'), entityName: '', lane: 'UNCLASSIFIED', ownershipPct: 0, capacityOrOffice: '', assertionStatus: 'UNCLASSIFIED', evidenceNote: '' }]);
  const update = (id: string, patch: Partial<BusinessInterest>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  return (
    <Card
      title="Family / enterprise business-interest registry"
      subtitle="Where family members hold economic ownership, a board seat, or an office (e.g. Minister/Authorized Representative) in a Lane A entity. This registry is the bridge — it references the interest without merging Lane A's books into Lane B's."
      right={<Button onClick={add}>Add interest</Button>}
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-6 gap-2 items-end">
            <TextInput placeholder="Entity name" value={r.entityName} onChange={(e) => update(r.id, { entityName: e.target.value })} />
            <Select value={r.lane} onChange={(v) => update(r.id, { lane: v as Lane })} options={LANE_OPTIONS} />
            <NumberInput placeholder="Ownership %" value={r.ownershipPct || ''} onChange={(e) => update(r.id, { ownershipPct: Number(e.target.value) })} />
            <TextInput placeholder="Capacity / office (e.g. Minister, Member, Director)" value={r.capacityOrOffice} onChange={(e) => update(r.id, { capacityOrOffice: e.target.value })} />
            <Select value={r.assertionStatus} onChange={(v) => update(r.id, { assertionStatus: v as AssertionStatus })} options={STATUS_OPTIONS} />
            <Button variant="danger" onClick={() => remove(r.id)}>
              Remove
            </Button>
            <div className="md:col-span-4">
              <TextInput placeholder="Evidence note" value={r.evidenceNote} onChange={(e) => update(r.id, { evidenceNote: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <LaneBadge lane={r.lane} />
              <AssertionStatusBadge status={r.assertionStatus} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-400">No business interests recorded yet.</p>}
      </div>
    </Card>
  );
}
