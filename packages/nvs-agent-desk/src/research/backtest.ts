import { computeMetrics, type Metrics } from './metrics.ts';

export interface Bar {
  t: string; // ISO timestamp, strictly increasing
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Target exposure after seeing `history` (which ends at the current, just-closed bar): 0 = flat, 1 = fully long. */
export type Strategy = (history: readonly Bar[]) => 0 | 1;

export interface BacktestConfig {
  periodsPerYear: number;
  feeBps: number; // per side
  slippageBps: number; // per side
  initialEquity?: number;
}

export interface Trade {
  entryT: string;
  exitT: string | null;
  entryPx: number;
  exitPx: number | null;
  ret: number | null; // net of costs; null while open
}

export interface BacktestResult {
  equity: number[];
  trades: Trade[];
  metrics: Metrics & { winRate: number; nTrades: number };
  costDragBps: number;
}

export function validateBars(bars: readonly Bar[]) {
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    for (const k of ['open', 'high', 'low', 'close'] as const) {
      if (!Number.isFinite(b[k]) || b[k] <= 0) throw new Error(`bar ${i} (${b.t}): ${k} is not a positive number`);
    }
    if (b.high < Math.max(b.open, b.close) || b.low > Math.min(b.open, b.close)) {
      throw new Error(`bar ${i} (${b.t}): high/low do not bound open/close`);
    }
    if (i > 0 && !(b.t > bars[i - 1]!.t)) throw new Error(`bar ${i} (${b.t}): timestamps must be strictly increasing`);
  }
}

/**
 * No-lookahead long/flat backtest.
 * The strategy sees only bars[0..i] (a frozen copy), and any change in exposure fills at bar i+1's OPEN,
 * so a signal can never trade at a price it was computed from.
 */
export function backtest(bars: readonly Bar[], strategy: Strategy, cfg: BacktestConfig): BacktestResult {
  validateBars(bars);
  const cost = (cfg.feeBps + cfg.slippageBps) / 10_000;
  const start = cfg.initialEquity ?? 1;
  const equity: number[] = [start];
  const trades: Trade[] = [];
  let eq = start;
  let pos: 0 | 1 = 0;
  let open: Trade | null = null;
  let costPaid = 0;

  for (let i = 0; i < bars.length - 1; i++) {
    const history = Object.freeze(bars.slice(0, i + 1));
    const want = strategy(history);
    const next = bars[i + 1]!;
    const prevClose = bars[i]!.close;

    // Hold the existing position from bar i's close to bar i+1's open (overnight gap)...
    if (pos === 1) eq *= next.open / prevClose;

    // ...then trade at the open if the target changed...
    if (want !== pos) {
      eq *= 1 - cost;
      costPaid += cost;
      if (want === 1) {
        open = { entryT: next.t, exitT: null, entryPx: next.open * (1 + cost), exitPx: null, ret: null };
        trades.push(open);
      } else if (open) {
        open.exitT = next.t;
        open.exitPx = next.open * (1 - cost);
        open.ret = open.exitPx / open.entryPx - 1;
        open = null;
      }
      pos = want;
    }

    // ...and hold through the rest of bar i+1 to its close.
    if (pos === 1) eq *= next.close / next.open;
    equity.push(eq);
  }

  const closed = trades.filter((t) => t.ret !== null);
  const winRate = closed.length ? closed.filter((t) => (t.ret as number) > 0).length / closed.length : NaN;
  return {
    equity,
    trades,
    metrics: { ...computeMetrics(equity, cfg.periodsPerYear), winRate, nTrades: trades.length },
    costDragBps: costPaid * 10_000,
  };
}
