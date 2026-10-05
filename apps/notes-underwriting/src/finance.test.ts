import { describe, it, expect } from 'vitest';
import {
  presentValueOfStream,
  impliedAnnualizedReturn,
  probabilityWeightedRecovery,
  probabilityWeightedMonths,
  fmtCurrency,
  fmtPercent,
} from './finance';

describe('presentValueOfStream', () => {
  it('discounts a level payment stream at the given annual rate', () => {
    // $1,000/mo for 60 months at 8% annual. Standard annuity PV = 49,318.43.
    expect(presentValueOfStream(1_000, 60, 8)).toBeCloseTo(49_318.4331, 3);
  });

  it('is the undiscounted sum at a 0% discount rate', () => {
    expect(presentValueOfStream(1_000, 60, 0)).toBe(60_000);
  });

  it('returns 0 for a non-positive number of months', () => {
    expect(presentValueOfStream(1_000, 0, 8)).toBe(0);
    expect(presentValueOfStream(1_000, -12, 8)).toBe(0);
  });

  it('discounts harder as the required rate rises', () => {
    const at6 = presentValueOfStream(1_000, 120, 6);
    const at12 = presentValueOfStream(1_000, 120, 12);
    const at20 = presentValueOfStream(1_000, 120, 20);
    expect(at6).toBeGreaterThan(at12);
    expect(at12).toBeGreaterThan(at20);
    // A discounted stream is always worth less than its face total.
    expect(at6).toBeLessThan(1_000 * 120);
  });
});

describe('impliedAnnualizedReturn', () => {
  it('annualizes a multi-year gain', () => {
    // Double your money in 24 months -> ~41.42% annualized.
    expect(impliedAnnualizedReturn(50_000, 100_000, 24)).toBeCloseTo(0.414214, 6);
  });

  it('returns the simple return when the horizon is exactly one year', () => {
    expect(impliedAnnualizedReturn(100_000, 115_000, 12)).toBeCloseTo(0.15, 10);
  });

  it('reports a negative return on a loss', () => {
    expect(impliedAnnualizedReturn(100_000, 80_000, 12)).toBeCloseTo(-0.2, 10);
  });

  it('reports -100% on a total loss', () => {
    expect(impliedAnnualizedReturn(100_000, 0, 24)).toBe(-1);
  });

  it('returns 0 for degenerate inputs rather than dividing by zero', () => {
    expect(impliedAnnualizedReturn(0, 100_000, 24)).toBe(0);
    expect(impliedAnnualizedReturn(-5_000, 100_000, 24)).toBe(0);
    expect(impliedAnnualizedReturn(100_000, 150_000, 0)).toBe(0);
  });
});

describe('probabilityWeightedRecovery', () => {
  it('weights recovery amounts by probability', () => {
    const scenarios = [
      { probabilityPct: 50, recoveryAmount: 100_000 },
      { probabilityPct: 30, recoveryAmount: 60_000 },
      { probabilityPct: 20, recoveryAmount: 10_000 },
    ];
    // 0.5*100k + 0.3*60k + 0.2*10k
    expect(probabilityWeightedRecovery(scenarios)).toBeCloseTo(70_000, 6);
  });

  it('normalizes probabilities that do not sum to 100', () => {
    // Same relative weights as above, expressed as raw counts rather than
    // percentages. Normalizing means the user is not forced to make the
    // column add to exactly 100 before the number means anything.
    const scenarios = [
      { probabilityPct: 5, recoveryAmount: 100_000 },
      { probabilityPct: 3, recoveryAmount: 60_000 },
      { probabilityPct: 2, recoveryAmount: 10_000 },
    ];
    expect(probabilityWeightedRecovery(scenarios)).toBeCloseTo(70_000, 6);
  });

  it('returns 0 for an empty scenario set', () => {
    expect(probabilityWeightedRecovery([])).toBe(0);
  });

  it('returns 0 when every probability is zero', () => {
    expect(
      probabilityWeightedRecovery([
        { probabilityPct: 0, recoveryAmount: 100_000 },
        { probabilityPct: 0, recoveryAmount: 50_000 },
      ])
    ).toBe(0);
  });

  it('collapses to the single scenario when only one is weighted', () => {
    expect(
      probabilityWeightedRecovery([
        { probabilityPct: 0, recoveryAmount: 100_000 },
        { probabilityPct: 75, recoveryAmount: 42_000 },
      ])
    ).toBeCloseTo(42_000, 6);
  });
});

describe('probabilityWeightedMonths', () => {
  it('weights the resolution timeline by probability', () => {
    const scenarios = [
      { probabilityPct: 25, monthsToResolve: 6 },
      { probabilityPct: 75, monthsToResolve: 18 },
    ];
    expect(probabilityWeightedMonths(scenarios)).toBeCloseTo(15, 10);
  });

  it('returns 0 for an empty scenario set', () => {
    expect(probabilityWeightedMonths([])).toBe(0);
  });
});

describe('formatters', () => {
  it('renders currency and percentages', () => {
    expect(fmtCurrency(70_000)).toBe('$70,000');
    expect(fmtPercent(0.414214)).toBe('41.4%');
  });

  it('honours the digits argument on percentages', () => {
    expect(fmtPercent(0.414214, 3)).toBe('41.421%');
    expect(fmtPercent(0.414214, 0)).toBe('41%');
  });

  it('renders an em dash for non-finite input', () => {
    expect(fmtCurrency(NaN)).toBe('—');
    expect(fmtPercent(Infinity)).toBe('—');
  });
});
