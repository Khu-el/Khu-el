export function fmtCurrency(n: number) {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtPercent(n: number) {
  if (!isFinite(n)) return '—';
  return (n * 100).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
}

/** Simple annual amortized payment, for order-of-magnitude debt cost comparison only. */
export function annualDebtPayment(principal: number, annualRatePct: number, termYears: number) {
  const r = annualRatePct / 100;
  if (termYears <= 0) return 0;
  if (r === 0) return principal / termYears;
  return (principal * r) / (1 - Math.pow(1 + r, -termYears));
}

export function debtScenarioSummary(principal: number, annualRatePct: number, termYears: number) {
  const payment = annualDebtPayment(principal, annualRatePct, termYears);
  const totalPaid = payment * termYears;
  return { payment, totalPaid, totalInterest: totalPaid - principal };
}

export function equityScenarioSummary(raiseAmount: number, percentOffered: number, expectedExitValue: number) {
  const investorExitValue = expectedExitValue * (percentOffered / 100);
  const impliedCost = investorExitValue - raiseAmount;
  return { investorExitValue, impliedCost };
}
