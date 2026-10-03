# ADR-0003 — One durable job store: Supabase holds runtime job state, the bus holds the contract

> **Status:** 🔄 ACCEPTED · **Date:** 2026-10-02
> **Lane:** `LANE_A` · **Entity:** NTE · **Capacity:** Minister / Authorized Representative
> **Risk tier:** R1 (internal, reversible) for this decision; each job carries its own tier
> **Builds on:** ADR-0001, ADR-0002
> **Decided by:** the principal, 2026-10-02, in the session that produced this record —
> `USER-REPORTED`. The proposal and the wording below are Claude Code's.

---

## 🎯 Context

By 2026-10-02 the account had two control planes and nothing saying which one owned what.

| | `.neterverse/` bus (this repo) | Supabase job runner |
|---|---|---|
| Lives in | Public git | A private Postgres project |
| Built | 2026-09-10 → 09-21, Claude Code | Migration `neterverse_job_runner_v1`, applied 2026-10-02 21:56 UTC under the principal's own Supabase account |
| Holds | Schemas, policy, connector declarations, ADRs, task packets, an append-only event log | `jobs`, `job_steps` (leases, retries, checkpoints), `approvals`, `artifacts` (sha-256), `agent_memory`, `idempotency_keys`, and `events` + `audit_logs` that are **hash-chained and refuse update or delete at the trigger level** |
| Can hold identifiers | ❌ Never — the repository is public | ✅ Yes, deny-by-default RLS, service role only |
| Has a consumer | Sessions that read the repo | ❌ **None.** The only job ever run was a single-transaction smoke test (`smoke-operator` → `smoke-worker`) |

A job system that must carry objectives, inputs, artifacts and approvals **cannot live in a
public repository** — ADR-0001 and the bus README already forbid identifiers there. And the
runner already solves two problems the bus left open: append-only by enforcement rather than
by API (AUD-KHU-002 finding A), and leases that expire on their own.

What it lacked was anything that would ever run a job.

---

## 🧭 Decisions

### 1. Supabase owns runtime job state. Nobody builds a third.

Jobs, steps, approvals, artifacts and their audit chain live in the Supabase job runner and
nowhere else. The bus does **not** mirror job rows. A new orchestration need extends the runner
with a reviewed migration; it does not start another queue in git, ClickUp, Linear or a
spreadsheet.

### 2. The bus keeps the contract

`.neterverse/` remains the public layer: schemas, the risk-tier and lane vocabulary, connector
declarations and freshness budgets, ADRs, and the event log of *control-plane* changes. The bus
task lifecycle (`tasks/`) stays for work about this repository itself — code, governance, review
between runtimes. It is not the queue for operational jobs.

### 3. Writes go through the runner's functions, never the tables

Every mutation uses a `jr_*` function — `jr_create_job`, `jr_claim_next_step`,
`jr_complete_step`, `jr_fail_step`, `jr_decide_approval`, `jr_cancel_job`, `jr_resume_job`.
Those are what maintain the lease, the idempotency record and both hash chains. A raw `UPDATE`
on `job_steps` would leave the audit chain describing a history that did not happen. Schema
changes are migrations a human has seen, not ad-hoc DDL.

### 4. The worker is a scheduled Routine holding one connector

`ST-NTE-002` (`docs/scheduled-tasks/tasks/ST-NTE-002.md`) is the worker. Each firing is a fresh
Claude Code session that holds **only the Supabase connector**, claims model and finalize steps
through `jr_claim_next_step`, does the step's work itself, and records it through
`jr_complete_step` or `jr_fail_step`.

Chosen over the alternatives because it needs **no new infrastructure and no new secret**:

| Option | Why not now |
|---|---|
| Edge function + `pg_cron` calling a model API | Needs a model API key set as a project secret (a human step), `pg_cron` enabled, and an edge function — both existing ones run with `verify_jwt: false`, which is itself unreviewed |
| An always-on worker on Fly or similar | The backend has never been deployed (HUMAN_ACTION_REQUIRED #6) |
| Activepieces (the runner names it as an actor) | Not connected to this account; ⚪ UNKNOWN whether it exists anywhere |

The cost is latency: a step waits up to one cadence interval. Swap the Routine for an
event-driven worker when one of the rows above is unblocked — the runner's contract does not
change, which is the point of decision 3.

### 5. The approval gate stays human, and is enforced in two places

The runner already refuses to let a worker pass an approval step: `jr_claim_next_step` only
claims `model` and `finalize` steps, and a job reaching an `approval` step parks in
`awaiting_approval`. In addition:

- **No Routine ever calls `jr_decide_approval`.** The worker reports pending approvals and stops.
- `jr_decide_approval` is called only by a session acting on **the principal's own words in that
  session**, naming the job and the decision. The decision note records that it was relayed.

⚠️ **The runner's own check is an identity string, not an authentication.** It compares
`p_principal_id` to `required_principal`. Any holder of the service role could pass the right
string. Until approvals arrive through an authenticated surface, the gate is procedural — this
ADR plus the worker's guardrails — and is recorded as such rather than described as enforced.

And per the runner's own design, **approval authorizes a private draft, never publication**:
every approval artifact and every completed job records `publishingAuthorized: false` /
`publishingPerformed: false`. Publishing remains a separate §10 action.

### 6. Projection runs one way, and carries counts only

Supabase → bus, never the reverse, and only as a connector observation of `supabase`:
counts of jobs by status in `metrics`, identifiers (if any) in `detail`, which never leaves
`live/`. No job title, objective, input, artifact or principal name enters this repository.

### 7. Vocabularies map, they do not multiply

| Runner | Bus / governance-core |
|---|---|
| `risk_tier` `R0`–`R4` | the same tiers, `packages/neterverse-kernel/src/risk.ts` |
| `domain` `lane_a` · `lane_b` · `personal` | `LANE_A` · `LANE_B` · `PERSONAL` |
| `domain` `licensed` · `community` | no bus equivalent — **a gap, left visible**. `licensed` work is `PROFESSIONAL_REVIEW_REQUIRED` territory and the worker refuses it |
| `agents.domain_scope` | not enforced by the runner — **the worker enforces it** |

---

## ⚖️ Consequences

- ✅ Jobs survive any session, container or model: state is in Postgres, and any authorized
  runtime that can call the `jr_*` functions can continue a job.
- ✅ The bus stops carrying a promise it could not keep (durable private job state in a public repo).
- ⚠️ Two event logs now exist — bus `events.jsonl` (control-plane changes) and runner `events`
  (job lifecycle). They record different things; do not merge them.
- ✅ **The two RC test edge functions are gone.** `coherence-rc-gates` and
  `coherence-rc-runtime-gates` were temporary validation harnesses (their own source said to
  remove them after validation, which finished 2026-09-26). They ran without JWT verification
  and could start a database load test on request. The principal deleted both from the dashboard
  on 2026-10-02/03, and both slugs return `404`, confirmed on 2026-10-03 by an independent check.
  For the record: a Claude Code redeploy briefly recreated `coherence-rc-runtime-gates` after
  that deletion. It was neutralised within minutes and then deleted again.
- ⚠️ **Open, for the principal:** the "Excellence District Production" project is no longer
  paused (`ACTIVE_HEALTHY`, 2026-10-03). Its relationship to the documented SQLite backend in
  `server/` is still ⚪ UNKNOWN. Two backends for the same apps would be a second conflict of the
  kind this ADR closes, so it needs a decision before either is deployed.
