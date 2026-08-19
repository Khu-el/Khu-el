import { Card, NumberInput, Stat, TextInput } from '@nte/governance-core';
import type { Note } from '../types';
import { fmtCurrency, fmtPercent, impliedAnnualizedReturn, probabilityWeightedMonths, probabilityWeightedRecovery } from '../finance';

export function ScenariosTab({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const scenarios = note.data.scenarios;
  const setScenarios = (next: typeof scenarios) => onChange({ ...note, data: { ...note.data, scenarios: next }, updatedAt: new Date().toISOString() });
  const update = (id: string, patch: Partial<(typeof scenarios)[number]>) => setScenarios(scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const totalProb = scenarios.reduce((s, x) => s + x.probabilityPct, 0);
  const weightedRecovery = probabilityWeightedRecovery(scenarios);
  const weightedMonths = probabilityWeightedMonths(scenarios);
  const irr = impliedAnnualizedReturn(note.data.acquisitionPrice, weightedRecovery, weightedMonths);

  return (
    <div className="space-y-4">
      <Card title="Recovery scenarios" subtitle="Probability-weight the realistic outcomes instead of underwriting to the best case">
        <div className="space-y-2">
          {scenarios.map((s) => (
            <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <TextInput value={s.label} onChange={(e) => update(s.id, { label: e.target.value })} />
              </div>
              <div className="col-span-2">
                <NumberInput placeholder="Prob %" value={s.probabilityPct || ''} onChange={(e) => update(s.id, { probabilityPct: Number(e.target.value) })} />
              </div>
              <div className="col-span-3">
                <NumberInput placeholder="Recovery $" value={s.recoveryAmount || ''} onChange={(e) => update(s.id, { recoveryAmount: Number(e.target.value) })} />
              </div>
              <div className="col-span-3">
                <NumberInput placeholder="Months to resolve" value={s.monthsToResolve || ''} onChange={(e) => update(s.id, { monthsToResolve: Number(e.target.value) })} />
              </div>
            </div>
          ))}
        </div>
        {Math.round(totalProb) !== 100 && (
          <p className="text-xs text-amber-700 mt-2">Probabilities sum to {totalProb}% — for a clean weighted average, make them sum to 100%.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Probability-weighted recovery" value={fmtCurrency(weightedRecovery)} />
        <Stat label="Probability-weighted time to resolve" value={`${weightedMonths.toFixed(1)} mo`} />
        <Stat label="Acquisition price" value={fmtCurrency(note.data.acquisitionPrice)} />
        <Stat label="Implied annualized return" value={fmtPercent(irr)} sub="based on the weighted recovery & timeline above" />
      </div>
    </div>
  );
}
