import { Card, Field, NumberInput, Stat, fromInputValue, toInputValue, knownFields } from '@nte/governance-core';
import type { Deal } from '../types';
import { amortizationSchedule, fmtCurrency, monthlyPayment } from '../finance';

export function SellerFinanceTab({ deal, onChange }: { deal: Deal; onChange: (d: Deal) => void }) {
  const sf = deal.data.sellerFinance;
  const set = (patch: Partial<typeof sf>) =>
    onChange({ ...deal, data: { ...deal.data, sellerFinance: { ...sf, ...patch } }, updatedAt: new Date().toISOString() });
  const v = knownFields(sf);

  const principal = Math.max(0, v.purchasePrice - v.downPayment);
  const pmt = monthlyPayment(principal, v.annualRatePct, v.termMonths);
  const schedule = amortizationSchedule(principal, v.annualRatePct, v.termMonths, v.balloonMonths || undefined);
  const finalRow = schedule[schedule.length - 1];

  return (
    <div className="space-y-4">
      <Card title="Seller-carry term modeler" subtitle="Model becoming the bank on the seller side of a deal, or financing a buyer on your exit">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Purchase price">
            <NumberInput value={toInputValue(sf.purchasePrice)} onChange={(e) => set({ purchasePrice: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Down payment">
            <NumberInput value={toInputValue(sf.downPayment)} onChange={(e) => set({ downPayment: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Note principal" hint="Purchase price minus down payment">
            <div className="text-sm font-medium py-1.5">{fmtCurrency(principal)}</div>
          </Field>
          <Field label="Interest rate (annual %)">
            <NumberInput step="0.1" value={toInputValue(sf.annualRatePct)} onChange={(e) => set({ annualRatePct: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Amortization term (months)">
            <NumberInput value={toInputValue(sf.termMonths)} onChange={(e) => set({ termMonths: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Balloon due (months)" hint="0 = fully amortizing, no balloon">
            <NumberInput value={toInputValue(sf.balloonMonths)} onChange={(e) => set({ balloonMonths: fromInputValue(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Monthly payment" value={fmtCurrency(pmt)} />
        <Stat label="Balloon balance due" value={fmtCurrency(finalRow ? finalRow.balance : principal)} sub={sf.balloonMonths ? `at month ${sf.balloonMonths}` : 'fully amortizing'} />
        <Stat label="Total interest over horizon" value={fmtCurrency(schedule.reduce((s, r) => s + r.interest, 0))} />
      </div>

      <Card title="Amortization schedule" subtitle="First 12 months, then every 12th month">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-1 pr-4">Period</th>
                <th className="py-1 pr-4">Payment</th>
                <th className="py-1 pr-4">Interest</th>
                <th className="py-1 pr-4">Principal</th>
                <th className="py-1 pr-4">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule
                .filter((r) => r.period <= 12 || r.period % 12 === 0 || r.period === schedule.length)
                .map((r) => (
                  <tr key={r.period} className="border-b border-neutral-100">
                    <td className="py-1 pr-4">{r.period}</td>
                    <td className="py-1 pr-4">{fmtCurrency(r.payment)}</td>
                    <td className="py-1 pr-4">{fmtCurrency(r.interest)}</td>
                    <td className="py-1 pr-4">{fmtCurrency(r.principal)}</td>
                    <td className="py-1 pr-4">{fmtCurrency(r.balance)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
