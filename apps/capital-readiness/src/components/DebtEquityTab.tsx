import { Card, Field, NumberInput, Stat, fromInputValue, toInputValue, known } from '@nte/governance-core';
import type { Raise } from '../types';
import { debtScenarioSummary, equityScenarioSummary, fmtCurrency } from '../finance';

export function DebtEquityTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const debt = raise.data.debtScenario;
  const equity = raise.data.equityScenario;

  const setDebt = (patch: Partial<typeof debt>) => onChange({ ...raise, data: { ...raise.data, debtScenario: { ...debt, ...patch } }, updatedAt: new Date().toISOString() });
  const setEquity = (patch: Partial<typeof equity>) => onChange({ ...raise, data: { ...raise.data, equityScenario: { ...equity, ...patch } }, updatedAt: new Date().toISOString() });

  const debtSummary = debtScenarioSummary(known(debt.loanAmount), known(debt.ratePct), known(debt.termYears));
  const equitySummary = equityScenarioSummary(known(equity.raiseAmount), known(equity.percentOffered), known(equity.expectedExitValue));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Debt scenario" subtitle="Borrow it — you keep 100% of the company, but owe fixed payments regardless of outcome">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loan amount">
            <NumberInput value={toInputValue(debt.loanAmount)} onChange={(e) => setDebt({ loanAmount: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Rate (annual %)">
            <NumberInput value={toInputValue(debt.ratePct)} onChange={(e) => setDebt({ ratePct: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Term (years)">
            <NumberInput value={toInputValue(debt.termYears)} onChange={(e) => setDebt({ termYears: fromInputValue(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-2">
          <Stat label="Annual payment" value={fmtCurrency(debtSummary.payment)} />
          <Stat label="Total interest over term" value={fmtCurrency(debtSummary.totalInterest)} />
        </div>
      </Card>

      <Card title="Equity scenario" subtitle="Sell a stake — no fixed repayment, but you give up a share of every future dollar">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount raised">
            <NumberInput value={toInputValue(equity.raiseAmount)} onChange={(e) => setEquity({ raiseAmount: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="% of company offered">
            <NumberInput value={toInputValue(equity.percentOffered)} onChange={(e) => setEquity({ percentOffered: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Expected exit value" hint="Speculative — sensitivity-test this">
            <NumberInput value={toInputValue(equity.expectedExitValue)} onChange={(e) => setEquity({ expectedExitValue: fromInputValue(e.target.value) })} />
          </Field>
          <Field label="Years to exit">
            <NumberInput value={toInputValue(equity.exitYears)} onChange={(e) => setEquity({ exitYears: fromInputValue(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-2">
          <Stat label="Investor's stake value at exit" value={fmtCurrency(equitySummary.investorExitValue)} />
          <Stat label="Implied cost vs. cash raised" value={fmtCurrency(equitySummary.impliedCost)} sub="what the stake ends up worth, minus what was raised" />
        </div>
      </Card>
    </div>
  );
}
