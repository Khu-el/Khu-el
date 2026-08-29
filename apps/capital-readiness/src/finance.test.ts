import { describe, it, expect } from 'vitest';
import {
  annualDebtPayment,
  debtScenarioSummary,
  equityScenarioSummary,
  fmtCurrency,
  fmtPercent,
} from './finance';

describe('annualDebtPayment', () => {
  it('amortizes annually at the stated rate', () => {
    // $500k at 8% over 10 years, compounded annually (not monthly -- this
    // helper is deliberately annual, for order-of-magnitude comparison only).
    expect(annualDebtPayment(500_000, 8, 10)).toBeCloseTo(74_514.7443, 3);
  });

  it('divides principal evenly at 0% interest', () => {
    expect(annualDebtPayment(500_000, 0, 10)).toBe(50_000);
  });

  it('returns 0 for a non-positive term rather than dividing by zero', () => {
    expect(annualDebtPayment(500_000, 8, 0)).toBe(0);
    expect(annualDebtPayment(500_000, 0, 0)).toBe(0);
    expect(annualDebtPayment(500_000, 8, -5)).toBe(0);
  });

  it('costs more per year as the term shortens', () => {
    const short = annualDebtPayment(500_000, 8, 5);
    const long = annualDebtPayment(500_000, 8, 20);
    expect(short).toBeGreaterThan(long);
  });
});

describe('debtScenarioSummary', () => {
  it('derives total paid and total interest from the annual payment', () => {
    const s = debtScenarioSummary(500_000, 8, 10);
    expect(s.payment).toBeCloseTo(74_514.7443, 3);
    expect(s.totalPaid).toBeCloseTo(745_147.4435, 3);
    expect(s.totalInterest).toBeCloseTo(245_147.4435, 3);
  });

  it('reports zero interest on a 0% loan', () => {
    const s = debtScenarioSummary(500_000, 0, 10);
    expect(s.totalPaid).toBe(500_000);
    expect(s.totalInterest).toBe(0);
  });

  it('reports a full negative-interest figure for a zero-term degenerate case', () => {
    // Term 0 makes the payment 0, so totalPaid is 0 and "interest" reads as
    // -principal. Documented here so the UI is never surprised by the sign.
    const s = debtScenarioSummary(500_000, 8, 0);
    expect(s.payment).toBe(0);
    expect(s.totalPaid).toBe(0);
    expect(s.totalInterest).toBe(-500_000);
  });
});

describe('equityScenarioSummary', () => {
  it('values the investor stake at exit and the implied cost of the raise', () => {
    // Sell 20% for $1M against a $10M expected exit: investor takes $2M,
    // so the raise effectively cost $1M more than it brought in.
    const s = equityScenarioSummary(1_000_000, 20, 10_000_000);
    expect(s.investorExitValue).toBe(2_000_000);
    expect(s.impliedCost).toBe(1_000_000);
  });

  it('reports a negative implied cost when the stake is worth less than the raise', () => {
    // A down case: the same 20% against a $3M exit is worth $600k, i.e. the
    // capital came in cheaper than it went out.
    const s = equityScenarioSummary(1_000_000, 20, 3_000_000);
    expect(s.investorExitValue).toBe(600_000);
    expect(s.impliedCost).toBe(-400_000);
  });

  it('handles a 0% stake and a zero exit value', () => {
    expect(equityScenarioSummary(1_000_000, 0, 10_000_000)).toEqual({
      investorExitValue: 0,
      impliedCost: -1_000_000,
    });
    expect(equityScenarioSummary(1_000_000, 20, 0)).toEqual({
      investorExitValue: 0,
      impliedCost: -1_000_000,
    });
  });

  it('scales linearly with the percentage offered', () => {
    const ten = equityScenarioSummary(1_000_000, 10, 10_000_000);
    const twenty = equityScenarioSummary(1_000_000, 20, 10_000_000);
    expect(twenty.investorExitValue).toBeCloseTo(ten.investorExitValue * 2, 6);
  });
});

describe('formatters', () => {
  it('renders currency and percentages', () => {
    expect(fmtCurrency(745_147)).toBe('$745,147');
    expect(fmtPercent(0.08)).toBe('8%');
    expect(fmtPercent(0.0825)).toBe('8.3%');
  });

  it('renders an em dash for non-finite input', () => {
    expect(fmtCurrency(NaN)).toBe('—');
    expect(fmtPercent(Infinity)).toBe('—');
  });
});
