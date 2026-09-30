import { Button, Card, NumberInput, Select, Stat, TextInput, newId, fromInputValue, toInputValue, known, sumKnown } from '@nte/governance-core';
import type { Raise } from '../types';
import { fmtPercent } from '../finance';

const SECURITY_OPTIONS = [
  { value: 'COMMON', label: 'Common' },
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'SAFE', label: 'SAFE' },
  { value: 'CONVERTIBLE_NOTE', label: 'Convertible note' },
  { value: 'OPTION_POOL', label: 'Option pool' },
];

export function CapTableTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const rows = raise.data.capTable;
  const totalUnits = sumKnown(rows.map((r) => r.units));

  const setRows = (next: typeof rows) => onChange({ ...raise, data: { ...raise.data, capTable: next }, updatedAt: new Date().toISOString() });
  const add = () => setRows([...rows, { id: newId('cap'), holder: '', securityType: 'COMMON', units: null, pricePerUnit: null, dateIssued: new Date().toISOString().slice(0, 10) }]);
  const update = (id: string, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));

  return (
    <div className="space-y-4">
      <Card title="Cap table (internal model)" subtitle="This computes ownership math from what you enter. It is not a stock ledger and does not issue securities." right={<Button onClick={add}>Add holder</Button>}>
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = totalUnits > 0 ? known(r.units) / totalUnits : NaN;
            return (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <TextInput placeholder="Holder name" value={r.holder} onChange={(e) => update(r.id, { holder: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Select value={r.securityType} onChange={(v) => update(r.id, { securityType: v as (typeof rows)[number]['securityType'] })} options={SECURITY_OPTIONS} />
                </div>
                <div className="col-span-2">
                  <NumberInput placeholder="Units" value={toInputValue(r.units)} onChange={(e) => update(r.id, { units: fromInputValue(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <NumberInput placeholder="$/unit" value={toInputValue(r.pricePerUnit)} onChange={(e) => update(r.id, { pricePerUnit: fromInputValue(e.target.value) })} />
                </div>
                <div className="col-span-2 text-sm text-neutral-600">{fmtPercent(pct)}</div>
                <div className="col-span-1">
                  <Button variant="danger" onClick={() => remove(r.id)}>
                    ×
                  </Button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-neutral-400">No holders yet.</p>}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total units" value={totalUnits.toLocaleString()} />
        <Stat label="Holders" value={String(rows.length)} />
      </div>
    </div>
  );
}
