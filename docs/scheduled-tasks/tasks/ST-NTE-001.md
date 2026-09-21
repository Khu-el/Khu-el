# ⚙️ Scheduled Task Definition — `ST-NTE-001`

> Governing spec: `../SPEC.md` (v2).

| Field           | Value |
|-----------------|-------|
| 🏷️ Task ID      | `ST-NTE-001` |
| 🏷️ Name         | Continuation Audit Drift Watch |
| 🧑‍💼 Capacity    | `NTE` |
| 📆 Defined      | 2026-09-21 |
| 🔧 Status       | `ACTIVE` |
| 🔗 Routine ID   | `trig_012vVNu9cbBucVpWHAxYnQAe` |

## 🎯 MISSION

Keep `docs/continuation/` true. The continuation audit is a dated snapshot: it asserts which
gates pass, which workspaces have no tests, which blockers are open and which PRs are unresolved.
Every one of those claims decays the moment someone merges. An audit that is quietly wrong is
worse than no audit, because it is still being read as evidence. This task exists to keep the
gap between what the audit asserts and what is true small enough to act on, and to notice when a
recorded blocker has actually been cleared so it stops being carried forward.

## 🧑‍💼 CAPACITY

`NTE` — Lane A. The artifacts are the NTE monorepo's own CI, registries and audit documents.
Not `CCRLT`/`HOR`: the audit covers `apps/legacy-estate` as a workspace, but reads only its code
and test configuration, never estate record content. Not `PERS`: `Khu-el/Mental-Alchemy` is in
scope as a repository whose checks are run, not as personal practice content.

## ⏰ SCHEDULE / TRIGGER

| Field              | Value |
|--------------------|-------|
| Cadence            | Weekly |
| Local time         | Monday 08:00 |
| Timezone           | America/New_York |
| UTC cron           | `0 12 * * 1` |
| Condition          | Unconditional. Runs whether or not anything merged — "nothing changed" is a result worth recording, and the audit ages even when the code does not. |
| Start date         | 2026-09-22 |
| End date           | *N/A — runs until the audit is retired or superseded* |
| Exception schedule | ⚠️ The cron is fixed UTC while the local time is not. `0 12 * * 1` is 08:00 EDT but 07:00 EST, so the run drifts an hour earlier each November and back each March. That is accepted rather than corrected: nothing about this task is hour-sensitive. Do not "fix" it by editing the cron twice a year without updating this row. |

## ⚠️ KNOWN CONSTRAINT ON THIS ROUTINE

**The Routine was created without MCP connectors**, and the create call said so explicitly:
sessions it fires run with no `mcp__*` tools. Two PROCESS steps depend on them:

| Step | Needs | Without connectors |
|---|---|---|
| 5 — reconcile Routines against the registry | the Routines API | ❌ cannot run — report ⚪ UNKNOWN, never "no orphans found" |
| 7 — re-check blockers involving PR or CI state | the GitHub API | ⚠️ partial — git fetch still works, so commits and branches are visible; PR state, review threads and workflow conclusions are not |

Everything else — fetching the repositories, running every documented check, the inventory and
registry validators, correcting the documents — needs only a shell and works normally.

**A run must not report a connector-dependent step as passing.** Absence of a check is never
evidence of health; say ⚪ UNKNOWN and name the missing tool.

**Remedy:** re-create this Routine from a session that holds the connectors, or create it from the
Routines UI on `claude.ai`, then update the Routine ID here and in `REGISTRY.md`. Recorded as a
blocker in `../../continuation/HUMAN_ACTION_REQUIRED.md`.

## 📥 INPUTS

- The three repositories' working trees: `Khu-el/Khu-el`, `Khu-el/Neterverse_DAO`, `Khu-el/Mental-Alchemy`
- Each repo's own checks — the commands in its `CLAUDE.md`, not a remembered list
- `docs/continuation/CONTINUATION_AUDIT.md` — the prior run's assertions
- `docs/continuation/HUMAN_ACTION_REQUIRED.md` — the open blockers
- `docs/continuation/SOURCE_CONFLICTS.md` — the unresolved conflicts
- `docs/continuation/inventory.json` — the machine-readable workspace inventory
- GitHub: open PRs, their CI conclusions, and `main`'s recent workflow runs
- The Routines list, for reconciliation against `docs/scheduled-tasks/REGISTRY.md`

