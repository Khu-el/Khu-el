# 🔎 Continuation Audit — Neterverse / NTE technical portfolio

**As of:** 2026-09-21 · **Contributor:** Claude Opus 5 (Claude Code) · **Method:** commands run
in this session against working clones, plus the GitHub API. Every ✅ below names the command
that produced it.

This is an **audit finding, not a mandate** (`docs/AI_COUNCIL.md`). Acting on anything here is
governed by the approval boundary in `docs/EXECUTIVE_OS.md` §10.

> **⚠️ Read `SOURCE_CONFLICTS.md` first.** The directive that commissioned this audit names a
> portfolio of roughly eighty systems and five canonical registry files. **None of the five
> registry files, and almost none of the eighty systems, exist in any repository reachable from
> this session.** That gap is the single largest finding, and it changes how the rest of this
> document should be read.

---

## 1. What is actually reachable

Nine repositories exist on the account. **Three** were attached to this session; the other six
were listed but not opened, so nothing below claims anything about their contents.

| Repository | Visibility | Last push | In session | State |
|---|---|---|---|---|
| `Khu-el/Khu-el` | public | 2026-09-18 | ✅ | Audited, worked on |
| `Khu-el/Neterverse_DAO` | public | 2026-09-18 | ✅ | Audited |
| `Khu-el/Mental-Alchemy` | private | 2026-09-18 | ✅ | Audited |
| `Khu-el/Neterverse` | private | 2026-09-14 | ❌ | ⚪ UNKNOWN — not opened |
| `Khu-el/NeterverseDAOBeacon-neterverse-mcp` | private | 2026-09-10 | ❌ | ⚪ UNKNOWN — not opened |
| `Khu-el/NTE-Command-Center` | private | 2026-08-13 | ❌ | ⚪ UNKNOWN — see §5 |
| `Khu-el/StructureGen` | private | 2026-08-13 | ❌ | ⚪ UNKNOWN — not opened |
| `Khu-el/Marxman_SignalBot` | private | 2025-04-07 | ❌ | ⚪ UNKNOWN — not opened |
| `Khu-el/latitude-llm` | public (fork) | 2026-08-29 | ❌ | ⚪ UNKNOWN — third-party fork |

*Source: `mcp__Claude_Code_Remote__list_repos`, 2026-09-21.*

**Working trees were clean in all three attached repositories**, and the designated branch
`claude/neterverse-continuation-audit-k0meuw` existed at parity with `main` in each — no
uncommitted work and no abandoned in-flight change was found to recover.

---

## 2. Verified test and build status

Everything in this table was **run in this session**. Nothing is inferred from a previous
report or from CI history.

| Repository | Command | Result |
|---|---|---|
| `Khu-el/Khu-el` | `npm test` (all workspaces) | ✅ **182/182 pass** |
| ↳ | kernel | ✅ 98 |
| ↳ | server (**new this session**) | ✅ 23 |
| ↳ | three app `finance.ts` suites (**new this session**) | ✅ 61 |
| `Khu-el/Khu-el` | `npm run typecheck` | ✅ pass |
| `Khu-el/Khu-el` | `npm run build` (all workspaces) | ✅ pass |
| `Khu-el/Khu-el` | `npm run bus -- validate` | ✅ All registries valid |
| `Khu-el/Khu-el` | `npm run bus -- audit` | ✅ Committed bus state is clean |
| `Khu-el/Khu-el` | `npm run check:query-token` (**new this session**) | ✅ pass |
| `Khu-el/Mental-Alchemy` | `npm run check` (typecheck + 2 guards) | ✅ pass |
| `Khu-el/Neterverse_DAO` | `python3 scripts/check_page.py` | ✅ tags balanced, no external subresource |

**Where there is still nothing to run:** `packages/governance-core` and `apps/legacy-estate` have
no test runner, and no repository has a linter. **The UI is untested everywhere** — components,
tabs and stores have no coverage; the three app suites cover `finance.ts` only. A green run above
is evidence for exactly the workspaces named and nothing wider.

