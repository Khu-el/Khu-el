/**
 * Note valuation and scenario weighting. Every figure the underwriting UI shows
 * comes from here, and CLAUDE.md's output conventions require a number to be
 * traceable to inputs and an unknown never to read as a verified value.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtCurrency,
  fmtPercent,
  impliedAnnualizedReturn,
  presentValueOfStream,
  probabilityWeightedMonths,
  probabilityWeightedRecovery,
} from '../src/finance.ts';

describe('present value of a payment stream', () => {
  test('a zero discount rate is just the sum of the payments', () => {
    assert.equal(presentValueOfStream(1_000, 60, 0), 60_000);
  });

  test('discounting reduces the value below the undiscounted sum', () => {
    const pv = presentValueOfStream(1_000, 60, 12);
    assert.ok(pv < 60_000, `expected a discount, got ${pv}`);
    // 1,000/month for 60 months at 12% annual: 44,955.04.
    assert.ok(Math.abs(pv - 44_955.04) < 0.5, `expected ~44955, got ${pv}`);
  });

  test('a higher discount rate yields a lower present value', () => {
    assert.ok(presentValueOfStream(1_000, 60, 18) < presentValueOfStream(1_000, 60, 6));
  });

  test('a matured note with no months remaining is worth zero, not unknown', () => {
    // Distinct from the unknown cases below: a stream of no payments genuinely
    // has no present value, so 0 is the honest answer and "--" would not be.
    assert.equal(presentValueOfStream(1_000, 0, 12), 0);
  });
});

describe('probability-weighted scenarios', () => {
  const scenarios = [
    { probabilityPct: 50, recoveryAmount: 100_000, monthsToResolve: 12 },
    { probabilityPct: 30, recoveryAmount: 60_000, monthsToResolve: 24 },
    { probabilityPct: 20, recoveryAmount: 0, monthsToResolve: 36 },
  ];

  test('weights recovery by probability', () => {
    assert.equal(probabilityWeightedRecovery(scenarios), 68_000);
  });

  test('weights months the same way', () => {
    assert.equal(probabilityWeightedMonths(scenarios), 0.5 * 12 + 0.3 * 24 + 0.2 * 36);
  });

  test('probabilities are normalised, so they need not total 100', () => {
    const doubled = scenarios.map((s) => ({ ...s, probabilityPct: s.probabilityPct * 2 }));
    assert.equal(probabilityWeightedRecovery(doubled), probabilityWeightedRecovery(scenarios));
  });

  test('a scenario set that is entirely zero-recovery weights to zero', () => {
    // A real finding -- every path recovers nothing -- so it must not be hidden.
    const wipeout = [{ probabilityPct: 100, recoveryAmount: 0, monthsToResolve: 18 }];
    assert.equal(probabilityWeightedRecovery(wipeout), 0);
    assert.equal(fmtCurrency(probabilityWeightedRecovery(wipeout)), '$0');
  });

  test('no scenarios at all is unknown, not zero', () => {
    assert.equal(Number.isFinite(probabilityWeightedRecovery([])), false);
    assert.equal(Number.isFinite(probabilityWeightedMonths([])), false);
    assert.equal(fmtCurrency(probabilityWeightedRecovery([])), '—');
  });

  test('scenarios that all carry zero probability are unknown too', () => {
    const unweighted = [{ probabilityPct: 0, recoveryAmount: 100_000, monthsToResolve: 12 }];
    assert.equal(Number.isFinite(probabilityWeightedRecovery(unweighted)), false);
  });
});

describe('implied annualised return', () => {
  test('doubling over twelve months is about 100%', () => {
    assert.ok(Math.abs(impliedAnnualizedReturn(50_000, 100_000, 12) - 1) < 1e-9);
  });

  test('doubling over twenty-four months annualises lower', () => {
    const two = impliedAnnualizedReturn(50_000, 100_000, 24);
    assert.ok(Math.abs(two - (Math.SQRT2 - 1)) < 1e-9, `got ${two}`);
  });

  test('a loss is reported as a negative return, not clamped', () => {
    assert.ok(impliedAnnualizedReturn(100_000, 80_000, 12) < 0);
  });

  test('no acquisition price is unknown, not a break-even 0%', () => {
    assert.equal(Number.isFinite(impliedAnnualizedReturn(0, 100_000, 12)), false);
    assert.equal(fmtPercent(impliedAnnualizedReturn(0, 100_000, 12)), '—');
  });

  test('no holding period is unknown', () => {
    assert.equal(Number.isFinite(impliedAnnualizedReturn(50_000, 100_000, 0)), false);
  });

  test('an unknown weighted input carries through as unknown', () => {
    // This is the path the UI actually takes: weighted figures feed the IRR.
    const recovery = probabilityWeightedRecovery([]);
    const months = probabilityWeightedMonths([]);
    assert.equal(Number.isFinite(impliedAnnualizedReturn(50_000, recovery, months)), false);
    assert.equal(fmtPercent(impliedAnnualizedReturn(50_000, recovery, months)), '—');
  });
});

describe('formatters', () => {
  test('percent honours a custom precision', () => {
    assert.equal(fmtPercent(0.123456, 3), '12.346%');
    assert.equal(fmtPercent(0.123456), '12.3%');
  });

  test('non-finite values render as an em dash', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      assert.equal(fmtCurrency(bad), '—');
      assert.equal(fmtPercent(bad), '—');
    }
  });
});
