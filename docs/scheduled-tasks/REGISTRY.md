# 📋 Scheduled Task Registry

Index of every scheduled task defined under `SPEC.md` (v2). A task is not scheduled until it has a
row here **and** a filled-in file in `tasks/`.

Search this file first for any new task request: **SEARCH → READ → REUSE → UPDATE.**

| Task ID | Name | Capacity | Cadence | Status | Definition | Routine ID | Handoff → |
|---------|------|----------|---------|--------|------------|------------|-----------|
| `ST-NTE-001` | Continuation Audit Drift Watch ⚠️ | `NTE` | Weekly · Mon 08:00 ET (`0 12 * * 1` UTC) | `ACTIVE` | [ST-NTE-001](tasks/ST-NTE-001.md) | `trig_012vVNu9cbBucVpWHAxYnQAe` | `SECURITY_FINDINGS.md` · `HUMAN_ACTION_REQUIRED.md` · principal |
| `ST-OTHER-001` | Executive OS Network Integrity Watch ⚠️ | `OTHER` | Weekly · Sun 15:46 ET (`46 19 * * 0` UTC) | `ACTIVE` | [ST-OTHER-001](tasks/ST-OTHER-001.md) | `trig_01QcstfQGZxqqARauciMntX8` | Executive OS Knowledge Registry · ClickUp 00 DO NOW · Sunday War Council |
| `ST-NTE-002` | Job Runner Worker ⏸️ | `NTE` | Hourly (`35 * * * *` UTC) | `PAUSED` | [ST-NTE-002](tasks/ST-NTE-002.md) | `trig_015PsN5cjfDwgLDUq3oZzKrP` | Principal (approval gates) · ADR-0003 |

⚠️ `ST-NTE-001`'s Routine stores **no MCP connectors**, so its sessions run without GitHub and
Routines tools. Two of its PROCESS steps are degraded as a result — see the KNOWN CONSTRAINT
section in its definition. The task is genuinely scheduled; it is not fully equipped.

⚠️ `ST-OTHER-001` hit the same limit and works around it: its Routine is **session-bound**, firing
into the session that defined it, which holds the Notion and ClickUp connectors. If that session is
archived, runs end 🧱 BLOCKED BY until it is re-created from the `claude.ai` Routines UI.

⏸️ `ST-NTE-002` is `PAUSED` (2026-10-03). Its first scheduled run passed. It was then paused because a second worker fleet,
recorded as `chatgpt`, now shares the job runner's queue, and the rewritten claim function would hand this worker that
fleet's steps. The definition gives the three ways to resume.

## Status values

`DRAFT` · `ACTIVE` · `PAUSED` · `MERGED` · `REPLACED` · `TERMINATED`

Terminated, merged, and replaced tasks stay in the table (struck through or marked) so their IDs
are never reused and their history is findable.

## Next sequence numbers

| Capacity | Next ID |
|----------|---------|
| `PERS`   | `ST-PERS-001` |
| `HOPE`   | `ST-HOPE-001` |
| `VZB`    | `ST-VZB-001` |
| `REPR`   | `ST-REPR-001` |
| `DIGP`   | `ST-DIGP-001` |
| `NTE`    | `ST-NTE-003` |
| `HOR`    | `ST-HOR-001` |
| `CCRLT`  | `ST-CCRLT-001` |
| `MM`     | `ST-MM-001` |
| `OTHER`  | `ST-OTHER-002` |
