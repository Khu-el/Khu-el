import { Button, Card, NumberInput, Select, Stat, TextInput, newId } from '@nte/governance-core';
import type { Deal } from '../types';
import { fmtCurrency, fmtPercent } from '../finance';

const TYPE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'DEBT', label: 'Debt (bank / hard money)' },
  { value: 'SELLER_CARRY', label: 'Seller carry' },
  { value: 'PARTNER_EQUITY', label: 'Partner equity' },
  { value: 'OTHER', label: 'Other' },
];

export function CapitalStackTab({ deal, onChange }: { deal: Deal; onChange: (d: Deal) => void }) {
  const stack = deal.data.capitalStack;
  const total = stack.reduce((s, c) => s + (c.amount || 0), 0);
  const totalCost = deal.data.askingPrice + deal.data.repairEstimate;
  const gap = totalCost - total;

  const setStack = (next: typeof stack) => onChange({ ...deal, data: { ...deal.data, capitalStack: next }, updatedAt: new Date().toISOString() });

  const addSource = () => setStack([...stack, { id: newId('cap'), label: '', type: 'CASH', amount: 0 }]);
  const updateSource = (id: string, patch: Partial<(typeof stack)[number]>) =>
    setStack(stack.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSource = (id: string) => setStack(stack.filter((s) => s.id !== id));

  return (
    <div className="space-y-4">
      <Card
        title="Capital stack"
        subtitle="Every dollar in the deal should trace to a named source. This does not raise, request, or move any money — it's a planning table."
        right={<Button onClick={addSource}>Add source</Button>}
      >
        <div className="space-y-2">
          {stack.map((s) => (
            <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <TextInput placeholder="Label (e.g. 'Personal cash', 'ABC Bank')" value={s.label} onChange={(e) => updateSource(s.id, { label: e.target.value })} />
              </div>
              <div className="col-span-3">
                <Select value={s.type} onChange={(v) => updateSource(s.id, { type: v as (typeof stack)[number]['type'] })} options={TYPE_OPTIONS} />
              </div>
              <div className="col-span-3">
                <NumberInput value={s.amount || ''} onChange={(e) => updateSource(s.id, { amount: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 text-sm text-neutral-500">{fmtPercent(totalCost > 0 ? s.amount / totalCost : 0)}</div>
              <div className="col-span-1">
                <Button variant="danger" onClick={() => removeSource(s.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {stack.length === 0 && <p className="text-sm text-neutral-400">No sources yet.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total acquisition + repair cost" value={fmtCurrency(totalCost)} />
        <Stat label="Capital sourced" value={fmtCurrency(total)} />
        <Stat label={gap > 0 ? 'Funding gap' : 'Surplus'} value={fmtCurrency(Math.abs(gap))} sub={gap > 0 ? 'not yet covered by a named source' : undefined} />
      </div>
    </div>
  );
}
