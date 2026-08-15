import { Button, Card, NumberInput, Stat, TextInput, newId } from '@nte/governance-core';
import type { Raise } from '../types';
import { fmtCurrency, fmtPercent } from '../finance';

export function ProceedsTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const lines = raise.data.useOfProceeds;
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const target = raise.data.targetRaise;

  const setLines = (next: typeof lines) => onChange({ ...raise, data: { ...raise.data, useOfProceeds: next }, updatedAt: new Date().toISOString() });
  const add = () => setLines([...lines, { id: newId('use'), category: '', amount: 0 }]);
  const update = (id: string, patch: Partial<(typeof lines)[number]>) => setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => setLines(lines.filter((l) => l.id !== id));

  return (
    <div className="space-y-4">
      <Card title="Use of proceeds" subtitle="Where the raised capital is planned to go" right={<Button onClick={add}>Add line</Button>}>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <TextInput placeholder="Category (e.g. inventory, marketing, hiring)" value={l.category} onChange={(e) => update(l.id, { category: e.target.value })} />
              </div>
              <div className="col-span-3">
                <NumberInput value={l.amount || ''} onChange={(e) => update(l.id, { amount: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 text-sm text-neutral-600">{fmtPercent(total > 0 ? l.amount / total : 0)}</div>
              <div className="col-span-1">
                <Button variant="danger" onClick={() => remove(l.id)}>
                  ×
                </Button>
              </div>
            </div>
          ))}
          {lines.length === 0 && <p className="text-sm text-neutral-400">No line items yet.</p>}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Allocated" value={fmtCurrency(total)} />
        <Stat label={total > target ? 'Over target' : 'Remaining vs. target'} value={fmtCurrency(Math.abs(target - total))} sub={`target ${fmtCurrency(target)}`} />
      </div>
    </div>
  );
}
