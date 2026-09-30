# ⚙️ Scheduled Task Specification v2

**Status:** CANONICAL · **Version:** 2 · **Effective:** 2026-09-06 · **Owner:** Khu-el
**Supersedes:** none on record (no v1 artifact exists in this or the sibling repos as of the effective date)

This is the standard every scheduled task (Routine, cron, trigger, recurring brief) must satisfy
**before** it is scheduled. A task that does not have every section below filled in is not ready to
schedule.

Companion files:

- `TEMPLATE.md` — copy this to `tasks/<TASK-ID>.md` and fill it in.
- `REGISTRY.md` — the index of every task defined under this spec. No orphan tasks.
- `tasks/` — one file per task, named by TASK ID.

Workflow for any new task: **SEARCH → READ → REUSE → UPDATE.** Search `REGISTRY.md` and `tasks/`
first. Create a new task file only when no existing task covers the mission.

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
| `HOR`   | HOUSE OF RANSOM / LANE B       |
| `CCRLT` | CCRLT                          |
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
