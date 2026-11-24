# ⚙️ Scheduled Task Specification v2

**Status:** CANONICAL · **Version:** 2 · **Effective:** 2026-09-06 · **Owner:** Khu-el
**Supersedes:** none on record (no v1 artifact exists in this or the sibling repos as of the effective date)
**Amended:** 2026-11-24 — every section is written at the resolution set by
`../TASK_DETAIL_STANDARD.md`, and three *(if applicable)* sections are added: ⚙️ SETTINGS,
🔀 PLAN A / B / C and 🧪 ACCEPTANCE TESTS. No section is removed, and no existing definition is
invalidated: the three new sections are not in the validator's required list.

This is the standard every scheduled task (Routine, cron, trigger, recurring brief) must satisfy
**before** it is scheduled. A task that does not have every section below filled in is not ready to
schedule.

Companion files:

- `TEMPLATE.md` — copy this to `tasks/<TASK-ID>.md` and fill it in.
- `REGISTRY.md` — the index of every task defined under this spec. No orphan tasks.
- `tasks/` — one file per task, named by TASK ID.

Workflow for any new task: **SEARCH → READ → REUSE → UPDATE.** Search `REGISTRY.md` and `tasks/`
first. Create a new task file only when no existing task covers the mission.

**🔬 Resolution.** This spec says *what* a task covers; `../TASK_DETAIL_STANDARD.md` says *how
precisely* each section is written. A section filled at a lower resolution — a step with no proof,
a threshold with no named setting, a dependency with no failure response — is not filled. Run the
standard's §14 checklist before scheduling.

---

## 🏷️ TASK ID & NAME

Give the task a stable ID and clear name.

ID convention: `ST-<CAPACITY>-<NNN>` where `<CAPACITY>` is the capacity code from the table
below and `<NNN>` is a zero-padded sequence number unique within that capacity.
IDs are never reused, even after a task is terminated.

## 🎯 MISSION

State exactly what business, personal, family, research, administrative, financial, leadership,
educational, market, or operational outcome the task exists to improve.

## 🧑‍💼 CAPACITY

Identify exactly which capacity owns the task. Choose only what actually applies.
**Do not blend capacities.**

| Code    | Capacity                       |
|---------|--------------------------------|
| `PERS`  | PERSONAL                       |
| `HOPE`  | H.O.P.E. DEALERS / PRIMERICA   |
| `VZB`   | VERIZON BUSINESS               |
| `REPR`  | REPRALLY                       |
| `DIGP`  | DIGITAL PRODUCTS               |
| `NTE`   | LANE A — NTE                   |
| `HOR`   | reserved; estate work is not in this repository |
| `MM`    | MASTERMIND                     |
| `OTHER` | OTHER VERIFIED CAPACITY (name it) |

## ⏰ SCHEDULE / TRIGGER

Specify:

- cadence
- time
- timezone
- condition
- start date
- end date when applicable
- exception schedule

Routines are stored as cron in UTC. Record the local time **and** the UTC cron so the conversion
is auditable.

## 📥 INPUTS

List exactly what the task needs. Examples: calendar; emails; CRM/pipeline; financial records;
project files; previous scheduled output; prior artifact; market data; official sources; content
calendar; family ledger; decision ledger.

## 📁 CANONICAL ARTIFACTS

Identify the existing artifact(s), workbook(s), dashboard(s), report(s), or state files that
control the task.

Before generating a new artifact: **SEARCH → READ → REUSE → UPDATE.** Create new only when
necessary.

## 🔄 PRIOR-RUN CONTINUITY

Retrieve the prior run when accessible. Compare:

- what changed
- what closed
- what carried
- what failed
- what became irrelevant

**Never act as though every run is the first run.**

## 🌐 WEB RESEARCH MODE

State one: `NONE` · `QUICK VERIFY` · `STANDARD RESEARCH` · `DEEP RESEARCH`

Use DEEP RESEARCH when current external evidence materially changes the decision.
Record the AS-OF time.

## 🔎 RESEARCH QUESTIONS

For research-enabled tasks, identify:

- primary question
- subquestions
- contrary questions
- current-development questions
- unknowns requiring verification

## 🏛️ SOURCE PRIORITY

Specify the source hierarchy appropriate for the task. Prefer primary and official authority.

