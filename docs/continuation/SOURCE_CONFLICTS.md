# ⚖️ Source Conflict Register

**As of:** 2026-09-21 · **Contributor:** Claude Opus 5 (Claude Code)

Per the continuation directive: *"Never silently resolve a meaningful contradiction. Record it."*
Each entry names both sources, what they disagree about, which controls, and whether a human
must decide.

---

## SC-01 — A named portfolio of ~80 systems that is not in any reachable repository

| | |
|---|---|
| **Source A** | The continuation directive (2026-09-21), listing ~80 active engineering projects |
| **Source B** | The nine repositories on the account, three of them opened and read in this session |
| **Conflict** | Source A describes Quantum Vault, SealChain, CodeSeal, Genesis Drop, Opportunity Architect, TED Passport, Credit Capital OS, Neterverse University, District Dispatch, Phoenix Edge, an AWS/CDK estate, a Supabase schema, an Activepieces/Composio automation fabric and ~70 more. **None of these appears in the three repositories reachable from this session.** |
| **Which controls** | **Source B, for anything this audit asserts.** Working code and committed files are evidence; a project name in a brief is a 🔵 `PROPOSED` design intent, not a `DOCUMENT_CLAIM` about something that exists. |
| **Human resolution required** | ✅ **Yes** |

**Why this is not a defect in either source.** Six repositories were listed but never opened,
and work may live in Notion, Drive, Supabase, AWS or Vercel — all of which the directive names
and none of which was inspected here. **The honest status of every unlocated item is ⚪ UNKNOWN,
not "missing" and not "to be built."**

**What a human needs to decide:** for each named system, whether it (a) exists somewhere not
inspected, (b) is a design intent never started, or (c) is superseded. Until then, building any
of them from the name alone would be inventing a specification — exactly what the directive
forbids.

---

## SC-02 — Five canonical sources that do not exist where they were expected

| | |
|---|---|
| **Source A** | The directive's source-of-truth order, naming `MASTER-REGISTRY.md`, `Neterverse_Network_Problem_Solution_Registry.xlsx`, `NETWORK_BRAIN_MASTER_SOURCE.md`, `NETERVERSE_COMPLETE_NETWORK_MASTER_SOURCE.md`, `NTE_Financial_Project_Completion_Register_2026.xlsx` |
| **Source B** | `git ls-files` across all three attached repositories — 187 + 28 + 10 tracked files |
| **Conflict** | **None of the five files exists in any attached repository.** No file of any name matches them. |
| **Which controls** | Neither, yet. Their absence here is not evidence they do not exist — the directive implies they live in Notion or Drive, which were not read. |
| **Human resolution required** | ✅ **Yes — point the next session at where these actually live.** |

**Consequence, stated plainly:** the directive asks for reconciliation *against the canonical
registries*. **That reconciliation was not performed, because the registries were not located.**
Everything in `CONTINUATION_AUDIT.md` is reconciled against the repositories only. Any statement
that the portfolio "agrees with the master registry" would be fabricated.

---

## SC-03 — Two NTE Command Centers

