import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backtest, validateBars, type Bar } from '../src/research/backtest.ts';
import { computeMetrics, fmt } from '../src/research/metrics.ts';
import { evaluate, type Limits, type OrderIntent, type Portfolio } from '../src/research/riskGate.ts';
import { PaperBroker, registerPaperTrading } from '../src/research/paper.ts';
import { Ledger, LedgerError } from '../src/core/ledger.ts';
import type { ActionContext, Actor } from '../src/core/types.ts';

const bar = (i: number, o: number, c: number): Bar => ({
  t: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
  open: o,
  close: c,
  high: Math.max(o, c) + 1,
  low: Math.min(o, c) - 1,
});
const cfg = { periodsPerYear: 252, feeBps: 0, slippageBps: 0 };

test('buy-and-hold on a rising series matches the price change, and fills at the NEXT open', () => {
  // closes 100,110,121 ; opens equal prior close so no gaps
  const bars = [bar(0, 100, 100), bar(1, 100, 110), bar(2, 110, 121)];
  const r = backtest(bars, () => 1, cfg);
  assert.ok(Math.abs(r.equity.at(-1)! - 1.21) < 1e-9);
  assert.equal(r.trades[0]!.entryPx, 100, 'signal on bar 0 fills at bar 1 open, not bar 0 close');
});

test('a strategy cannot see the future: history ends at the current bar and is frozen', () => {
  const bars = [bar(0, 100, 100), bar(1, 100, 100), bar(2, 100, 100)];
  const seen: number[] = [];
  backtest(
    bars,
    (h) => {
      seen.push(h.length);
      assert.throws(() => (h as Bar[]).push(bar(9, 1, 1)));
      return 0;
    },
    cfg,
  );
  assert.deepEqual(seen, [1, 2]);
});

test('costs reduce return and are reported', () => {
  const bars = Array.from({ length: 6 }, (_, i) => bar(i, 100 + i, 101 + i));
  const free = backtest(bars, (h) => (h.length === 1 ? 1 : h.length === 4 ? 0 : (h.length < 4 ? 1 : 0)), cfg);
  const paid = backtest(bars, (h) => (h.length === 1 ? 1 : h.length === 4 ? 0 : (h.length < 4 ? 1 : 0)), { ...cfg, feeBps: 10, slippageBps: 5 });
  assert.ok(paid.equity.at(-1)! < free.equity.at(-1)!);
  assert.equal(paid.costDragBps, 30); // two trades x 15 bps
});

test('metrics are NaN, not 0, when they cannot be computed', () => {
  const flat = computeMetrics([1, 1, 1, 1], 252);
  assert.ok(Number.isNaN(flat.sharpe), 'zero variance means Sharpe is undefined');
  assert.equal(flat.totalReturn, 0);
  const tooShort = computeMetrics([1], 252);
  assert.ok(Number.isNaN(tooShort.totalReturn));
  assert.equal(fmt(flat.sharpe), '—');
  assert.throws(() => computeMetrics([1, 2], 0));
  const noTrades = backtest([bar(0, 100, 100), bar(1, 100, 100), bar(2, 100, 100)], () => 0, cfg);
  assert.ok(Number.isNaN(noTrades.metrics.winRate), 'win rate with zero trades is unknown');
});

test('bad data is rejected instead of silently backtested', () => {
  assert.throws(() => validateBars([bar(0, 100, 100), { ...bar(1, 100, 100), close: NaN }]));
  assert.throws(() => validateBars([bar(1, 100, 100), bar(0, 100, 100)]), /increasing/);
  assert.throws(() => validateBars([{ ...bar(0, 100, 100), high: 50 }]), /bound/);
});

// ---- risk gate ------------------------------------------------------------------------------------------

const me: Actor = { kind: 'agent', id: 'director' };
const limits: Limits = { allowedSymbols: ['SPY', 'QQQ'], maxPositionPct: 20, maxRiskPerTradePct: 1, maxDailyLossPct: 3, minEvidence: 'SYSTEM_RECORDED' };
const pf: Portfolio = { nav: 100_000, dayStartNav: 100_000, positions: {} };
const goodThesis = {
  summary: 'trend + earnings',
  authoredBy: me,
  evidence: [{ status: 'SYSTEM_RECORDED' as const, source: 'bars.csv', asOf: '2026-10-20' }],
};
const buy = (over: Partial<OrderIntent> = {}): OrderIntent => ({ symbol: 'SPY', side: 'buy', qty: 100, price: 100, stopPrice: 95, thesis: goodThesis, ...over });

test('a well-formed buy passes the gate', () => {
  assert.deepEqual(evaluate(buy(), pf, limits, null), { allow: true, reasons: [] });
});

