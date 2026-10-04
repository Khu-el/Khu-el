# 📋 Scheduled Task Registry

Index of every scheduled task defined under `SPEC.md` (v2). A task is not scheduled until it has a
row here **and** a filled-in file in `tasks/`.

Search this file first for any new task request: **SEARCH → READ → REUSE → UPDATE.**

| Task ID | Name | Capacity | Cadence | Status | Definition | Routine ID | Handoff → |
|---------|------|----------|---------|--------|------------|------------|-----------|
| `ST-NTE-001` | Continuation Audit Drift Watch ⚠️ | `NTE` | Weekly · Mon 08:00 ET (`0 12 * * 1` UTC) | `ACTIVE` | [ST-NTE-001](tasks/ST-NTE-001.md) | `trig_012vVNu9cbBucVpWHAxYnQAe` | `SECURITY_FINDINGS.md` · `HUMAN_ACTION_REQUIRED.md` · principal |
| `ST-OTHER-001` | Executive OS Network Integrity Watch ⚠️ | `OTHER` | Weekly · Sun 15:46 ET (`46 19 * * 0` UTC) | `ACTIVE` | [ST-OTHER-001](tasks/ST-OTHER-001.md) | `trig_01QcstfQGZxqqARauciMntX8` | Executive OS Knowledge Registry · ClickUp 00 DO NOW · Sunday War Council |
| `ST-NTE-002` | Job Runner Worker ⏸️ | `NTE` | Hourly (`35 * * * *` UTC) | `PAUSED` | [ST-NTE-002](tasks/ST-NTE-002.md) | `trig_015PsN5cjfDwgLDUq3oZzKrP` | Principal (approval gates) · ADR-0003 |
| `ST-PERS-001` | GodMode Daily Bulletin | `PERS` | Daily · 05:35 ET (`35 9 * * *` UTC) | `DRAFT` | [ST-PERS-001](tasks/ST-PERS-001.md) | — not scheduled | `ST-PERS-002` · principal |
| `ST-PERS-002` | S-05 Evening Ascension | `PERS` | Daily · 21:30 ET (`30 1 * * *` UTC) | `DRAFT` | [ST-PERS-002](tasks/ST-PERS-002.md) | — not scheduled | Paired with `ST-PERS-001` (terminal reflection) |
| `ST-HOR-001` | S-08 House of Ransom Bulletin | `HOR` | Weekly · Sun 08:00 EDT / 07:00 EST (`0 12 * * 0` UTC) | `DRAFT` | [ST-HOR-001](tasks/ST-HOR-001.md) | — not scheduled | Sunday 09:00 Family Council · `PR-` packets |
| `ST-NTE-003` | NTE Financial Briefing ⚠️ | `NTE` | Weekdays · 08:00 ET (`0 12 * * 1-5` UTC) | `DRAFT` | [ST-NTE-003](tasks/ST-NTE-003.md) | — not scheduled | Principal (action queue) · `PR-` packets |

⚠️ `ST-NTE-001`'s Routine stores **no MCP connectors**, so its sessions run without GitHub and
Routines tools. Two of its PROCESS steps are degraded as a result — see the KNOWN CONSTRAINT
section in its definition. The task is genuinely scheduled; it is not fully equipped.

⚠️ `ST-OTHER-001` hit the same limit and works around it: its Routine is **session-bound**, firing
into the session that defined it, which holds the Notion and ClickUp connectors. If that session is
archived, runs end 🧱 BLOCKED BY until it is re-created from the `claude.ai` Routines UI.

⏸️ `ST-NTE-002` is `PAUSED` (2026-10-03). Its first scheduled run passed. It was then paused because a second worker fleet,
recorded as `chatgpt`, now shares the job runner's queue, and the rewritten claim function would hand this worker that
fleet's steps. The definition gives the three ways to resume.

⚠️ `ST-NTE-003`'s capacity is **provisional**. Its source prompt runs Lane A, Lane B and personal
sections in one output, which SPEC v2's one-capacity rule does not permit. `NTE` is recorded because
the task is named and primarily scoped to Lane A, but the question is open and the task stays
`DRAFT` until the principal decides. Both options and their costs are in its CONTRADICTIONS section
and in `../continuation/SOURCE_CONFLICTS.md` SC-12.

📋 **Four of the five active ChatGPT tasks in the migration kit are now defined** (`ST-PERS-001`,
`ST-PERS-002`, `ST-HOR-001`, `ST-NTE-003`). The fifth — **Run Marketing Campaigns** — has no
definition on purpose: it blends `HOPE`, `VZB` and `NTE`, and splitting it would break the
cross-brand no-repeat ledger its prompt depends on. SC-12 records the conflict and what a human
needs to decide. **All four are `DRAFT` and none is scheduled**; the matching ChatGPT tasks are
untouched, per the kit's rule that a ChatGPT task is paused only at its own cutover.

## Status values

`DRAFT` · `ACTIVE` · `PAUSED` · `MERGED` · `REPLACED` · `TERMINATED`

Terminated, merged, and replaced tasks stay in the table (struck through or marked) so their IDs
are never reused and their history is findable.

## Next sequence numbers

| Capacity | Next ID |
|----------|---------|
| `PERS`   | `ST-PERS-003` |
| `HOPE`   | `ST-HOPE-001` |
| `VZB`    | `ST-VZB-001` |
| `REPR`   | `ST-REPR-001` |
| `DIGP`   | `ST-DIGP-001` |
| `NTE`    | `ST-NTE-004` |
| `HOR`    | `ST-HOR-002` |
| `CCRLT`  | `ST-CCRLT-001` |
| `MM`     | `ST-MM-001` |
| `OTHER`  | `ST-OTHER-002` |
