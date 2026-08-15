import { AssertionStatusBadge, Button, Card, NumberInput, Select, TextInput, newId } from '@nte/governance-core';
import type { AssertionStatus, Lane } from '@nte/governance-core';
import type { AssetItem, Estate } from '../types';

const TYPE_OPTIONS = [
  { value: 'REAL_PROPERTY', label: 'Real property' },
  { value: 'FINANCIAL_ACCOUNT', label: 'Financial account' },
  { value: 'BUSINESS_INTEREST', label: 'Business interest' },
  { value: 'PERSONAL_PROPERTY', label: 'Personal property' },
  { value: 'DIGITAL_ASSET', label: 'Digital asset' },
  { value: 'OTHER', label: 'Other' },
];

const LANE_OPTIONS = [
  { value: 'LANE_B', label: 'Lane B — family' },
  { value: 'LANE_A', label: 'Lane A — enterprise' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
];

const STATUS_OPTIONS = [
  { value: 'CURRENT_INTERNAL_MODEL', label: 'Internal model' },
  { value: 'DOCUMENT_CLAIM', label: 'Document claim' },
  { value: 'EXTERNALLY_VERIFIED', label: 'Externally verified' },
  { value: 'PROFESSIONAL_REVIEW_REQUIRED', label: 'Review required' },
];

export function AssetsTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const assets = estate.data.assets;
  const setAssets = (next: AssetItem[]) => onChange({ ...estate, data: { ...estate.data, assets: next }, updatedAt: new Date().toISOString() });
  const add = () =>
    setAssets([
      ...assets,
      { id: newId('asset'), name: '', assetType: 'REAL_PROPERTY', titledOwner: '', lane: 'UNCLASSIFIED', assertionStatus: 'UNCLASSIFIED', evidenceNote: '', estimatedValue: 0 },
    ]);
  const update = (id: string, patch: Partial<AssetItem>) => setAssets(assets.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setAssets(assets.filter((a) => a.id !== id));

  return (
    <Card title="Asset & title registry" subtitle="What's titled to whom, and how confident you are in that claim" right={<Button onClick={add}>Add asset</Button>}>
      <div className="space-y-3">
        {assets.map((a) => (
          <div key={a.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-6 gap-2 items-end">
            <div className="md:col-span-2">
              <TextInput placeholder="Asset name" value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} />
            </div>
            <Select value={a.assetType} onChange={(v) => update(a.id, { assetType: v as AssetItem['assetType'] })} options={TYPE_OPTIONS} />
            <TextInput placeholder="Titled owner" value={a.titledOwner} onChange={(e) => update(a.id, { titledOwner: e.target.value })} />
            <NumberInput placeholder="Est. value" value={a.estimatedValue || ''} onChange={(e) => update(a.id, { estimatedValue: Number(e.target.value) })} />
            <Button variant="danger" onClick={() => remove(a.id)}>
              Remove
            </Button>
            <div className="md:col-span-2">
              <Select value={a.lane} onChange={(v) => update(a.id, { lane: v as Lane })} options={LANE_OPTIONS} />
            </div>
            <div className="md:col-span-2">
              <Select value={a.assertionStatus} onChange={(v) => update(a.id, { assertionStatus: v as AssertionStatus })} options={STATUS_OPTIONS} />
            </div>
            <div className="md:col-span-2">
              <TextInput placeholder="Evidence note (deed ref, account #, etc.)" value={a.evidenceNote} onChange={(e) => update(a.id, { evidenceNote: e.target.value })} />
            </div>
            <div className="md:col-span-6">
              <AssertionStatusBadge status={a.assertionStatus} />
            </div>
          </div>
        ))}
        {assets.length === 0 && <p className="text-sm text-neutral-400">No assets recorded yet.</p>}
      </div>
    </Card>
  );
}
