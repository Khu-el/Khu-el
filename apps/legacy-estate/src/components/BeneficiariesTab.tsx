import { Button, Card, TextInput, newId } from '@nte/governance-core';
import type { BeneficiaryDesignation, Estate } from '../types';

function isStale(dateStr: string) {
  if (!dateStr) return true;
  const last = new Date(dateStr).getTime();
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  return Date.now() - last > twoYearsMs;
}

export function BeneficiariesTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const rows = estate.data.beneficiaries;
  const setRows = (next: BeneficiaryDesignation[]) => onChange({ ...estate, data: { ...estate.data, beneficiaries: next }, updatedAt: new Date().toISOString() });
  const add = () => setRows([...rows, { id: newId('ben'), accountOrPolicy: '', primaryBeneficiary: '', contingentBeneficiary: '', lastVerified: '' }]);
  const update = (id: string, patch: Partial<BeneficiaryDesignation>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  return (
    <Card title="Beneficiary / designation registry" subtitle="Accounts and policies pass by beneficiary designation regardless of what a will or trust says — keep this current" right={<Button onClick={add}>Add designation</Button>}>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-5 gap-2 items-end">
            <TextInput placeholder="Account / policy" value={r.accountOrPolicy} onChange={(e) => update(r.id, { accountOrPolicy: e.target.value })} />
            <TextInput placeholder="Primary beneficiary" value={r.primaryBeneficiary} onChange={(e) => update(r.id, { primaryBeneficiary: e.target.value })} />
            <TextInput placeholder="Contingent beneficiary" value={r.contingentBeneficiary} onChange={(e) => update(r.id, { contingentBeneficiary: e.target.value })} />
            <TextInput type="date" value={r.lastVerified} onChange={(e) => update(r.id, { lastVerified: e.target.value })} />
            <Button variant="danger" onClick={() => remove(r.id)}>
              Remove
            </Button>
            {isStale(r.lastVerified) && (
              <p className="md:col-span-5 text-xs text-amber-700">Not verified in the last 2 years (or never) — worth a quick check with the carrier/custodian.</p>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-400">No designations recorded yet.</p>}
      </div>
    </Card>
  );
}
