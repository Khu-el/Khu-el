/**
 * The calculators are the product here: every number in the UI comes out of
 * finance.ts, and CLAUDE.md requires each one to be traceable to its inputs and
 * never to show a verified-looking value for something unknown.
 *
 * These are pure functions with no imports, so `node --test` runs them directly
 * with type stripping -- no bundler and no DOM.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  amortizationSchedule,
  capRate,
  cashOnCash,
  dscr,
  fmtCurrency,
  fmtPercent,
  fmtRatio,
  ltc,
  ltv,
  maxAllowableOffer,
  monthlyPayment,
  noi,
} from '../src/finance.ts';

describe('a missing denominator is unknown, not zero', () => {
  // Each of these reached the UI as a confident number before: "0.0%" for a cap
  // rate with no asking price, and "0.00x" for a DSCR beside the caption
  // ">=1.25x is a common lender floor" -- which reads as a failed deal rather
  // than an empty field.
  const cases: Array<[string, number]> = [
    ['capRate with no asking price', capRate(60_000, 0)],
    ['dscr with no debt service', dscr(60_000, 0)],
    ['cashOnCash with nothing invested', cashOnCash(12_000, 0)],
    ['ltv with no value', ltv(200_000, 0)],
    ['ltc with no total cost', ltc(200_000, 0)],
    ['monthlyPayment with no term', monthlyPayment(200_000, 7, 0)],
  ];

  for (const [name, value] of cases) {
    test(`${name} is not finite`, () => {
      assert.equal(Number.isFinite(value), false);
    });
  }

  test('and each renders as an em dash rather than a number', () => {
    assert.equal(fmtPercent(capRate(60_000, 0)), '—');
    assert.equal(fmtRatio(dscr(60_000, 0)), '—');
    assert.equal(fmtCurrency(monthlyPayment(200_000, 7, 0)), '—');
  });

  test('a genuine zero is still shown as zero', () => {
    // No rent and no expenses is a real answer, not a missing one.
    assert.equal(noi(0, 0), 0);
    assert.equal(fmtPercent(capRate(0, 500_000)), '0%');
    assert.equal(fmtRatio(dscr(0, 48_000)), '0.00x');
  });

  test('a negative result is preserved, not floored at zero', () => {
    // Expenses above rent is exactly the case an underwriter needs to see.
    assert.equal(noi(1_000, 1_500), -6_000);
    assert.equal(dscr(-6_000, 12_000), -0.5);
  });
});

describe('the ratios themselves', () => {
  test('capRate is NOI over price', () => {
    assert.equal(capRate(60_000, 1_000_000), 0.06);
  });

  test('noi annualises a monthly spread', () => {
    assert.equal(noi(3_000, 1_200), 21_600);
  });

  test('dscr at the common lender floor', () => {
    assert.equal(dscr(60_000, 48_000), 1.25);
  });

  test('maxAllowableOffer applies the rule then subtracts repairs', () => {
    // The 70% rule on a 300k ARV with 45k of repairs.
    assert.equal(maxAllowableOffer(300_000, 0.7, 45_000), 165_000);
  });

  test('maxAllowableOffer can go negative when repairs exceed the ceiling', () => {
    assert.equal(maxAllowableOffer(100_000, 0.7, 90_000), -20_000);
  });

  test('ltv and ltc divide by different denominators', () => {
    assert.equal(ltv(160_000, 200_000), 0.8);
    assert.equal(ltc(160_000, 250_000), 0.64);
  });
});

describe('monthlyPayment', () => {
  test('matches the standard amortisation formula', () => {
    // 200,000 at 7% over 360 months. Independently: 1330.60.
    const pmt = monthlyPayment(200_000, 7, 360);
    assert.ok(Math.abs(pmt - 1330.6) < 0.05, `expected ~1330.60, got ${pmt}`);
  });

  test('a zero rate divides principal evenly across the term', () => {
    assert.equal(monthlyPayment(120_000, 0, 120), 1_000);
  });
});

describe('amortizationSchedule', () => {
  test('a fully amortising loan ends at a zero balance', () => {
    const rows = amortizationSchedule(200_000, 7, 360);
    assert.equal(rows.length, 360);
    assert.ok(Math.abs(rows.at(-1)!.balance) < 0.01, `ended at ${rows.at(-1)!.balance}`);
  });

  test('interest plus principal equals the payment on every row', () => {
    for (const row of amortizationSchedule(200_000, 7, 360)) {
      assert.ok(Math.abs(row.payment - (row.interest + row.principal)) < 1e-6, `row ${row.period}`);
    }
  });

  test('the balance falls monotonically', () => {
    const rows = amortizationSchedule(200_000, 7, 120);
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i].balance <= rows[i - 1].balance, `balance rose at period ${rows[i].period}`);
    }
  });

  test('a balloon ends the schedule early and pays the balance off in full', () => {
    const rows = amortizationSchedule(200_000, 7, 360, 60);
    assert.equal(rows.length, 60);
    const final = rows.at(-1)!;
    assert.equal(final.balance, 0, 'the balloon leaves nothing outstanding');
    // The balloon payment is the remaining balance plus that month's interest,
    // so it is far larger than a scheduled payment.
    assert.ok(final.payment > monthlyPayment(200_000, 7, 360) * 10, 'the balloon payment should dwarf a regular one');
  });

  test('a balloon beyond the term is the same as no balloon', () => {
    const withBalloon = amortizationSchedule(200_000, 7, 120, 600);
    const without = amortizationSchedule(200_000, 7, 120);
    assert.equal(withBalloon.length, without.length);
    assert.deepEqual(withBalloon.at(-1), without.at(-1));
  });

  test('a zero-month term produces no rows rather than throwing', () => {
    assert.deepEqual(amortizationSchedule(200_000, 7, 0), []);
  });

  test('a zero-rate loan still amortises to zero', () => {
    const rows = amortizationSchedule(120_000, 0, 120);
    assert.equal(rows.length, 120);
    assert.ok(Math.abs(rows.at(-1)!.balance) < 0.01);
    assert.equal(rows[0].interest, 0);
  });
});

describe('formatters', () => {
  test('currency has no cents and carries a symbol', () => {
    assert.equal(fmtCurrency(1_234_567), '$1,234,567');
    assert.equal(fmtCurrency(1_234_567.89), '$1,234,568', 'cents round into the dollar');
  });

  test('percent scales by 100', () => {
    assert.equal(fmtPercent(0.0724), '7.2%');
    assert.equal(fmtPercent(0.0726), '7.3%');
  });

  test('a percent exactly on the rounding boundary goes to even', () => {
    // Intl rounds half to even, so 7.25 renders as 7.2 and 7.35 as 7.4. Pinned
    // because it is surprising, not because either answer is preferable -- a
    // future change to the formatter should be a deliberate one.
    assert.equal(fmtPercent(0.0725), '7.2%');
    assert.equal(fmtPercent(0.0735), '7.4%');
  });

  test('ratio is fixed to two places with an x', () => {
    assert.equal(fmtRatio(1.2543), '1.25x');
  });

  test('every formatter turns a non-finite value into an em dash', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      assert.equal(fmtCurrency(bad), '—');
      assert.equal(fmtPercent(bad), '—');
      assert.equal(fmtRatio(bad), '—');
    }
  });
});
