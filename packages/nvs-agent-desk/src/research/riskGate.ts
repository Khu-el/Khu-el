import { EVIDENCE_RANK, type Actor, type Evidence, type EvidenceRef } from '../core/types.ts';

// In AutoHedge the "Risk-Manager" is an LLM prompt asked to "provide a recommended position size", and the
// execution agent can sign swaps with a private key read from the environment. Here risk is code: the
// model may propose, but a deterministic gate decides, and anything it cannot compute is a denial.

export interface Thesis {
  summary: string;
  evidence: EvidenceRef[];
  authoredBy: Actor;
}

export interface OrderIntent {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  stopPrice: number | null;
  thesis: Thesis | null;
}

export interface Portfolio {
  nav: number;
  dayStartNav: number;
  positions: Record<string, { qty: number; avgPx: number }>;
}

export interface Limits {
  allowedSymbols: string[];
  maxPositionPct: number; // of NAV, per symbol, after the fill
  maxRiskPerTradePct: number; // (price - stop) * qty as % of NAV
  maxDailyLossPct: number; // new buys denied once NAV is down this much since day start
  minEvidence: Evidence; // weakest evidence a buy thesis must cite at least once
}

export interface GateDecision {
  allow: boolean;
  reasons: string[];
}

export function evaluate(order: OrderIntent, pf: Portfolio, limits: Limits, halted: string | null): GateDecision {
  const deny: string[] = [];
  if (halted) deny.push(`halted: ${halted}`);

  const numbers = { qty: order.qty, price: order.price, nav: pf.nav, dayStartNav: pf.dayStartNav };
  for (const [k, v] of Object.entries(numbers)) {
    if (!Number.isFinite(v) || v <= 0) deny.push(`${k} is missing or not positive`);
  }
  if (deny.length) return { allow: false, reasons: deny };

  if (!limits.allowedSymbols.includes(order.symbol)) deny.push(`${order.symbol} is not on the allowlist`);

  const held = pf.positions[order.symbol]?.qty ?? 0;
  if (order.side === 'sell') {
    if (order.qty > held) deny.push(`sell ${order.qty} exceeds held ${held} (no shorting)`);
    return { allow: deny.length === 0, reasons: deny };
  }

  // Buys carry the full burden of proof.
  const need = EVIDENCE_RANK[limits.minEvidence];
  const strong = (order.thesis?.evidence ?? []).filter((e) => EVIDENCE_RANK[e.status] >= need);
  if (!order.thesis) deny.push('buy has no thesis');
  else if (strong.length === 0) deny.push(`thesis cites no evidence at or above ${limits.minEvidence}`);

  if (order.stopPrice === null || !Number.isFinite(order.stopPrice)) deny.push('buy requires a stop price');
  else if (order.stopPrice >= order.price) deny.push('stop must be below entry price');
  else {
    const risk = (order.price - order.stopPrice) * order.qty;
    if (risk > (limits.maxRiskPerTradePct / 100) * pf.nav) {
      deny.push(`risk ${risk.toFixed(2)} exceeds ${limits.maxRiskPerTradePct}% of NAV`);
    }
  }

  const notionalAfter = (held + order.qty) * order.price;
  if (notionalAfter > (limits.maxPositionPct / 100) * pf.nav) {
    deny.push(`position would be ${((notionalAfter / pf.nav) * 100).toFixed(1)}% of NAV; limit ${limits.maxPositionPct}%`);
  }

  const dayPnlPct = (pf.nav / pf.dayStartNav - 1) * 100;
  if (dayPnlPct <= -limits.maxDailyLossPct) deny.push(`daily loss ${dayPnlPct.toFixed(2)}% hit the ${limits.maxDailyLossPct}% limit`);

  return { allow: deny.length === 0, reasons: deny };
}
