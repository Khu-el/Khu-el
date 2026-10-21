// Performance metrics. Rule from the NTE standards: a metric that cannot be computed is NaN, never 0.
// A Sharpe of 0.00 reads as "measured and flat"; NaN renders as "unknown". Vibe-Trading's own changelog
// records the same bug class being fixed repeatedly (undefined correlation shown as zero, stale annualisation).

export interface Metrics {
  totalReturn: number;
  cagr: number;
  sharpe: number;
  maxDrawdown: number; // positive fraction, e.g. 0.12 = 12% peak-to-trough
  periods: number;
}

export function returnsFromEquity(equity: readonly number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1]!;
    r.push(prev > 0 ? equity[i]! / prev - 1 : NaN);
  }
  return r;
}

export function maxDrawdown(equity: readonly number[]): number {
  if (equity.length < 2 || equity.some((x) => !Number.isFinite(x))) return NaN;
  let peak = equity[0]!;
  let worst = 0;
  for (const x of equity) {
    if (x > peak) peak = x;
    worst = Math.max(worst, peak > 0 ? (peak - x) / peak : NaN);
  }
  return worst;
}

/** `periodsPerYear` is required: 252 for daily equities, 365 for daily crypto, 52 for weekly. No silent default. */
export function computeMetrics(equity: readonly number[], periodsPerYear: number): Metrics {
  if (!(periodsPerYear > 0)) throw new Error('periodsPerYear must be > 0');
  const periods = equity.length - 1;
  const blank: Metrics = { totalReturn: NaN, cagr: NaN, sharpe: NaN, maxDrawdown: NaN, periods: Math.max(periods, 0) };
  if (periods < 1 || equity.some((x) => !Number.isFinite(x)) || equity[0]! <= 0) return blank;

  const totalReturn = equity[periods]! / equity[0]! - 1;
  const years = periods / periodsPerYear;
  const cagr = equity[periods]! > 0 ? Math.pow(equity[periods]! / equity[0]!, 1 / years) - 1 : -1;

  const r = returnsFromEquity(equity);
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.length > 1 ? r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1) : NaN;
  const sd = Math.sqrt(variance);
  // Zero variance means Sharpe is undefined, not zero.
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(periodsPerYear) : NaN;

  return { totalReturn, cagr, sharpe, maxDrawdown: maxDrawdown(equity), periods };
}

/** Render a possibly-unknown number. Mirrors the apps' fmt* helpers. */
export const fmt = (x: number, digits = 2) => (Number.isFinite(x) ? x.toFixed(digits) : '—');