test('an LLM-only thesis (INFERRED) does not satisfy the evidence gate', () => {
  const d = evaluate(buy({ thesis: { ...goodThesis, evidence: [{ status: 'INFERRED', source: 'model', asOf: '2026-10-20' }] } }), pf, limits, null);
  assert.equal(d.allow, false);
  assert.match(d.reasons.join(), /no evidence at or above SYSTEM_RECORDED/);
});

test('missing stop, oversize risk, oversize position, off-list symbol, and daily loss are each denied', () => {
  assert.match(evaluate(buy({ stopPrice: null }), pf, limits, null).reasons.join(), /stop price/);
  assert.equal(evaluate(buy({ stopPrice: 90 }), pf, limits, null).allow, true, 'risk exactly at the limit is allowed');
  assert.match(evaluate(buy({ stopPrice: 89 }), pf, limits, null).reasons.join(), /risk 1100.00 exceeds 1%/);
  assert.match(evaluate(buy({ qty: 300, stopPrice: 99.9 }), pf, limits, null).reasons.join(), /limit 20%/);
  assert.match(evaluate(buy({ symbol: 'DOGE' }), pf, limits, null).reasons.join(), /allowlist/);
  assert.match(evaluate(buy(), { ...pf, nav: 96_000 }, limits, null).reasons.join(), /daily loss/);
});

test('NaN or zero inputs are denials, never passes', () => {
  assert.equal(evaluate(buy({ price: NaN }), pf, limits, null).allow, false);
  assert.equal(evaluate(buy(), { ...pf, nav: NaN }, limits, null).allow, false);
});

test('shorting is impossible and halt denies everything', () => {
  assert.match(evaluate(buy({ side: 'sell' }), pf, limits, null).reasons.join(), /no shorting/);
  assert.match(evaluate(buy(), pf, limits, 'anomaly').reasons.join(), /halted/);
});

// ---- paper broker through the ledger --------------------------------------------------------------------

const ctx: ActionContext = { entity: 'NTE Virtual Solutions', lane: 'NVS_DELIVERY', tenant: null, sourceOfTruth: 'test', owner: 'Chief Ransom', confidentiality: 'INTERNAL' };

test('paper fills go through the gate; live trading cannot execute at all', async () => {
  const ledger = new Ledger({ humanApprovers: ['chief-ransom'] });
  const broker = new PaperBroker({ cash: 100_000 });
  registerPaperTrading(ledger, broker, limits, () => ({ SPY: 100 }));

  const ok = ledger.propose({ kind: 'trade.paper', context: ctx, payload: buy(), actor: me });
  assert.equal(ok.class, 'DRAFT');
  await ledger.execute(ok.id, me);
  assert.equal(broker.positions['SPY']!.qty, 100);

  const bad = ledger.propose({ kind: 'trade.paper', context: ctx, payload: buy({ stopPrice: null }), actor: me });
  await assert.rejects(ledger.execute(bad.id, me), (e: unknown) => e instanceof LedgerError && /risk gate denied/.test((e as Error).message));
  assert.equal(broker.fills.length, 1);

  const live = ledger.propose({ kind: 'trade.live', context: ctx, payload: buy(), actor: me });
  assert.equal(live.class, 'CONSEQUENTIAL');
  ledger.approve(live.id, { kind: 'human', id: 'chief-ransom' }, live.payloadHash);
  await assert.rejects(ledger.execute(live.id, me), (e: unknown) => e instanceof LedgerError && e.code === 'no_executor');
});

test('an unmarked position makes NAV unknown rather than understating it', () => {
  const b = new PaperBroker({ cash: 1000 });
  b.fill(buy({ qty: 5, price: 100 }));
  assert.ok(Number.isNaN(b.nav({})));
  assert.equal(b.nav({ SPY: 110 }), 500 + 5 * 110);
});

test('paper fills refuse a missing mark and a price far from the mark', async () => {
  const ledger = new Ledger({ humanApprovers: ['chief-ransom'] });
  const broker = new PaperBroker({ cash: 100_000 });
  registerPaperTrading(ledger, broker, limits, () => ({ SPY: 100 }), 5);
  const run = async (o: OrderIntent) => ledger.execute(ledger.propose({ kind: 'trade.paper', context: ctx, payload: o, actor: me }).id, me);
  await assert.rejects(run(buy({ symbol: 'QQQ' })), /no usable mark for QQQ/);
  await assert.rejects(run(buy({ price: 110, stopPrice: 109 })), /more than 5% from mark/);
  await run(buy({ price: 102, stopPrice: 101 })); // within tolerance
  assert.equal(broker.fills.length, 1);
});
