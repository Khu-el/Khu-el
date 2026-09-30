/**
 * Pure calculation helpers. No network calls, no side effects.
 *
 * Where an input is missing rather than zero, these return NaN and the
 * formatters render a non-finite number as an em dash -- so the UI shows "--"
 * for "not entered yet" and keeps a real 0 for "computed to zero". Returning 0
 * for both lets an UNKNOWN read as a verified number, which CLAUDE.md's output
 * conventions rule out.
 */

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
  if (termYears <= 0) return NaN;
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
