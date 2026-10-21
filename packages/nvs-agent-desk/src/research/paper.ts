import type { Ledger } from '../core/ledger.ts';
import { evaluate, type Limits, type OrderIntent, type Portfolio } from './riskGate.ts';

/**
 * The only broker in this package. It moves numbers in memory.
 * There is deliberately no live adapter: a "trade.live" action can be proposed (and will be classed
 * CONSEQUENTIAL) but no executor exists to run it. Connecting one is a separate decision that needs
 * licensing and compliance review (lane separation from H.O.P.E./Primerica and any licensed practice)
 * and the principal's explicit written authorization.
 */
export class PaperBroker {
  cash: number;
  positions: Record<string, { qty: number; avgPx: number }> = {};
  dayStartNav: number;
  fills: { symbol: string; side: 'buy' | 'sell'; qty: number; price: number }[] = [];
  private readonly feeBps: number;

  constructor(opts: { cash: number; feeBps?: number }) {
    this.cash = opts.cash;
    this.dayStartNav = opts.cash;
    this.feeBps = opts.feeBps ?? 0;
  }

  nav(marks: Record<string, number>): number {
    let v = this.cash;
    for (const [s, p] of Object.entries(this.positions)) {
      const m = marks[s];
      if (m === undefined || !Number.isFinite(m)) return NaN; // an unmarked position makes NAV unknown
      v += p.qty * m;
    }
    return v;
  }

  portfolio(marks: Record<string, number>): Portfolio {
    return { nav: this.nav(marks), dayStartNav: this.dayStartNav, positions: this.positions };
  }

  fill(o: OrderIntent) {
    const fee = (o.qty * o.price * this.feeBps) / 10_000;
    const held = this.positions[o.symbol] ?? { qty: 0, avgPx: 0 };
    if (o.side === 'buy') {
      const cost = o.qty * o.price + fee;
      if (cost > this.cash) throw new Error('insufficient paper cash');
      this.cash -= cost;
      const qty = held.qty + o.qty;
      this.positions[o.symbol] = { qty, avgPx: (held.qty * held.avgPx + o.qty * o.price) / qty };
    } else {
      this.cash += o.qty * o.price - fee;
      const qty = held.qty - o.qty;
      if (qty === 0) delete this.positions[o.symbol];
      else this.positions[o.symbol] = { qty, avgPx: held.avgPx };
    }
    this.fills.push({ symbol: o.symbol, side: o.side, qty: o.qty, price: o.price });
  }
}

/** Wire the paper broker into the ledger as an unattended, reversible DRAFT-class action. */
export function registerPaperTrading(
  ledger: Ledger,
  broker: PaperBroker,
  limits: Limits,
  marks: () => Record<string, number>,
) {
  ledger.registerExecutor('trade.paper', {
    lanes: ['NVS_DELIVERY'],
    run: async (order: OrderIntent) => {
      const decision = evaluate(order, broker.portfolio(marks()), limits, ledger.halted);
      if (!decision.allow) throw new Error(`risk gate denied: ${decision.reasons.join('; ')}`);
      broker.fill(order);
      return { filled: true, nav: broker.nav(marks()) };
    },
  });
}