## 📁 CANONICAL ARTIFACTS

**SEARCH → READ → REUSE → UPDATE.** This task updates existing documents; it does not create a
parallel report.

| Artifact | Location | Role (read / update / both) |
|---|---|---|
| Continuation audit | `docs/continuation/CONTINUATION_AUDIT.md` | both |
| Human action list | `docs/continuation/HUMAN_ACTION_REQUIRED.md` | both |
| Source conflicts | `docs/continuation/SOURCE_CONFLICTS.md` | both |
| Security findings | `docs/continuation/SECURITY_FINDINGS.md` | read (append only on a new finding) |
| Workspace inventory | `docs/continuation/inventory.json` | both — regenerated, never hand-edited |
| Domain / hosting map | `docs/DOMAIN_NETWORK.md` | read |
| Connector registry | `docs/CONNECTORS.md` | read |
| Scheduled task registry | `docs/scheduled-tasks/REGISTRY.md` | both |

## 🔄 PRIOR-RUN CONTINUITY

Read the previous run's entry in the Run Log below before doing anything else, then compare:

- **what changed** — commits on `main` since the last run, and which audit claims they invalidate
- **what closed** — a blocker cleared, a PR merged, a conflict resolved
- **what carried** — a blocker still open, and for how many runs (say the count; "still blocked"
  loses its force by the fourth silent repetition)
- **what failed** — a gate that passed last run and does not now
- **what became irrelevant** — a finding about code that no longer exists

**Never act as though every run is the first run.** A blocker reported three weeks running is a
different message from one reported once, and should be escalated as such.

## 🌐 WEB RESEARCH MODE

`NONE`

The inputs are this account's own repositories and their CI. No external claim is being made, so
there is nothing for outside sources to verify. A finding that *did* need external authority —
an action deprecation, a CVE in a dependency — is an EXCEPTION CONDITION and escalates rather
than being researched inside this run.

## 🔎 RESEARCH QUESTIONS

*N/A — WEB RESEARCH MODE is `NONE`.* The questions this task answers are mechanical and
internal, and are listed under PROCESS.

## 🏛️ SOURCE PRIORITY

For a task whose entire subject is its own repositories, the hierarchy is by directness:

1. **A command run in this session** — `npm test`, `npm run typecheck`, the guard scripts. Highest.
2. **Git and the GitHub API** — commit ancestry, PR state, workflow conclusions.
3. **Committed registries** — `DOMAIN_NETWORK.md`, `CONNECTORS.md`, `REGISTRY.md`. These record
   intent, and can be out of date; that gap is the finding.
4. **The prior run's Run Log.** Context, never evidence for a current claim.

A stored result never outranks a command that can be re-run. If the two disagree, re-run wins and
the disagreement is a CONTRADICTION.

## ⚔️ RED-TEAM CHECK

Before reporting ✅ on any gate, ask: **could this pass for the wrong reason?** The repository has
already been bitten once — `npm run typecheck` ended in `|| true` and could not fail, and reported
success over genuine type errors for an unknown period.

So each run confirms a green result is real by at least one of: the command's own exit code
observed directly (never a remembered outcome), a count that should change if coverage changed
(test totals), or a deliberate probe. **Never report a check as passing on the strength of it
having passed last week.**

## 🧠 PROCESS

1. **Recover prior state.** Read the last Run Log entry. Note every open blocker and its age.
2. **Sync.** Fetch all three repositories; record each `main` head.
3. **Run every documented check, in each repo**, from that repo's `CLAUDE.md` — not from memory.
   Record the command and its exit code, never a summary of how it went.
4. **Check the audit's own claims** against what just ran: test totals, the untested-workspace
   list, which gates exist. `node scripts/build-inventory.mjs --check` does the mechanical half
   and fails on drift.
5. **Validate the registries** — `npm run projects`, `node scripts/scheduled-tasks.mjs`.
6. **Reconcile Routines against the registry.** List the account's Routines; every enabled one
   should map to a row in `docs/scheduled-tasks/REGISTRY.md`. Report the unregistered ones as a
   count and by name. **Do not invent a definition for one** — an orphan Routine's mission is
   unknown, and guessing it is fabrication. This is a finding for the principal.
