# 📋 Claude Project Registry

Index of every Claude Project defined under `SPEC.md` (v1). A project is not created on
`claude.ai` until it has a row here **and** a filled-in file in `projects/`.

Search this file first for any new project request: **SEARCH → READ → REUSE → UPDATE.**

| Project ID | Name | Capacity | Lane | Highest class | Status | Definition | Project URL |
|---|---|---|---|---|---|---|---|
| `CP-NTE-001` | Neterverse OS — Control Plane & Governance | `NTE` | `LANE_A` | `PUBLIC` | `DRAFT` | [CP-NTE-001](projects/CP-NTE-001.md) | ❓ not yet created |
| `CP-NTE-002` | NTE Planning Tools — Lane A Apps & Backend | `NTE` | `LANE_A` | `PUBLIC` | `DRAFT` | [CP-NTE-002](projects/CP-NTE-002.md) | ❓ not yet created |
| `CP-NTE-003` | Neterverse Administration Trust DAO — Public Portal | `NTE` | `LANE_A` | `PUBLIC` | `DRAFT` | [CP-NTE-003](projects/CP-NTE-003.md) | ❓ not yet created |
| `CP-CCRLT-001` | Legacy & Estate — CCRLT (Lane B) | `CCRLT` | `LANE_B` | `CONFIDENTIAL` | `DRAFT` | [CP-CCRLT-001](projects/CP-CCRLT-001.md) | ❓ not yet created |
| `CP-PERS-001` | The Mental Performance Playbook | `PERS` | `PERSONAL` | `CONFIDENTIAL` | `DRAFT` | [CP-PERS-001](projects/CP-PERS-001.md) | ❓ not yet created |
| `CP-DIGP-001` | Digital Product Release — Wave 1 | `DIGP` | `LANE_A` | `CONFIDENTIAL` | `PAUSED` | [CP-DIGP-001](projects/CP-DIGP-001.md) | ❓ not yet created |

## Status values

`DRAFT` · `ACTIVE` · `PAUSED` · `MERGED` · `REPLACED` · `ARCHIVED`

Replaced, merged and archived projects stay in the table so their IDs are never reused and their
history stays findable.

**Every row is `DRAFT` because none of these projects exists on `claude.ai` yet.** A definition is
a reviewable draft; creating the project and uploading its bundle is a human act. Move a row to
`ACTIVE` and fill in its URL at that point — see `GETTING_STARTED.md`.

## Lane separation at a glance

The registry exists partly so this stays visible in one place:

| Lane | Projects |
|---|---|
| `LANE_A` | `CP-NTE-001` · `CP-NTE-002` · `CP-NTE-003` · `CP-DIGP-001` |
| `LANE_B` | `CP-CCRLT-001` |
| `PERSONAL` | `CP-PERS-001` |

**Nothing crosses these rows.** A Lane A project never loads Lane B material and vice versa; the
`PERSONAL` project shares nothing with either. Where a reference is genuinely needed, it is a
reference — the Business Interests registry pattern — never a copy.

## Next sequence numbers

| Capacity | Next ID |
|----------|---------|
| `PERS`   | `CP-PERS-002` |
| `HOPE`   | `CP-HOPE-001` |
| `VZB`    | `CP-VZB-001` |
| `REPR`   | `CP-REPR-001` |
| `DIGP`   | `CP-DIGP-002` |
| `NTE`    | `CP-NTE-004` |
| `HOR`    | `CP-HOR-001` |
| `CCRLT`  | `CP-CCRLT-002` |
| `MM`     | `CP-MM-001` |
| `OTHER`  | `CP-OTHER-001` |

## ⚠️ What "every project" means here

These six are derived from what is **reachable and evidenced** in this session: the two entries in
`.neterverse/state/active-projects.json`, and the three repositories on the account that were
opened and read.

`docs/continuation/SOURCE_CONFLICTS.md` records something a reader of this table needs to know.
**SC-01** documents a continuation directive naming roughly eighty active engineering projects —
Quantum Vault, SealChain, CodeSeal, Genesis Drop, Opportunity Architect, Credit Capital OS,
Neterverse University and some seventy more — **none of which appears in any reachable
repository.** SC-02 records five canonical registries that could not be located either. That
audit's ruling stands here too: working code and committed files are evidence; a project name in a
brief is 🔵 `PROPOSED` design intent, not a claim that something exists.

So this registry is **not** a claim that six is the whole portfolio. It is the set of projects
that could be defined against evidence rather than against a name. If any of those other systems
is real and reachable, it earns a row here the same way these did — by being read first.

## Capacities with no project yet

`HOPE`, `VZB`, `REPR`, `MM` and `HOR` appear in the capacity table but have no Claude Project
here. That is an observation, not a gap to be filled — a capacity earns a project when there is
recurring work in it that would otherwise start from zero. Creating an empty project for symmetry
would put a knowledge base with nothing in it in front of every conversation in that capacity.
