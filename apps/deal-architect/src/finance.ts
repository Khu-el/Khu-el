/**
 * Pure calculation helpers. No network calls, no side effects.
 *
 * A ratio whose denominator is missing returns NaN, not 0. The formatters at
 * the bottom of this file render a non-finite number as an em dash, so the UI
 * shows "--" for "you have not entered this yet" and keeps a real 0 for "this
 * genuinely computed to zero".
 *
 * The distinction is not cosmetic. DSCR is displayed next to the caption
 * ">=1.25x is a common lender floor", so a 0.00x reads as "this deal cannot
 * service its debt" -- a strong and specific negative finding -- when the
 * truth was only that no debt service had been entered. That is a letting an
 * UNKNOWN degrade into a verified-looking number, which CLAUDE.md's output
 * conventions rule out.
 */

export function maxAllowableOffer(arv: number, rule: number, repairs: number) {
  return arv * rule - repairs;
}

export function noi(monthlyRent: number, monthlyExpenses: number) {
  return (monthlyRent - monthlyExpenses) * 12;
}

export function capRate(annualNoi: number, price: number) {
  return price > 0 ? annualNoi / price : NaN;
}

export function dscr(annualNoi: number, annualDebtService: number) {
  return annualDebtService > 0 ? annualNoi / annualDebtService : NaN;
}

export function cashOnCash(annualCashFlow: number, cashInvested: number) {
  return cashInvested > 0 ? annualCashFlow / cashInvested : NaN;
}

export function ltv(loanAmount: number, value: number) {
  return value > 0 ? loanAmount / value : NaN;
}

export function ltc(loanAmount: number, totalCost: number) {
  return totalCost > 0 ? loanAmount / totalCost : NaN;
}

/** Standard monthly mortgage-style payment for a seller-carry note. */
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number) {
  const r = annualRatePct / 100 / 12;
  if (termMonths <= 0) return NaN;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

export interface AmortRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export function amortizationSchedule(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  balloonMonth?: number
): AmortRow[] {
  const r = annualRatePct / 100 / 12;
  const pmt = monthlyPayment(principal, annualRatePct, termMonths);
  const rows: AmortRow[] = [];
  let balance = principal;
  const horizon = balloonMonth && balloonMonth > 0 ? Math.min(balloonMonth, termMonths) : termMonths;
  for (let m = 1; m <= horizon && balance > 0.01; m++) {
    const interest = balance * r;
    let principalPortion = pmt - interest;
    if (m === horizon && balloonMonth && balloonMonth <= termMonths) {
      // Remaining balance is due in full at the balloon point.
      principalPortion = balance;
    }
    balance = Math.max(0, balance - principalPortion);
    rows.push({ period: m, payment: m === horizon && balloonMonth ? interest + principalPortion : pmt, interest, principal: principalPortion, balance });
  }
  return rows;
}

export function fmtCurrency(n: number) {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtPercent(n: number) {
  if (!isFinite(n)) return '—';
  return (n * 100).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
}

export function fmtRatio(n: number) {
  if (!isFinite(n)) return '—';
  return n.toFixed(2) + 'x';
}
