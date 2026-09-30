import { Card, Field, NumberInput, Stat, fromInputValue, toInputValue, type MaybeNumber, known, knownFields } from '@nte/governance-core';
import type { Note } from '../types';
import { fmtCurrency, fmtPercent, impliedAnnualizedReturn, presentValueOfStream } from '../finance';
import { useState } from 'react';

export function ValuationTab({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const d = note.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...note, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });
  const [remainingMonths, setRemainingMonths] = useState<MaybeNumber>(360);

  const v = knownFields(d);
  const months = known(remainingMonths);
  const pv = presentValueOfStream(v.expectedMonthlyPayment, months, v.discountRatePct);
  const pctOfUpb = v.upb > 0 ? v.acquisitionPrice / v.upb : NaN;
  const pctOfPv = pv > 0 ? v.acquisitionPrice / pv : NaN;
  const parIrr = impliedAnnualizedReturn(v.acquisitionPrice, v.upb, months > 12 ? 12 : months);

  return (
    <div className="space-y-4">
      <Card title="Present-value model" subtitle="What the expected payment stream is worth today, at your required return">
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <Field label="Remaining months (approx.)">
            <NumberInput value={toInputValue(remainingMonths)} onChange={(e) => setRemainingMonths(fromInputValue(e.target.value))} />
          </Field>
          <Field label="Expected monthly payment">
            <NumberInput value={toInputValue(d.expectedMonthlyPayment)} onChange={(e) => set({ expectedMonthlyPayment: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Discount rate (annual %)">
            <NumberInput value={toInputValue(d.discountRatePct)} onChange={(e) => set({ discountRatePct: fromInputValue(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Present value of stream" value={fmtCurrency(pv)} />
          <Stat label="Acquisition price" value={fmtCurrency(v.acquisitionPrice)} />
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