⚠️ `npm run check` in `Mental-Alchemy` and `check_page.py` in `Neterverse_DAO` are **boundary
guards, not tests**. They prove the data boundary and the offline-rendering boundary hold. They
say nothing about whether the app's logic is correct.

---

## 3. What changed in this session

Three commits on `claude/neterverse-continuation-audit-k0meuw` in `Khu-el/Khu-el`. Both security
findings are written up with evidence in `SECURITY_FINDINGS.md`.

| Commit | Change |
|---|---|
| `e87367d` | `?token=` accepted on the file-download route only, not on every route |
| `71670bb` | A role is assigned by the deployment, never chosen by the person registering |
| `533a985` | `server/` gains a test runner and 23 tests over the running app |
| `f71baf8` | This audit, the conflict register, the blocker list and the generated inventory |
| `88d3ca3` | Calculators return `NaN` for a missing input instead of `0`, plus 61 tests across three apps |
| *(merge)* | `main` moved mid-session — PR #11 merged, hardening the kernel and taking its suite 59 → 98. Merged in and re-verified; the figures above are post-merge |

Nothing was changed in `Neterverse_DAO` or `Mental-Alchemy`: both pass their own checks, and no
defect was found in either that would justify a change.

---

## 4. Portfolio status

Status classes are the directive's own. **`BACKLOG` here carries no commitment that the item
should be built** — most entries are ⚪ UNKNOWN provenance (see `SOURCE_CONFLICTS.md`).

| Project | Repository | Status | Evidence |
|---|---|---|---|
| Four NTE planning apps (Deal Architect, Capital Readiness, Notes Underwriting, Legacy & Estate) | `Khu-el/Khu-el` | **IN PROGRESS** | Build and typecheck pass; 61 tests cover `finance.ts` in three of them; **all UI untested** |
| Shared Express/SQLite backend | `Khu-el/Khu-el` `server/` | **IN PROGRESS** | Builds; 23 tests pass; two authorization defects fixed this session; not deployed |
| `@nte/governance-core` (shared types + UI) | `Khu-el/Khu-el` | **IN PROGRESS** | Typechecked transitively; no tests |
| `@nte/neterverse-kernel` (control plane) | `Khu-el/Khu-el` | **IN PROGRESS** | 59 tests pass; registries valid; 0/6 connectors ever observed |
| Neterverse control-plane bus (`.neterverse/`) | `Khu-el/Khu-el` | **IN PROGRESS** | `validate` and `audit` pass; live observation layer empty by design |
| Mental Performance Playbook | `Khu-el/Mental-Alchemy` | **IN PROGRESS** | `npm run check` passes; deliberately unpublished |
| Neterverse DAO portal | `Khu-el/Neterverse_DAO` | **READY FOR HUMAN APPROVAL** | Page check passes; publishing is a §10 human decision, and this repo's purpose is public-facing material |
| GitHub Pages deployment of the four apps | `Khu-el/Khu-el` | **BLOCKED — EXTERNAL DEPENDENCY** | Every run since 2026-08-19 fails at `configure-pages`; Pages is not enabled. See `HUMAN_ACTION_REQUIRED.md` |
| Backend deployment (Fly.io) | `Khu-el/Khu-el` | **BLOCKED — CREDENTIAL** | `Dockerfile` and `fly.toml` exist; no deployment; secrets are platform-set |
| Custom domains (`apps.` / `api.excellencedistrict.org`) | — | **BLOCKED — EXTERNAL DEPENDENCY** | DNS records not created; `docs/DOMAIN_NETWORK.md` has the rows |
| Everything else named in the directive | — | **BLOCKED — SOURCE/EVIDENCE** | Not found in any reachable repository; see `SOURCE_CONFLICTS.md` |

---

## 5. Open pull requests

