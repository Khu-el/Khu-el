import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import {
  CONSEQUENTIAL_PREFIXES,
  type Actor,
  type ActionClass,
  type ActionContext,
  type ActionRecord,
  type ActionStatus,
  type Lane,
} from './types.ts';

export type Executor = {
  /** Lanes this executor may act in. An action in any other lane is refused. */
  lanes: Lane[];
  run: (payload: any, ctx: ActionContext) => Promise<unknown>;
};

export interface LedgerOptions {
  path?: string;
  /** Ids allowed to approve CONSEQUENTIAL actions. Agents can never approve, whatever this list says. */
  humanApprovers: string[];
  perActionCapCents?: number;
  dailyCapCents?: number;
  ttlMs?: number;
  now?: () => Date;
}

export class LedgerError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Key-sorted JSON so the same payload always hashes the same. */
export function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(',')}}`;
}

export const hashPayload = (p: unknown) => createHash('sha256').update(canonical(p)).digest('hex');

/**
 * Propose -> approve -> execute, with every step in a hash-chained audit log.
 *
 * The rules this enforces structurally (the upstream projects mostly enforce them in prompts):
 *  - a CONSEQUENTIAL action runs only after a named human approved the exact payload hash;
 *  - changing the payload after approval invalidates the approval;
 *  - agents cannot approve, and an agent's own approval attempt is logged as a denial;
 *  - an executor only runs in the lanes it declares, and only inside spend caps;
 *  - one action executes at most once, and a failed one is never retried silently;
 *  - a halt switch stops all execution until a human resumes.
 */
export class Ledger {
  readonly db: DatabaseSync;
  private readonly approvers: Set<string>;
  private readonly executors = new Map<string, Executor>();
  private readonly inflight = new Set<string>();
  private readonly now: () => Date;
  private readonly perActionCap: number;
  private readonly dailyCap: number;
  private readonly ttlMs: number;

  constructor(opts: LedgerOptions) {
    this.db = new DatabaseSync(opts.path ?? ':memory:');
    this.approvers = new Set(opts.humanApprovers);
    this.now = opts.now ?? (() => new Date());
    this.perActionCap = opts.perActionCapCents ?? 0; // default: nothing that costs money runs
    this.dailyCap = opts.dailyCapCents ?? 0;
    this.ttlMs = opts.ttlMs ?? 24 * 3600_000;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL, class TEXT NOT NULL, status TEXT NOT NULL,
        context TEXT NOT NULL, payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
        cost_cents INTEGER NOT NULL, proposed_by TEXT NOT NULL, proposed_at TEXT NOT NULL,
        expires_at TEXT NOT NULL, approved_by TEXT, approved_hash TEXT, result TEXT, error TEXT,
        executed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, actor TEXT NOT NULL,
        event TEXT NOT NULL, action_id TEXT, detail TEXT NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `);
  }

  registerExecutor(kind: string, executor: Executor) {
    this.executors.set(kind, executor);
  }

  // ---- proposing -----------------------------------------------------------------

  propose(input: {
    kind: string;
    context: ActionContext;
    payload: unknown;
    actor: Actor;
    class?: ActionClass;
    costCents?: number;
  }): ActionRecord {
    const { kind, context, payload, actor } = input;
    const costCents = input.costCents ?? 0;
    this.assertContext(context);
    if (!Number.isInteger(costCents) || costCents < 0) {
      throw new LedgerError('bad_cost', 'costCents must be a non-negative integer');
    }
    const mustBeConsequential =
      costCents > 0 || CONSEQUENTIAL_PREFIXES.some((p) => kind === p || kind.startsWith(p));
    const cls: ActionClass = input.class ?? (mustBeConsequential ? 'CONSEQUENTIAL' : 'DRAFT');
    if (mustBeConsequential && cls === 'DRAFT') {
      throw new LedgerError('class_downgrade', `"${kind}" (or any spend) cannot be classed DRAFT`);
    }
    const t = this.now();
    const id = randomUUID();
    const payloadHash = hashPayload(payload);
    this.db
      .prepare(
        `INSERT INTO actions (id, kind, class, status, context, payload, payload_hash, cost_cents,
          proposed_by, proposed_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        kind,
        cls,
        'PROPOSED',
        canonical(context),
        canonical(payload),
        payloadHash,
        costCents,
        canonical(actor),
        t.toISOString(),
        new Date(t.getTime() + this.ttlMs).toISOString(),
      );
    this.log(actor, 'proposed', id, { kind, class: cls, lane: context.lane, costCents, payloadHash });
    return this.get(id);
  }

  // ---- deciding ------------------------------------------------------------------

  /** `seenHash` is the payload hash the human was shown. Approving anything else fails. */
  approve(id: string, approver: Actor, seenHash: string): ActionRecord {
    const rec = this.get(id);
    if (approver.kind !== 'human' || !this.approvers.has(approver.id)) {
      this.log(approver, 'approval_denied', id, { reason: 'not_an_approver' });
      throw new LedgerError('not_approver', `${approver.kind}:${approver.id} may not approve actions`);
    }
    this.assertLive(rec, 'PROPOSED');
    if (seenHash !== rec.payloadHash) {
      this.log(approver, 'approval_denied', id, { reason: 'hash_mismatch' });
      throw new LedgerError('hash_mismatch', 'approval must name the exact payload hash that was reviewed');
    }
    this.db.prepare(`UPDATE actions SET status='APPROVED', approved_by=?, approved_hash=? WHERE id=?`).run(approver.id, seenHash, id);
    this.log(approver, 'approved', id, { payloadHash: seenHash });
    return this.get(id);
  }

  reject(id: string, actor: Actor, reason: string): ActionRecord {
    const rec = this.get(id);
    this.assertLive(rec, 'PROPOSED');
    this.db.prepare(`UPDATE actions SET status='REJECTED', error=? WHERE id=?`).run(reason, id);
    this.log(actor, 'rejected', id, { reason });
    return this.get(id);
  }

  revoke(id: string, actor: Actor, reason: string): ActionRecord {
    const rec = this.get(id);
    if (rec.status !== 'APPROVED' && rec.status !== 'PROPOSED') {
      throw new LedgerError('not_revocable', `status ${rec.status} cannot be revoked`);
    }
    this.db.prepare(`UPDATE actions SET status='REVOKED', error=? WHERE id=?`).run(reason, id);
    this.log(actor, 'revoked', id, { reason });
    return this.get(id);
  }

  // ---- halting -------------------------------------------------------------------

  /** Anyone, including an agent, may halt. Only a listed human may resume. */
  halt(actor: Actor, reason: string) {
    this.db.prepare(`INSERT OR REPLACE INTO meta (k,v) VALUES ('halt', ?)`).run(reason);
    this.log(actor, 'halted', null, { reason });
  }

  resume(actor: Actor) {
    if (actor.kind !== 'human' || !this.approvers.has(actor.id)) {
      throw new LedgerError('not_approver', 'only a listed human may resume');
    }
    this.db.prepare(`DELETE FROM meta WHERE k='halt'`).run();
    this.log(actor, 'resumed', null, {});
  }

  get halted(): string | null {
    const r = this.db.prepare(`SELECT v FROM meta WHERE k='halt'`).get() as { v: string } | undefined;
    return r?.v ?? null;
  }

  // ---- executing -----------------------------------------------------------------

  async execute(id: string, actor: Actor): Promise<ActionRecord> {
    const haltReason = this.halted;
    if (haltReason) throw new LedgerError('halted', `ledger halted: ${haltReason}`);
    let rec = this.get(id);
    if (rec.status === 'EXECUTED') return rec; // idempotent: never run twice
    if (this.inflight.has(id)) throw new LedgerError('inflight', 'action is already executing');
    this.assertLive(rec, rec.class === 'DRAFT' ? 'PROPOSED' : 'APPROVED');

    if (rec.class === 'CONSEQUENTIAL') {
      // Re-hash what is stored now; a payload edited after approval no longer matches.
      if (rec.approvedHash !== hashPayload(rec.payload) || rec.approvedHash !== rec.payloadHash) {
        this.fail(rec, actor, 'payload_changed_after_approval');
        throw new LedgerError('payload_changed', 'stored payload no longer matches the approved hash');
      }
    }
    const exec = this.executors.get(rec.kind);
    if (!exec) throw new LedgerError('no_executor', `no executor registered for "${rec.kind}"`);
    if (!exec.lanes.includes(rec.context.lane)) {
      this.log(actor, 'lane_refused', id, { lane: rec.context.lane, allowed: exec.lanes });
      throw new LedgerError('lane', `executor for "${rec.kind}" is not permitted in lane ${rec.context.lane}`);
    }
    if (rec.costCents > 0) this.assertWithinCaps(rec);

    this.inflight.add(id);
    try {
      const result = await exec.run(rec.payload, rec.context);
      this.db
        .prepare(`UPDATE actions SET status='EXECUTED', result=?, executed_at=? WHERE id=?`)
        .run(canonical(result ?? null), this.now().toISOString(), id);
      this.log(actor, 'executed', id, { costCents: rec.costCents });
    } catch (e) {
      this.fail(rec, actor, e instanceof Error ? e.message : String(e));
      rec = this.get(id);
      throw new LedgerError('executor_failed', rec.error ?? 'executor failed'); // failed actions are not retried
    } finally {
      this.inflight.delete(id);
    }
    return this.get(id);
  }

  // ---- reading -------------------------------------------------------------------

  get(id: string): ActionRecord {
    const r = this.db.prepare(`SELECT * FROM actions WHERE id=?`).get(id) as Record<string, any> | undefined;
    if (!r) throw new LedgerError('not_found', `no action ${id}`);
    return {
      id: r.id,
      kind: r.kind,
      class: r.class,
      status: r.status as ActionStatus,
      context: JSON.parse(r.context),
      payload: JSON.parse(r.payload),
      payloadHash: r.payload_hash,
      costCents: r.cost_cents,
      proposedBy: JSON.parse(r.proposed_by),
      proposedAt: r.proposed_at,
      expiresAt: r.expires_at,
      approvedBy: r.approved_by,
      approvedHash: r.approved_hash,
      result: r.result ? JSON.parse(r.result) : null,
      error: r.error,
    };
  }

  list(status?: ActionStatus): ActionRecord[] {
    const rows = (status
      ? this.db.prepare(`SELECT id FROM actions WHERE status=? ORDER BY proposed_at`).all(status)
      : this.db.prepare(`SELECT id FROM actions ORDER BY proposed_at`).all()) as { id: string }[];
    return rows.map((r) => this.get(r.id));
  }

  auditTrail() {
    return this.db.prepare(`SELECT * FROM audit ORDER BY seq`).all() as Record<string, any>[];
  }

  /** True if no audit row was edited or removed. Anchor `head()` somewhere outside the DB to detect truncation. */
  verifyChain(): boolean {
    let prev = 'GENESIS';
    for (const r of this.auditTrail()) {
      const h = this.chainHash(prev, r.ts, r.actor, r.event, r.action_id, r.detail);
      if (r.prev_hash !== prev || r.hash !== h) return false;
      prev = r.hash;
    }
    return true;
  }

  head(): string {
    const r = this.db.prepare(`SELECT hash FROM audit ORDER BY seq DESC LIMIT 1`).get() as { hash: string } | undefined;
    return r?.hash ?? 'GENESIS';
  }

  // ---- internals -----------------------------------------------------------------

  private assertContext(c: ActionContext) {
    const missing = (['entity', 'sourceOfTruth', 'owner'] as const).filter((k) => !c[k]?.trim());
    if (missing.length) throw new LedgerError('context', `context missing: ${missing.join(', ')}`);
    if (c.lane === 'UNCLASSIFIED') throw new LedgerError('context', 'lane must be declared (UNCLASSIFIED is refused)');
    if (!c.confidentiality) throw new LedgerError('context', 'confidentiality must be declared');
    if (c.tenant === undefined) throw new LedgerError('context', 'tenant must be declared (null for internal work)');
  }

  private assertLive(rec: ActionRecord, want: ActionStatus) {
    if (rec.status !== want) throw new LedgerError('state', `action is ${rec.status}, expected ${want}`);
    if (this.now().toISOString() > rec.expiresAt) {
      this.db.prepare(`UPDATE actions SET status='EXPIRED' WHERE id=?`).run(rec.id);
      this.log({ kind: 'agent', id: 'ledger' }, 'expired', rec.id, {});
      throw new LedgerError('expired', 'action expired before it ran');
    }
  }

  private assertWithinCaps(rec: ActionRecord) {
    if (rec.costCents > this.perActionCap) {
      throw new LedgerError('cap_action', `cost ${rec.costCents}c exceeds per-action cap ${this.perActionCap}c`);
    }
    const day = this.now().toISOString().slice(0, 10);
    const spent = (
      this.db
        .prepare(`SELECT COALESCE(SUM(cost_cents),0) s FROM actions WHERE status='EXECUTED' AND substr(executed_at,1,10)=?`)
        .get(day) as { s: number }
    ).s;
    if (spent + rec.costCents > this.dailyCap) {
      throw new LedgerError('cap_daily', `would reach ${spent + rec.costCents}c today; daily cap ${this.dailyCap}c`);
    }
  }

  private fail(rec: ActionRecord, actor: Actor, reason: string) {
    this.db.prepare(`UPDATE actions SET status='FAILED', error=? WHERE id=?`).run(reason, rec.id);
    this.log(actor, 'failed', rec.id, { reason });
  }

  private chainHash(prev: string, ts: string, actor: string, event: string, actionId: string | null, detail: string) {
    return createHash('sha256').update([prev, ts, actor, event, actionId ?? '', detail].join('|')).digest('hex');
  }

  private log(actor: Actor, event: string, actionId: string | null, detail: Record<string, unknown>) {
    const ts = this.now().toISOString();
    const a = `${actor.kind}:${actor.id}`;
    const d = canonical(detail);
    const prev = this.head();
    this.db
      .prepare(`INSERT INTO audit (ts, actor, event, action_id, detail, prev_hash, hash) VALUES (?,?,?,?,?,?,?)`)
      .run(ts, a, event, actionId, d, prev, this.chainHash(prev, ts, a, event, actionId, d));
  }
}
