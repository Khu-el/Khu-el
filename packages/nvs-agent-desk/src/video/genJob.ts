import type { Ledger } from '../core/ledger.ts';
import type { Actor, ActionContext, ActionRecord } from '../core/types.ts';

// The reference app (Anil-matcha/Open-Higgsfield-AI, MIT) markets "no content filters" and a white-label
// reseller model on top of a third-party API (muapi.ai). Here, generation is paid, so it is a CONSEQUENTIAL
// spend action: the cost is computed up front, bounded by the ledger's caps, and a human approves the exact
// prompt and price. Likeness of a real person must be declared with a consent reference or the job is refused.

export interface GenRequest {
  provider: string;
  model: string;
  prompt: string;
  seconds: number;
  centsPerSecond: number;
  /** Declare it. If true, a consent reference is required. */
  depictsRealPerson: boolean;
  likenessConsentRef?: string;
  usage: 'internal-draft' | 'client-deliverable' | 'public-post';
}

export class GenRefusal extends Error {}

export function estimateCents(r: Pick<GenRequest, 'seconds' | 'centsPerSecond'>): number {
  if (!(r.seconds > 0) || !(r.centsPerSecond > 0) || !Number.isFinite(r.seconds * r.centsPerSecond)) {
    throw new GenRefusal('seconds and price must be finite and strictly positive; a free path is not a spend action, so it does not belong here');
  }
  return Math.ceil(r.seconds * r.centsPerSecond);
}

export function proposeGeneration(ledger: Ledger, ctx: ActionContext, actor: Actor, r: GenRequest): ActionRecord {
  if (r.depictsRealPerson && !r.likenessConsentRef?.trim()) {
    throw new GenRefusal('prompt depicts a real person: a likeness consent reference is required');
  }
  if (r.usage === 'public-post' && ctx.confidentiality !== 'PUBLIC') {
    throw new GenRefusal('public use needs the record classified PUBLIC (publication is a separate approval)');
  }
  return ledger.propose({ kind: 'spend.video', context: ctx, actor, payload: r, costCents: estimateCents(r) });
}
