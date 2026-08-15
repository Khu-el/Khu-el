import { Card, Field, NumberInput, Stat } from '@nte/governance-core';
import type { Raise } from '../types';
import { debtScenarioSummary, equityScenarioSummary, fmtCurrency } from '../finance';

export function DebtEquityTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const debt = raise.data.debtScenario;
  const equity = raise.data.equityScenario;

  const setDebt = (patch: Partial<typeof debt>) => onChange({ ...raise, data: { ...raise.data, debtScenario: { ...debt, ...patch } }, updatedAt: new Date().toISOString() });
  const setEquity = (patch: Partial<typeof equity>) => onChange({ ...raise, data: { ...raise.data, equityScenario: { ...equity, ...patch } }, updatedAt: new Date().toISOString() });

  const debtSummary = debtScenarioSummary(debt.loanAmount, debt.ratePct, debt.termYears);
  const equitySummary = equityScenarioSummary(equity.raiseAmount, equity.percentOffered, equity.expectedExitValue);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Debt scenario" subtitle="Borrow it — you keep 100% of the company, but owe fixed payments regardless of outcome">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loan amount">
            <NumberInput value={debt.loanAmount || ''} onChange={(e) => setDebt({ loanAmount: Number(e.target.value) })} />
          </Field>
          <Field label="Rate (annual %)">
            <NumberInput value={debt.ratePct || ''} onChange={(e) => setDebt({ ratePct: Number(e.target.value) })} />
          </Field>
          <Field label="Term (years)">
            <NumberInput value={debt.termYears || ''} onChange={(e) => setDebt({ termYears: Number(e.target.value) })} />
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
            <NumberInput value={equity.raiseAmount || ''} onChange={(e) => setEquity({ raiseAmount: Number(e.target.value) })} />
          </Field>
          <Field label="% of company offered">
            <NumberInput value={equity.percentOffered || ''} onChange={(e) => setEquity({ percentOffered: Number(e.target.value) })} />
          </Field>
          <Field label="Expected exit value" hint="Speculative — sensitivity-test this">
            <NumberInput value={equity.expectedExitValue || ''} onChange={(e) => setEquity({ expectedExitValue: Number(e.target.value) })} />
          </Field>
          <Field label="Years to exit">
            <NumberInput value={equity.exitYears || ''} onChange={(e) => setEquity({ exitYears: Number(e.target.value) })} />
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