Six across the three repositories. **None was merged, closed, rebased or pushed to in this
session** — merging is the principal's decision, and the session's branch instruction confines
commits to `claude/neterverse-continuation-audit-k0meuw`.

| PR | Repo | Title | State |
|---|---|---|---|
| [#4](https://github.com/Khu-el/Khu-el/pull/4) | `Khu-el` | NTE Command Center: 11-module console | CI green (both workflows, 2026-09-18) |
| [#5](https://github.com/Khu-el/Khu-el/pull/5) | `Khu-el` | Trust Stewardship Client Intake form | ⚠️ Untouched since 2026-09-06; base has moved; predates `verify.yml`, so no PR check has ever run on it |
| [#9](https://github.com/Khu-el/Khu-el/pull/9) | `Khu-el` | Fix the Pages deploy workflow | 🔴 **Merge conflict** (`mergeable_state: dirty`) |
| [#2](https://github.com/Khu-el/Neterverse_DAO/pull/2) | `Neterverse_DAO` | Point this repo at the canonical control plane | Open |
| [#3](https://github.com/Khu-el/Neterverse_DAO/pull/3) | `Neterverse_DAO` | Link the portal into the domain property map | Open |
| [#2](https://github.com/Khu-el/Mental-Alchemy/pull/2) | `Mental-Alchemy` | Point this repo at the control plane, and fence it off | Open |

### ⚠️ A duplication risk worth resolving before PR #4 merges

PR #4 adds an `nte-command-center/` directory **inside `Khu-el/Khu-el`**, while a separate
private repository **`Khu-el/NTE-Command-Center`** also exists. Whether these are the same
system, two generations of it, or two unrelated things is **⚪ UNKNOWN** — the repository was not
opened in this session, so no comparison was made.

This is exactly the "duplicate source of truth" the continuity rule warns against. Resolving it
is a decision, not a cleanup: see `SOURCE_CONFLICTS.md` §3.

---

## 6. Architecture and deployment — where they are already recorded

**No `ARCHITECTURE_MAP.md` or `DEPLOYMENT_MATRIX.md` is created here, deliberately.** Both
already exist under other names, and `docs/EXECUTIVE_OS.md` §4 and `CLAUDE.md` both say to
update the single copy rather than restate it:

| Question | Canonical file |
|---|---|
| Which hostname serves which property, and what DNS is still missing | `docs/DOMAIN_NETWORK.md` |
| Every connector, what it is authoritative for, what it may not do | `docs/CONNECTORS.md` |
| Control-plane design decisions | `.neterverse/decisions/ADR-0001`, `ADR-0002` |
| Repository layout, commands, hard boundaries | `CLAUDE.md` (per repo) |

Creating a second copy of any of these would make the portfolio's own worst failure mode — two
registries that disagree — the first thing this audit did.

---

## 7. Connector health, stated honestly

`npm run bus -- status` reports **6 connectors registered, 6 `LIVE_VERIFIED`** alongside
**`0/6 fresh, 6 never observed`**. These are not in conflict, and the design is sound:
`verification_state` records a past authenticated read (`last_verified: 2026-09-11`), while live
health is computed from `.neterverse/live/`, which is gitignored and empty on a fresh clone.

The registry says so itself: *"A stored date ages silently, so no field here should be read as a
claim about right now."*

**So: no connector was observed during this session, and this audit makes no claim that any of
the six is currently reachable.**

---

## 8. Next automated actions, in dependency order

1. Resolve the PR #4 / `NTE-Command-Center` duplication question — it blocks a large merge.
2. Decide PR #9 (conflicted) — the Pages workflow fix cannot land until it is merged or redone.
3. Enable GitHub Pages (`HUMAN_ACTION_REQUIRED.md` #1) — unblocks the entire frontend deployment.
4. Re-run PR #5 against current `main` — it has never been checked by CI.
5. Extend the `server/` suite past the two authorization boundaries it now covers.
6. Cover the UI — components, tabs and stores are now the largest untested surface, along with
   `governance-core` and `apps/legacy-estate`.