7. **Re-check each open blocker** in `HUMAN_ACTION_REQUIRED.md` against reality — is GitHub Pages
   enabled now, is that PR still conflicted, was the secret set. Close what is genuinely closed.
8. **Re-check each open conflict** in `SOURCE_CONFLICTS.md` the same way.
9. **Update the artifacts in place.** Correct stale figures; regenerate the inventory.
10. **Append to the Run Log** with one final-output status.

## 🌳 SCENARIOS

*N/A — this task reports observed state, and does not forecast.* Where a blocker has a range of
outcomes, that belongs in the artifact it concerns, not in a scenario table here.

## 📊 VISUALS REQUIRED

- **Blocker age**, when three or more runs of history exist: a horizontal bar per open blocker,
  length = runs open. This is the trend the prose hides.
- **Gate status**: a compact table, not a chart — a handful of pass/fail values is a table.

**Never fabricate visual data.** With fewer than three runs recorded there is no trend, so state
**VISUAL OMITTED — VERIFIED DATA INSUFFICIENT** rather than drawing a two-point line.

## 🖼️ GRAPHICS

None. No diagram, screenshot or generated image improves a drift report over a table of commands
and exit codes.

## 📑 OUTPUT ARTIFACT

**Updates to existing documents, plus a short brief** in the run's final message. No new standalone
report — a second audit document that disagrees with the first is precisely the failure this task
exists to prevent.

## 🎨 DISPLAY STANDARD

Emoji-led sections, mobile-readable, tables for gate results. Lead with what changed since the
last run, not with a restatement of the whole audit. A run where nothing changed should be short.

## 🧾 EVIDENCE

| Claim type | Classification |
|---|---|
| A command run this session, exit code observed | `VERIFIED` |
| PR state, CI conclusion, commit ancestry from the API | `SYSTEM-RECORDED` |
| A registry's contents | `DOCUMENT-STATED` — records intent, may be stale |
| "This blocker is still open" without re-checking it | `UNKNOWN` — re-check or do not claim it |
| A repository not checked out this run | `UNKNOWN` — never `VERIFIED` by absence |

⚠️ A green check is evidence for **the workspaces it ran in and nothing wider**. `npm test`
passing is not evidence the UI works; no UI test exists to pass.

## ⚖️ CONTRADICTIONS

Surface, never reconcile silently. Expected kinds:

- A registry says one thing and the repository another → record in `SOURCE_CONFLICTS.md`
- A gate passes locally and fails in CI, or the reverse → report both, investigate the difference
- The audit's figures disagree with a fresh run → the fresh run wins, and the correction is noted
  in the change table rather than quietly applied

## 🚨 EXCEPTION CONDITIONS

Escalate immediately rather than carrying to the next run:

- 🔴 A **security finding** — anything resembling SF-01..SF-04: a boundary that fails open, an
  authorization check that can be bypassed, a credential conferring more than it should
- 🔴 A **secret committed** anywhere, or `npm run bus -- audit` failing
- 🔴 `main` **red** on the documented checks
- 🟠 A gate that **could not fail** — a check whose success is unfalsifiable
- 🟠 A blocker open **four runs or more** — the escalation is that it is being ignored, not the
  blocker itself
- 🟠 An **unregistered Routine** firing against these repositories
- 🟠 Something needing an **attorney, CPA or licensed professional** →
  `PROFESSIONAL_REVIEW_REQUIRED`, which SPEC v2's vocabulary cannot express; say so explicitly
  rather than tagging it `INFERRED`

## 🛡️ GUARDRAILS

**Prohibited without an explicit instruction for that exact action:**

- 🚫 Merging any PR, or marking one ready for review
- 🚫 Enabling GitHub Pages, setting any platform secret, changing DNS, or deploying anything
- 🚫 Publishing, filing, serving, sending or recording anything (Executive OS §10)
- 🚫 Pushing to a branch other than this task's own
- 🚫 Rotating or revoking a credential
- 🚫 Writing an account, workspace or file identifier, calendar address or record content into
  committed bus state — this repository is public
- 🚫 Creating a definition for an orphan Routine by inferring its mission
- 🚫 Moving Lane B content into a Lane A artifact

**Permitted:** running checks, reading state, correcting stale figures in the continuation
documents, regenerating the inventory, opening a draft PR with those corrections.

