import { Button, Card, NumberInput, TextInput, newId } from '@nte/governance-core';
import type { Estate, InsurancePolicy } from '../types';

export function InsuranceTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const rows = estate.data.insurance;
  const setRows = (next: InsurancePolicy[]) => onChange({ ...estate, data: { ...estate.data, insurance: next }, updatedAt: new Date().toISOString() });
  const add = () => setRows([...rows, { id: newId('ins'), policyType: '', carrier: '', faceValue: 0, cashValue: 0, beneficiary: '', annualPremium: 0, notes: '' }]);
  const update = (id: string, patch: Partial<InsurancePolicy>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  return (
    <Card
      title="Insurance registry"
      subtitle="Manually entered values — not pulled from a carrier feed. Cash value, loan balances, and lapse risk should be confirmed directly with the carrier before relying on them."
      right={<Button onClick={add}>Add policy</Button>}
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-6 gap-2 items-end">
            <TextInput placeholder="Policy type" value={r.policyType} onChange={(e) => update(r.id, { policyType: e.target.value })} />
            <TextInput placeholder="Carrier" value={r.carrier} onChange={(e) => update(r.id, { carrier: e.target.value })} />
            <NumberInput placeholder="Face value" value={r.faceValue || ''} onChange={(e) => update(r.id, { faceValue: Number(e.target.value) })} />
            <NumberInput placeholder="Cash value (as of last statement)" value={r.cashValue || ''} onChange={(e) => update(r.id, { cashValue: Number(e.target.value) })} />
            <TextInput placeholder="Beneficiary" value={r.beneficiary} onChange={(e) => update(r.id, { beneficiary: e.target.value })} />
            <Button variant="danger" onClick={() => remove(r.id)}>
              Remove
            </Button>
            <div className="md:col-span-3">
              <NumberInput placeholder="Annual premium" value={r.annualPremium || ''} onChange={(e) => update(r.id, { annualPremium: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-3">
              <TextInput placeholder="Notes (loans against policy, riders, etc.)" value={r.notes} onChange={(e) => update(r.id, { notes: e.target.value })} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-400">No policies recorded yet.</p>}
      </div>
    </Card>
  );
}
