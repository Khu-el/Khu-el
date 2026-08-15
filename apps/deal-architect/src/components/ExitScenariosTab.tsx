import { Card, Field, NumberInput, Stat } from '@nte/governance-core';
import { useState } from 'react';
import type { Deal } from '../types';
import { fmtCurrency, monthlyPayment, noi } from '../finance';

export function ExitScenariosTab({ deal }: { deal: Deal }) {
  const d = deal.data;
  const [assignmentFee, setAssignmentFee] = useState(0);
  const [marketingCost, setMarketingCost] = useState(0);
  const [sellingCostPct, setSellingCostPct] = useState(8);
  const [holdMonthsFlip, setHoldMonthsFlip] = useState(4);
  const [monthlyHoldingCost, setMonthlyHoldingCost] = useState(0);
  const [holdYearsRental, setHoldYearsRental] = useState(5);

  // Wholesale
  const wholesaleProfit = assignmentFee - marketingCost;

  // Flip
  const sellingCosts = d.arv * (sellingCostPct / 100);
  const flipHoldingCosts = monthlyHoldingCost * holdMonthsFlip;
  const flipProfit = d.arv - d.askingPrice - d.repairEstimate - sellingCosts - flipHoldingCosts;

  // BRRRR / long-term hold
  const annualNoi = noi(d.monthlyRent, d.monthlyExpenses);
  const annualDebtService = monthlyPayment(d.loanAmount, d.loanRatePct, d.loanTermMonths) * 12;
  const annualCashFlow = annualNoi - annualDebtService;
  const totalHoldCashFlow = annualCashFlow * holdYearsRental;
  const cashInvested = Math.max(0, d.askingPrice - d.loanAmount) + d.repairEstimate;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Three exits, same deal. This is a rough side-by-side, not a substitute for a full pro forma — closing
        costs, taxes, and financing fees are simplified.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="1 — Wholesale / assign">
          <Field label="Assignment fee">
            <NumberInput value={assignmentFee || ''} onChange={(e) => setAssignmentFee(Number(e.target.value))} />
          </Field>
          <Field label="Marketing / dispo cost">
            <NumberInput value={marketingCost || ''} onChange={(e) => setMarketingCost(Number(e.target.value))} />
          </Field>
          <Stat label="Net profit" value={fmtCurrency(wholesaleProfit)} sub="Fastest exit, no capital deployed, no ongoing risk" />
        </Card>

        <Card title="2 — Buy, rehab, sell (flip)">
          <Field label="Selling costs (% of ARV)" hint="Commission + closing, combined">
            <NumberInput value={sellingCostPct} onChange={(e) => setSellingCostPct(Number(e.target.value))} />
          </Field>
          <Field label="Hold period (months)">
            <NumberInput value={holdMonthsFlip || ''} onChange={(e) => setHoldMonthsFlip(Number(e.target.value))} />
          </Field>
          <Field label="Monthly holding cost" hint="Utilities, insurance, taxes, loan interest while vacant">
            <NumberInput value={monthlyHoldingCost || ''} onChange={(e) => setMonthlyHoldingCost(Number(e.target.value))} />
          </Field>
          <Stat label="Net profit" value={fmtCurrency(flipProfit)} sub={`ARV ${fmtCurrency(d.arv)} − price − repairs − selling − holding`} />
        </Card>

        <Card title="3 — BRRRR / long-term hold">
          <Field label="Hold period (years)">
            <NumberInput value={holdYearsRental || ''} onChange={(e) => setHoldYearsRental(Number(e.target.value))} />
          </Field>
          <Stat label="Annual cash flow" value={fmtCurrency(annualCashFlow)} sub="From the Calculators tab's rent/expense/loan inputs" />
          <div className="h-3" />
          <Stat label={`Cumulative cash flow (${holdYearsRental}y)`} value={fmtCurrency(totalHoldCashFlow)} sub={`on ${fmtCurrency(cashInvested)} invested — excludes appreciation & principal paydown`} />
        </Card>
      </div>
    </div>
  );
}