## ⚔️ RED-TEAM CHECK

For consequential analyses, actively search for evidence that could defeat the initial conclusion.

## 🧠 PROCESS

Give the actual analytical workflow in sequence. Do not simply say "analyze."

Write every step with the six fields of TASK_DETAIL_STANDARD §2: `STEP n · NAME` · blocking or not ·
the exact actions · done when · proof · on failure. A run reports the highest state it can prove.

## ⚙️ SETTINGS *(if applicable)*

Every threshold, window, limit and default the task uses, as a named setting: default · unit ·
min · max · who may change it (TASK_DETAIL_STANDARD §4). The task never changes a setting itself;
it may propose a change, with the numbers behind it.

## 🔀 PLAN A / B / C *(if applicable)*

Where a connector, tool or source may not be available when the task fires, write each fallback in
full and say what the output shows when it is used. A run states which plan ran. **Never pretend**
(TASK_DETAIL_STANDARD §7).

## 🌳 SCENARIOS

When applicable evaluate: `BEST` · `BASE` · `ALTERNATIVE` · `WORST` · `TAIL` · `UNKNOWN`

## 📊 VISUALS REQUIRED

Specify which visual should be produced when verified data exist. Examples: revenue pace line;
pipeline funnel; goal variance bar chart; content heatmap; market chart; cash-flow waterfall;
deadline timeline; decision matrix; risk matrix; workflow diagram.

**Never fabricate visual data.**

## 🖼️ GRAPHICS

Specify whether useful images, diagrams, maps, screenshots, or other graphical context should be
retrieved or generated. Only when materially useful.

## 📑 OUTPUT ARTIFACT

Specify whether the result should be: bulletin; dashboard; spreadsheet; report; presentation;
interactive artifact; tracker; chart; brief; no artifact.

## 🎨 DISPLAY STANDARD

Unless explicitly overridden:

- Use emoji-led navigation.
- Make the result mobile-readable.
- Use fitting emojis for sections and statuses.
- Use charts, graphics, tables, cards, or diagrams when they improve understanding.
- Do not make the output visually sterile.

## 🧾 EVIDENCE

Classify consequential claims:
`VERIFIED` · `USER-REPORTED` · `DOCUMENT-STATED` · `SYSTEM-RECORDED` · `INFERRED` · `UNKNOWN`

## ⚖️ CONTRADICTIONS

Surface conflicting evidence rather than hiding it.

## 🚨 EXCEPTION CONDITIONS

Define exactly what should trigger escalation. Examples: deadline entered alert window; pipeline
aging; automation failed; revenue pace materially behind; data unavailable; compliance conflict;
capacity contamination; artifact conflict; source contradiction; security issue.

## 🛡️ GUARDRAILS

State prohibited actions and human-approval boundaries.

## 📌 PROOF REQUIRED

Define what evidence proves successful execution or completion.

## 🧪 ACCEPTANCE TESTS *(if applicable)*

Numbered checks, each an exact input and the exact expected output — a boundary pair, a missing
input, a forbidden action refused, a source down — run once before the task is set `ACTIVE`, with
their output recorded in the Run Log (TASK_DETAIL_STANDARD §9).

## 🔄 STATE UPDATE

Specify which ledger, artifact, dashboard, or database should receive the new verified result.

## 🤝 HANDOFF

Specify which next task or review consumes this output. **No orphan tasks.**

## 📏 SUCCESS METRIC

State what determines whether this automation itself is useful. Do not measure success merely by
"task ran successfully." Measure the outcome it exists to improve.

## 🛑 KILL / MERGE RULE

State when the task should be: `MERGED` · `REDUCED` · `PAUSED` · `REPLACED` · `TERMINATED`

## 💡 SCALE CHECK

Ask after sufficient repetitions:

- Can this process become an SOP?
- Can it become a template?
- Can it become a reusable artifact?
- Can it become an interactive dashboard?
- Can it be delegated?
- Can it be automated further?
- Should it stop?

## ✅ FINAL OUTPUT

Every run should conclude with the appropriate one of:

- 🎯 DO NOW
- ⚖️ DECISION REQUIRED
- ⏳ WAITING ON
- 🧱 BLOCKED BY
- ✅ NO ACTION REQUIRED

**Do not manufacture an action when none is warranted.**
