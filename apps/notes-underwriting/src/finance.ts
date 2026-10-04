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

export function fmtPercent(n: number, digits = 1) {
  if (!isFinite(n)) return '—';
  return (n * 100).toLocaleString('en-US', { maximumFractionDigits: digits }) + '%';
}

/** Present value of a level monthly payment stream over `months`, at an annual discount rate. */
export function presentValueOfStream(monthlyPayment: number, months: number, annualDiscountRatePct: number) {
  const r = annualDiscountRatePct / 100 / 12;
  if (months <= 0) return 0;
  if (r === 0) return monthlyPayment * months;
  return monthlyPayment * ((1 - Math.pow(1 + r, -months)) / r);
}

/** Annualized IRR approximation for a single-cash-out-single-cash-in scenario over N months. */
export function impliedAnnualizedReturn(amountIn: number, amountOut: number, months: number) {
  // Nothing paid in, or no holding period: there is no return to annualise.
  // 0% would read as "this breaks even", which is a conclusion, not a blank.
  if (!(amountIn > 0) || !(months > 0)) return NaN;
  const totalReturn = amountOut / amountIn;
  const years = months / 12;
  return Math.pow(totalReturn, 1 / years) - 1;
}

export function probabilityWeightedRecovery(scenarios: { probabilityPct: number; recoveryAmount: number }[]) {
  const totalProb = scenarios.reduce((s, x) => s + (x.probabilityPct || 0), 0);
  // No scenarios, or every scenario weighted zero: there is no weighted
  // average to report. A $0 expected recovery is a finding; "nothing entered"
  // is not.
  if (totalProb === 0) return NaN;
  return scenarios.reduce((s, x) => s + (x.probabilityPct / totalProb) * x.recoveryAmount, 0);
}

export function probabilityWeightedMonths(scenarios: { probabilityPct: number; monthsToResolve: number }[]) {
  const totalProb = scenarios.reduce((s, x) => s + (x.probabilityPct || 0), 0);
  if (totalProb === 0) return NaN;
  return scenarios.reduce((s, x) => s + (x.probabilityPct / totalProb) * x.monthsToResolve, 0);
}