| | |
|---|---|
| **Source A** | `Khu-el/Khu-el` PR [#4](https://github.com/Khu-el/Khu-el/pull/4), adding an `nte-command-center/` directory with 11 modules — CI green, open since 2026-09-06 |
| **Source B** | `Khu-el/NTE-Command-Center`, a separate private repository, last pushed 2026-08-13 |
| **Conflict** | Two artifacts carry the same name. Whether they are one system in two places, two generations, or unrelated is **⚪ UNKNOWN** — Source B was not opened. |
| **Which controls** | ⚪ **Undetermined.** Naming one without reading the other would be a guess. |
| **Human resolution required** | ✅ **Yes — before PR #4 merges.** |

**Why it matters now.** PR #4 is large and green, so it is the likeliest next merge. Merging it
while Source B remains authoritative for anything creates precisely the duplicate source of
truth the continuity rule forbids — and the dates suggest the PR branch (Sept) is *newer* than
the repository (Aug), which would make the repository the stale copy. **That is an inference
from push dates alone, not a reading of either codebase.**

**Cheapest resolution:** open `Khu-el/NTE-Command-Center`, compare, and either record it as
superseded or keep it and drop the directory from PR #4.

---

## SC-04 — `CLAUDE.md` said `server/` had no test runner

| | |
|---|---|
| **Source A** | `Khu-el/Khu-el` `CLAUDE.md`, test table: `server/` → ❌ none configured |
| **Source B** | `server/test/` — 23 tests, `npm run test:server`, added in commit `533a985` this session |
| **Conflict** | Source A was true when written and is now false. |
| **Which controls** | **Source B.** |
| **Human resolution required** | ❌ No — **already resolved.** `CLAUDE.md` was updated in the same commit, including what the suite does *not* cover. |

Recorded because `CLAUDE.md` warns that *"reporting 'no tests' where tests exist is the same
failure as reporting ✅ where they were never run."* A stale table is that failure.

---

## SC-05 — The directive's completion targets versus the repositories' approval boundary

| | |
|---|---|
| **Source A** | The directive: drive the portfolio to *"deployment-ready production systems"*, and *"CONTINUE"* without stopping to ask |
| **Source B** | `docs/EXECUTIVE_OS.md` §10 and all three `CLAUDE.md` files: publishing, filing, serving, sending, deploying and representing the principal are human-gated |
| **Conflict** | Apparent only. Source A explicitly carves out irreversible, public, financial and legal actions, and says to prepare them to an approval gate. |
| **Which controls** | **Both, and they agree.** Where they seem not to, the stricter reading wins — which is Source B. |
| **Human resolution required** | ❌ No |

**How it was applied in this session:** code was written, fixed, tested and pushed without
pausing. Nothing was merged, deployed, published, or sent, and no DNS or platform setting was
changed. Those sit in `HUMAN_ACTION_REQUIRED.md`.

---

## SC-06 — Lane A / Lane B separation versus a shared backend

| | |
|---|---|
| **Source A** | `CLAUDE.md` hard boundary: *"Lane A and Lane B never auto-connect."* |
| **Source B** | `server/src/lib/roles.ts`: `legacy-estate` (Lane B) is a **shared** workspace — any authenticated user reads and writes every record in it, while the three Lane A apps are private per owner |
| **Conflict** | Not a contradiction: the lanes are not *merged*, and records stay distinct. But one invite code admits a user to **all** Lane B estate records, and the same login serves both lanes. |
| **Which controls** | **Source B** — this is deliberate and documented (`legacy-estate` is described as a shared family workspace in `CLAUDE.md` itself). |
| **Human resolution required** | 🟡 **Awareness, not a decision.** |

**Verified by probe, not by reading.** Two users registered with the same invite code, both
with the default `FAMILY_COUNCIL_MEMBER` role. User A created a `legacy-estate` record; user B
then listed it (`true`), and `PUT` overwrote its contents (`200`). For contrast, B saw `0` of
A's `deal-architect` records — Lane A separation holds exactly as designed.

**Worth surfacing because the consequence is easy to miss:** issuing the invite code to someone
so they can use *Deal Architect* also gives them read **and write** access to every CCRLT /
House of Ransom estate record. There is no per-app invitation, and the write is a silent
overwrite rather than an append. Whether that is the intent is the principal's call; **no change
was made** — this is a documented design decision, not a defect, and changing it would alter how
a shared family workspace behaves.

---

## SC-07 — The scheduled-task registry is empty while Routines are firing

| | |
|---|---|
| **Source A** | `docs/scheduled-tasks/REGISTRY.md` — the index of every task defined under SPEC v2. Its table reads `_none yet_`. |
| **Source B** | The account's Routines list, 2026-09-21: **at least 20 enabled recurring Routines**, among them "💰 Financial Leakage Audit", "🏛 Rockefeller Structure Gap Audit", "🛡 Scheduled Task Health Watchdog", "📣 Crusade Content Queue" and "NTE Weekly Operations and Control Brief". |
| **Conflict** | SPEC v2 states *"A task is not scheduled until it has a row here and a filled-in file in `tasks/`"* and *"No orphan tasks."* Every one of those Routines is firing without either. |
| **Which controls** | **Source B for what is actually happening; Source A for what is governed.** The registry is not wrong about its own contents — it is simply not being used, which is the finding. |
| **Human resolution required** | ✅ **Yes** |

⚠️ **The count is a floor, not a total.** That listing was paginated and returned a
`next_cursor` that was not followed, so **at least** 20 is verified and the true number is
⚪ UNKNOWN. It also covers only enabled recurring Routines; paused and one-shot Routines were not
counted.

**Why this was not fixed here.** Writing a definition for an existing Routine means stating its
mission, capacity, inputs, guardrails and success metric. Those are knowable only from whoever
created it — inferring them from a Routine's name would be fabricating a governance record, which
is the specific failure the registry exists to prevent. `ST-NTE-001`'s PROCESS therefore reports
unregistered Routines as a finding and is explicitly forbidden from inventing definitions for them.

📌 **Possible existing owner, not yet confirmed.** One of the Routines is named *"🛡 Scheduled Task
Health Watchdog (daily 7:00 AM ET)"*. Under `SEARCH → READ → REUSE → UPDATE` that is the obvious
candidate to own this reconciliation, and a second Routine covering the same mission should not be
created before someone checks what it already does. Its definition is ⚪ UNKNOWN — it is one of the
unregistered ones.

**What a human needs to decide:** for each Routine, whether to write a definition and register it,
retire it, or record it as deliberately out of scope. Until then the registry's `_none yet_` is
accurate about itself and misleading about the account.
