import { describe, it, expect } from 'vitest';
import {
  maxAllowableOffer,
  noi,
  capRate,
  dscr,
  cashOnCash,
  ltv,
  ltc,
  monthlyPayment,
  amortizationSchedule,
  fmtCurrency,
  fmtPercent,
  fmtRatio,
} from './finance';

describe('maxAllowableOffer', () => {
  it('applies the percentage rule to ARV then subtracts repairs', () => {
    // Classic 70% rule: $300k ARV, $40k repairs -> 300000*0.7 - 40000
    expect(maxAllowableOffer(300_000, 0.7, 40_000)).toBe(170_000);
  });

  it('can go negative when repairs exceed the rule-adjusted ARV', () => {
    // Not clamped by design: a negative MAO is a real signal that the deal
    // does not work, and hiding it behind 0 would read as "offer nothing".
    expect(maxAllowableOffer(100_000, 0.7, 90_000)).toBe(-20_000);
  });
});

describe('noi', () => {
  it('annualizes the monthly spread', () => {
    expect(noi(2_500, 900)).toBe(19_200);
  });

  it('returns a negative annual figure when expenses exceed rent', () => {
    expect(noi(900, 1_100)).toBe(-2_400);
  });
});

describe('ratio helpers guard against divide-by-zero', () => {
  it('capRate returns 0 rather than Infinity at price 0', () => {
    expect(capRate(19_200, 0)).toBe(0);
    expect(capRate(19_200, 240_000)).toBeCloseTo(0.08, 10);
  });

  it('dscr returns 0 rather than Infinity at no debt service', () => {
    expect(dscr(19_200, 0)).toBe(0);
    expect(dscr(19_200, 16_000)).toBeCloseTo(1.2, 10);
  });

  it('cashOnCash returns 0 rather than Infinity at no cash invested', () => {
    expect(cashOnCash(8_000, 0)).toBe(0);
    expect(cashOnCash(8_000, 100_000)).toBeCloseTo(0.08, 10);
  });

  it('ltv and ltc return 0 rather than Infinity at zero denominator', () => {
    expect(ltv(200_000, 0)).toBe(0);
    expect(ltv(200_000, 250_000)).toBeCloseTo(0.8, 10);
    expect(ltc(180_000, 0)).toBe(0);
    expect(ltc(180_000, 240_000)).toBeCloseTo(0.75, 10);
  });
});

describe('monthlyPayment', () => {
  it('matches the standard amortization formula', () => {
    // $200,000 at 6% over 360 months. Independently: 1199.10 (2dp).
    expect(monthlyPayment(200_000, 6, 360)).toBeCloseTo(1199.1011, 3);
  });

  it('divides principal evenly at 0% interest', () => {
    expect(monthlyPayment(120_000, 0, 240)).toBe(500);
  });

  it('returns 0 for a non-positive term instead of dividing by zero', () => {
    expect(monthlyPayment(200_000, 6, 0)).toBe(0);
    expect(monthlyPayment(200_000, 0, 0)).toBe(0);
    expect(monthlyPayment(200_000, 6, -12)).toBe(0);
  });
});

describe('amortizationSchedule', () => {
  it('pays the loan down to zero over the full term', () => {
    const rows = amortizationSchedule(200_000, 6, 360);
    expect(rows).toHaveLength(360);
    expect(rows[rows.length - 1].balance).toBeLessThan(0.01);
  });

  it('splits the first payment into the expected interest and principal', () => {
    const rows = amortizationSchedule(200_000, 6, 360);
    // First month interest = 200000 * (0.06/12) = 1000 exactly.
    expect(rows[0].interest).toBeCloseTo(1000, 10);
    expect(rows[0].principal).toBeCloseTo(199.1011, 3);
    expect(rows[0].balance).toBeCloseTo(199_800.8989, 3);
  });

  it('conserves principal: the sum of principal portions equals the loan', () => {
    const rows = amortizationSchedule(200_000, 6, 360);
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    expect(totalPrincipal).toBeCloseTo(200_000, 2);
  });

  it('truncates at the balloon month and retires the balance there', () => {
    const rows = amortizationSchedule(200_000, 6, 360, 60);
    expect(rows).toHaveLength(60);

    const balloon = rows[59];
    expect(balloon.balance).toBe(0);
    // The final row's principal portion is the whole remaining balance, and its
    // payment is that balance plus that month's interest -- far bigger than the
    // level payment. This is the number a seller-carry balloon actually demands.
    expect(balloon.principal).toBeGreaterThan(180_000);
    expect(balloon.payment).toBeGreaterThan(monthlyPayment(200_000, 6, 360) * 100);
    expect(balloon.payment).toBeCloseTo(balloon.interest + balloon.principal, 6);
  });

  it('ignores a balloon month beyond the term', () => {
    const full = amortizationSchedule(120_000, 5, 120);
    const beyond = amortizationSchedule(120_000, 5, 120, 240);
    expect(beyond).toHaveLength(full.length);
    expect(beyond[beyond.length - 1].balance).toBeCloseTo(full[full.length - 1].balance, 6);
  });

  it('amortizes linearly at 0% interest', () => {
    const rows = amortizationSchedule(12_000, 0, 12);
    expect(rows).toHaveLength(12);
    expect(rows[0].interest).toBe(0);
    expect(rows[0].principal).toBe(1_000);
    expect(rows[11].balance).toBe(0);
  });

  it('returns an empty schedule for a zero-principal loan', () => {
    expect(amortizationSchedule(0, 6, 360)).toEqual([]);
  });
});

describe('formatters', () => {
  it('renders currency without cents', () => {
    expect(fmtCurrency(1_234_567)).toBe('$1,234,567');
    expect(fmtCurrency(-2_400)).toBe('-$2,400');
    // Fractional dollars round to the nearest whole dollar.
    expect(fmtCurrency(1_234_567.62)).toBe('$1,234,568');
  });

  it('renders percentages from a 0-1 ratio', () => {
    expect(fmtPercent(0.0825)).toBe('8.3%');
    expect(fmtPercent(0)).toBe('0%');
  });

  it('renders ratios with an x suffix', () => {
    expect(fmtRatio(1.2)).toBe('1.20x');
  });

  it('renders an em dash for non-finite input rather than "NaN" or "Infinity"', () => {
    // These are the values the divide-by-zero guards above are meant to prevent,
    // but the formatters are the last line of defence if one slips through.
    expect(fmtCurrency(NaN)).toBe('—');
    expect(fmtCurrency(Infinity)).toBe('—');
    expect(fmtPercent(NaN)).toBe('—');
    expect(fmtRatio(Infinity)).toBe('—');
  });
});
