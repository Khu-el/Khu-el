# 📋 Scheduled Task Registry

Index of every scheduled task defined under `SPEC.md` (v2). A task is not scheduled until it has a
row here **and** a filled-in file in `tasks/`.

Search this file first for any new task request: **SEARCH → READ → REUSE → UPDATE.**

| Task ID | Name | Capacity | Cadence | Status | Definition | Routine ID | Handoff → |
|---------|------|----------|---------|--------|------------|------------|-----------|
| `ST-NTE-001` | Continuation Audit Drift Watch ⚠️ | `NTE` | Weekly · Mon 08:00 ET (`0 12 * * 1` UTC) | `ACTIVE` | [ST-NTE-001](tasks/ST-NTE-001.md) | `trig_012vVNu9cbBucVpWHAxYnQAe` | `SECURITY_FINDINGS.md` · `HUMAN_ACTION_REQUIRED.md` · principal |

⚠️ `ST-NTE-001`'s Routine stores **no MCP connectors**, so its sessions run without GitHub and
Routines tools. Two of its PROCESS steps are degraded as a result — see the KNOWN CONSTRAINT
section in its definition. The task is genuinely scheduled; it is not fully equipped.

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
| `NTE`    | `ST-NTE-002` |
| `HOR`    | `ST-HOR-001` |
| `CCRLT`  | `ST-CCRLT-001` |
| `MM`     | `ST-MM-001` |
| `OTHER`  | `ST-OTHER-001` |
