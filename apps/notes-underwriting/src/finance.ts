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
  if (amountIn <= 0 || months <= 0) return 0;
  const totalReturn = amountOut / amountIn;
  const years = months / 12;
  return Math.pow(totalReturn, 1 / years) - 1;
}

export function probabilityWeightedRecovery(scenarios: { probabilityPct: number; recoveryAmount: number }[]) {
  const totalProb = scenarios.reduce((s, x) => s + (x.probabilityPct || 0), 0);
  if (totalProb === 0) return 0;
  return scenarios.reduce((s, x) => s + (x.probabilityPct / totalProb) * x.recoveryAmount, 0);
}

export function probabilityWeightedMonths(scenarios: { probabilityPct: number; monthsToResolve: number }[]) {
  const totalProb = scenarios.reduce((s, x) => s + (x.probabilityPct || 0), 0);
  if (totalProb === 0) return 0;
  return scenarios.reduce((s, x) => s + (x.probabilityPct / totalProb) * x.monthsToResolve, 0);
}