## 📌 PROOF REQUIRED

A run is complete when it can show:

- every documented check, by command and observed exit code
- each `main` head it ran against, by SHA
- `node scripts/build-inventory.mjs --check` passing, or the drift it found
- every open blocker re-checked, with what it was checked against
- a Run Log entry appended, ending in exactly one final-output status

A run that skipped a repository says so and marks it ⚪ UNKNOWN. **Absence of a check is never
evidence of health.**

## 🔄 STATE UPDATE

- `docs/continuation/CONTINUATION_AUDIT.md` — §2 figures, §5 PR table, change table
- `docs/continuation/HUMAN_ACTION_REQUIRED.md` — blockers closed or re-dated
- `docs/continuation/SOURCE_CONFLICTS.md` — conflicts closed, new ones added
- `docs/continuation/inventory.json` — regenerated
- `docs/scheduled-tasks/REGISTRY.md` — this task's own row, and any reconciliation finding
- This file's Run Log

## 🤝 HANDOFF

- **A security finding** → `docs/continuation/SECURITY_FINDINGS.md`, and escalate to the
  principal the same run. Does not wait for the next cycle.
- **A blocker needing the principal** → `HUMAN_ACTION_REQUIRED.md`, reported with its age.
- **An unregistered Routine** → the principal, as a finding. If a scheduled-task governance
  review is ever defined, that task consumes it; until then it stops here, named, rather than
  being silently dropped.
- **A stale claim in an AI Council artifact** → `docs/ai-council/AUDIT_LOG.md`.

**No orphan output:** every finding above has a named destination.

## 📏 SUCCESS METRIC

**Not "the task ran."** This task is useful only if the continuation documents stay trustworthy
enough to act on without re-verifying them by hand.

Measured by:

1. **Time-to-correction** — how long a claim in `docs/continuation/` stayed wrong. Should be
   under one cycle.
2. **Blockers closed because the run noticed** they were already resolved, rather than being
   carried forward indefinitely.
3. **Findings caught here rather than by a person tripping over them.**

Counter-metric: if three consecutive runs report no drift and no closed blocker, the cadence is
too fast for how quickly the portfolio actually moves — reduce it under the kill/merge rule.

## 🛑 KILL / MERGE RULE

| Condition | Action |
|---|---|
| Three consecutive runs find nothing and close nothing | `REDUCED` — move to monthly |
| CI grows to enforce everything this checks | `REDUCED` to the blocker re-check only |
| A broader portfolio review task is defined that subsumes this | `MERGED` into it |
| `docs/continuation/` is superseded by a live dashboard | `REPLACED` |
| The audit is retired, or the repositories are archived | `TERMINATED` |
| Every blocker closed **and** the registries located (SC-02) | `PAUSED` — the mission is met; resume on the next portfolio-wide change |

## 💡 SCALE CHECK

- **SOP?** Partly, and that is the direction: each mechanical step should migrate into a script
  that CI runs on every PR, leaving this task only the judgment.
- **Template?** The Run Log entry, yes — a fixed shape makes drift across runs legible.
- **Reusable artifact?** `build-inventory.mjs --check` and `scheduled-tasks.mjs` came out of this
  mission and now run in CI continuously rather than weekly.
- **Interactive dashboard?** Not yet. Not until there is enough run history to show a trend.
- **Delegated?** The mechanical half, to CI — already happening. The judgment half needs the
  approval boundary understood, so it stays here.
- **Automated further?** The blocker re-check is the best remaining candidate: "is Pages enabled"
  is an API call, not a judgment.
- **Should it stop?** Yes, under the kill/merge rule above. It is scaffolding for an audit, not a
  permanent fixture.

## ✅ FINAL OUTPUT

Exactly one of: 🎯 DO NOW · ⚖️ DECISION REQUIRED · ⏳ WAITING ON · 🧱 BLOCKED BY · ✅ NO ACTION REQUIRED

**Do not manufacture an action when none is warranted.** A week where nothing changed ends
✅ NO ACTION REQUIRED, and that is a complete run.

## 🗒️ Run Log

| Run | Date | `main` heads | Drift found | Blockers closed | Final output |
|---|---|---|---|---|---|
| — | — | *No runs yet. Scheduled 2026-09-21; first fire 2026-09-28 12:00 UTC.* | — | — | — |
