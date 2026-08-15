import { Card, Field, NumberInput, Stat } from '@nte/governance-core';
import type { Note } from '../types';
import { fmtCurrency, fmtPercent, impliedAnnualizedReturn, presentValueOfStream } from '../finance';
import { useState } from 'react';

export function ValuationTab({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const d = note.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...note, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });
  const [remainingMonths, setRemainingMonths] = useState(360);

  const pv = presentValueOfStream(d.expectedMonthlyPayment, remainingMonths, d.discountRatePct);
  const pctOfUpb = d.upb > 0 ? d.acquisitionPrice / d.upb : 0;
  const pctOfPv = pv > 0 ? d.acquisitionPrice / pv : 0;
  const parIrr = impliedAnnualizedReturn(d.acquisitionPrice, d.upb, remainingMonths > 12 ? 12 : remainingMonths);

  return (
    <div className="space-y-4">
      <Card title="Present-value model" subtitle="What the expected payment stream is worth today, at your required return">
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <Field label="Remaining months (approx.)">
            <NumberInput value={remainingMonths || ''} onChange={(e) => setRemainingMonths(Number(e.target.value))} />
          </Field>
          <Field label="Expected monthly payment">
            <NumberInput value={d.expectedMonthlyPayment || ''} onChange={(e) => set({ expectedMonthlyPayment: Number(e.target.value) })} />
          </Field>
          <Field label="Discount rate (annual %)">
            <NumberInput value={d.discountRatePct || ''} onChange={(e) => set({ discountRatePct: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Present value of stream" value={fmtCurrency(pv)} />
          <Stat label="Acquisition price" value={fmtCurrency(d.acquisitionPrice)} />
          <Stat label="Price as % of UPB" value={fmtPercent(pctOfUpb)} />
          <Stat label="Price as % of PV" value={fmtPercent(pctOfPv)} sub="under 100% = buying below the discounted value of the payments" />
        </div>
      </Card>

      <Card title="Quick sanity check — full payoff at par within a year" subtitle="Illustrative only; see Recovery Scenarios for the real probability-weighted view">
        <Stat label="Implied annualized return" value={fmtPercent(parIrr)} sub="if the full UPB were collected within ~12 months" />
      </Card>
    </div>
  );
}
