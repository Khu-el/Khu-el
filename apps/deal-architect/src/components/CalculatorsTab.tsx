import { Card, Field, NumberInput, Stat, fromInputValue, toInputValue, knownFields } from '@nte/governance-core';
import type { Deal } from '../types';
import { cashOnCash, capRate, dscr, fmtCurrency, fmtPercent, fmtRatio, ltc, ltv, maxAllowableOffer, monthlyPayment, noi } from '../finance';

export function CalculatorsTab({ deal, onChange }: { deal: Deal; onChange: (d: Deal) => void }) {
  const d = deal.data;
  const set = (patch: Partial<typeof d>) => onChange({ ...deal, data: { ...d, ...patch }, updatedAt: new Date().toISOString() });
  const v = knownFields(d);

  const mao = maxAllowableOffer(v.arv, v.moaRule, v.repairEstimate);
  const annualNoi = noi(v.monthlyRent, v.monthlyExpenses);
  const cr = capRate(annualNoi, v.askingPrice);

  const annualDebtService = monthlyPayment(v.loanAmount, v.loanRatePct, v.loanTermMonths) * 12;
  const debtServiceCoverage = dscr(annualNoi, annualDebtService);
  const annualCashFlow = annualNoi - annualDebtService;
  const cashInvested = Math.max(0, v.askingPrice - v.loanAmount) + v.repairEstimate;
  const coc = cashOnCash(annualCashFlow, cashInvested);

  const totalCost = v.askingPrice + v.repairEstimate;
  const loanToValue = ltv(v.loanAmount, v.arv);
  const loanToCost = ltc(v.loanAmount, totalCost);

  return (
    <div className="space-y-4">
      <Card title="Max Allowable Offer (wholesale rule)" subtitle="MAO = ARV × rule − repairs. The classic 70% rule, editable.">
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <Field label="ARV">
            <NumberInput value={toInputValue(d.arv)} onChange={(e) => set({ arv: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Rule (as a fraction)" hint="0.70 = the standard 70% rule">
            <NumberInput step="0.01" value={toInputValue(d.moaRule)} onChange={(e) => set({ moaRule: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Repair estimate">
            <NumberInput value={toInputValue(d.repairEstimate)} onChange={(e) => set({ repairEstimate: fromInputValue(e.target.value) })} />
          </Field>
        </div>
        <Stat label="Max allowable offer" value={fmtCurrency(mao)} sub="Estimate only — depends entirely on the accuracy of ARV and repair scope" />
      </Card>

      <Card title="Rental analysis" subtitle="NOI, cap rate, DSCR, cash-on-cash — using the financing entered below">
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <Field label="Loan amount">
            <NumberInput value={toInputValue(d.loanAmount)} onChange={(e) => set({ loanAmount: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Interest rate (annual %)">
            <NumberInput step="0.1" value={toInputValue(d.loanRatePct)} onChange={(e) => set({ loanRatePct: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Term (months)">
            <NumberInput value={toInputValue(d.loanTermMonths)} onChange={(e) => set({ loanTermMonths: fromInputValue(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Annual NOI" value={fmtCurrency(annualNoi)} />
          <Stat label="Cap rate" value={fmtPercent(cr)} sub="vs. asking price" />
          <Stat label="DSCR" value={fmtRatio(debtServiceCoverage)} sub="≥1.25x is a common lender floor" />
          <Stat label="Cash-on-cash" value={fmtPercent(coc)} sub={`on ${fmtCurrency(cashInvested)} invested`} />
        </div>
      </Card>

      <Card title="Leverage" subtitle="LTV against ARV, LTC against total acquisition + repair cost">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Loan-to-value (of ARV)" value={fmtPercent(loanToValue)} />
          <Stat label="Loan-to-cost" value={fmtPercent(loanToCost)} sub={`total cost ${fmtCurrency(totalCost)}`} />
        </div>
      </Card>
    </div>
  );
}
