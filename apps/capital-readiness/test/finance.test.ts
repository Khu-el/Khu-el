/**
 * Debt and equity scenario arithmetic. CLAUDE.md is explicit that these produce
 * scenarios, not guarantees, and that an unknown must never render as a
 * verified-looking number.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  annualDebtPayment,
  debtScenarioSummary,
  equityScenarioSummary,
  fmtCurrency,
  fmtPercent,
} from '../src/finance.ts';

describe('annualDebtPayment', () => {
  test('a zero rate divides principal evenly across the term', () => {
    assert.equal(annualDebtPayment(500_000, 0, 10), 50_000);
  });

  test('interest raises the payment above the straight-line figure', () => {
    assert.ok(annualDebtPayment(500_000, 8, 10) > 50_000);
  });

  test('a longer term lowers the annual payment', () => {
    assert.ok(annualDebtPayment(500_000, 8, 20) < annualDebtPayment(500_000, 8, 10));
  });

  test('no term is unknown, not a zero payment', () => {
    assert.equal(Number.isFinite(annualDebtPayment(500_000, 8, 0)), false);
    assert.equal(fmtCurrency(annualDebtPayment(500_000, 8, 0)), '—');
  });
});

describe('debtScenarioSummary', () => {
  test('total paid is the payment across the term, and interest is the excess', () => {
    const s = debtScenarioSummary(500_000, 8, 10);
    assert.ok(Math.abs(s.totalPaid - s.payment * 10) < 1e-9);
    assert.ok(Math.abs(s.totalInterest - (s.totalPaid - 500_000)) < 1e-9);
    assert.ok(s.totalInterest > 0, 'borrowing at 8% costs interest');
  });

  test('a zero-rate loan costs no interest', () => {
    const s = debtScenarioSummary(500_000, 0, 10);
    assert.equal(s.totalPaid, 500_000);
    assert.equal(s.totalInterest, 0);
  });

  test('an unknown payment leaves the whole summary unknown rather than misleading', () => {
    // totalInterest would otherwise compute as -principal, i.e. a large
    // negative "cost" presented as if the loan paid the borrower.
    const s = debtScenarioSummary(500_000, 8, 0);
    assert.equal(Number.isFinite(s.payment), false);
    assert.equal(Number.isFinite(s.totalPaid), false);
    assert.equal(Number.isFinite(s.totalInterest), false);
    assert.equal(fmtCurrency(s.totalInterest), '—');
  });
});

describe('equityScenarioSummary', () => {
  test('investor value is their percentage of the exit', () => {
    const s = equityScenarioSummary(250_000, 20, 5_000_000);
    assert.equal(s.investorExitValue, 1_000_000);
  });

  test('implied cost is what the investor takes out beyond what they put in', () => {
    const s = equityScenarioSummary(250_000, 20, 5_000_000);
    assert.equal(s.impliedCost, 750_000);
  });

  test('an exit below the raise gives a negative implied cost, and is not hidden', () => {
    // The investor loses money; the founder's "cost" of that capital was
    // negative. A real outcome, so it must survive to the UI.
    const s = equityScenarioSummary(250_000, 20, 500_000);
    assert.equal(s.investorExitValue, 100_000);
    assert.equal(s.impliedCost, -150_000);
  });

  test('a zero exit value is a real scenario, not an unknown', () => {
    const s = equityScenarioSummary(250_000, 20, 0);
    assert.equal(s.investorExitValue, 0);
    assert.equal(s.impliedCost, -250_000);
    assert.equal(fmtCurrency(s.investorExitValue), '$0');
  });
});

describe('formatters', () => {
  test('currency drops cents', () => {
    assert.equal(fmtCurrency(1_250_000), '$1,250,000');
  });

  test('percent scales by 100', () => {
    assert.equal(fmtPercent(0.185), '18.5%');
  });

  test('non-finite values render as an em dash', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      assert.equal(fmtCurrency(bad), '—');
      assert.equal(fmtPercent(bad), '—');
    }
  });
});
