# ⚙️ Scheduled Task Definition — `ST-OTHER-002`

> Governing spec: `../SPEC.md` (v2).

| Field           | Value |
|-----------------|-------|
| 🏷️ Task ID      | `ST-OTHER-002` |
| 🏷️ Name         | Executive OS Overdue Review Escalation |
| 🧑‍💼 Capacity    | `OTHER:SYSTEMS` |
| 📆 Defined      | 2026-11-02 |
| 🔧 Status       | `ACTIVE` |
| 🔗 Routine ID   | `trig_01DyQn7mmhgwchqNPVzqwizY` |

## 🎯 MISSION

Make sure no Executive OS Knowledge Registry row sits past its Next Review date without a ClickUp
task asking a person to review it. When `ST-OTHER-001` was `REPLACED` on 2026-10-29, the principal
made two decisions. First, live Notion views replace the weekly watch: the "🛰️ Network Watch —
Overdue reviews" view on the Knowledge Index lists every overdue row. Second, overdue reviews
**escalate to ClickUp**. A view, though, only shows the problem; it does not open the task. This
task fills that gap. Once a month it reads the view and opens one ClickUp task for each overdue row
that does not already have an open one. The principal chose a scheduled task over a ClickUp
reminder on 2026-11-02.

## 🧑‍💼 CAPACITY

`OTHER:SYSTEMS`. This is the same Systems / Automation capacity as `ST-OTHER-001`, whose escalation
half this task inherits. The Knowledge Registry indexes the Executive OS's own artifacts. Its
overdue rows on 2026-11-02 are all lane `SYSTEMS` except one `PERSONAL` operating manual. The task
reads only row metadata: name, Next Review date, status and lane. It never reads or reasons over
the content of a Lane A, Lane B, licensed-practice or employment record.

## ⏰ SCHEDULE / TRIGGER

| Field              | Value |
|--------------------|-------|
| Cadence            | Monthly |
| Local time         | 16:43 on the 3rd of each month |
| Timezone           | America/New_York. The Routine carries `CRON_TZ=America/New_York 43 16 3 * *`, so 16:43 local holds across clock changes. The UTC cron shown is the EST equivalent; it becomes `43 20 3 * *` while EDT is in effect. |
| UTC cron           | `43 21 3 * *` |
| Condition          | Unconditional. A month with nothing overdue is a result, and it counts toward the kill rule. |
| Start date         | 2026-11-03 |
| End date           | *N/A — runs until the kill rule retires it* |
| Exception schedule | A fixed day of the month, not "first Monday": in cron, a restricted day-of-month **or**-matches a restricted day-of-week, so `1-7 * 1` would fire every Monday as well as days 1–7. The minute is jittered off :00/:30 and the time sits outside 9 AM–noon ET. No other task depends on it, so there is no chain. |

## ⚠️ KNOWN CONSTRAINT ON THIS ROUTINE

**The Routine is session-bound**, the same workaround `ST-OTHER-001` used. A fresh-session Routine
with Notion and ClickUp attached was attempted first on 2026-11-02. `create_trigger` refused the
`connectors` argument for this organization, so the Routine instead fires into the session that
defined the task, which holds both connectors. If that session is archived or loses its connectors,
the run must end 🧱 BLOCKED BY. The fix is the same as before: recreate the Routine in the
`claude.ai` Routines UI with Notion and ClickUp attached, then record the new ID here and in
`REGISTRY.md`.

## 📥 INPUTS

- **Executive OS Knowledge Registry** (Notion database), read through its "🛰️ Network Watch —
  Overdue reviews" view on the Knowledge Index (filter: Next Review before today)
- ClickUp **00 Executive Command → 00 DO NOW**: open tasks whose name starts "Overdue review:"

Notion and ClickUp identifiers are recorded in the Routine's stored prompt, not here, because this
repository is public.

## 📁 CANONICAL ARTIFACTS

**SEARCH → READ → REUSE → UPDATE.** The overdue view already does the detection. This task does not
build a second list.

| Artifact | Location | Role (read / update / both) |
|----------|----------|-----------------------------|
| Network Watch — Overdue reviews (view) | Notion, Knowledge Index | read |
| Executive OS Knowledge Registry | Notion | read only. The run never edits a row, and writes no run row of its own. |
| 00 Executive Command → 00 DO NOW | ClickUp | both: at most one open "Overdue review:" task per registry row |
| This definition's Run Log | this file | both: updated by a repo-connected session, never by the Routine |

## 🔄 PRIOR-RUN CONTINUITY

Prior state is in ClickUp: the "Overdue review: <row>" tasks that earlier runs opened, together with
their status. Each run reports:

- **changed:** rows newly overdue since the last run
- **closed:** "Overdue review:" tasks completed since the last run, and whether that row's Next
  Review date has moved into the future
- **carried:** rows still overdue with an open task, and that task's age
- **failed:** a task completed while its row is still overdue (the review was marked done but the
  date never moved)
- **irrelevant:** an open task whose row is no longer overdue. Report it; do not close it.

## 🌐 WEB RESEARCH MODE

`NONE`. All inputs are the principal's own Notion and ClickUp.

## 🔎 RESEARCH QUESTIONS *(if applicable)*

*N/A. The task is mechanical; the questions are the PROCESS steps.*

## 🏛️ SOURCE PRIORITY *(if applicable)*

1. The Knowledge Registry rows as fetched this run: Next Review date and Name
2. ClickUp tasks as fetched this run
3. This file's Run Log, for context only

## ⚔️ RED-TEAM CHECK *(if applicable)*

- **The view filter changed or the view is gone.** If so, query the registry directly
  (Next Review < today) and report that the view drifted. Never report "nothing overdue" from an
  empty or unreadable view.
- **A row was renamed.** Matching an existing task by name would then miss it. Match on the Notion
  row link in the task description before concluding no task exists.

## 🧠 PROCESS

1. Fetch the overdue view. If it fails, query the Knowledge Registry for rows with Next Review
   before today. If both fail, end 🧱 BLOCKED BY and write nothing.
2. Fetch the open tasks in 00 DO NOW. Include closed tasks from the last 45 days, for the
   continuity report.
3. For each overdue row, look for an open task whose description links that row. Fall back to an
   exact match on the name "Overdue review: <row name>".
4. For each overdue row with **no** open task, create one in 00 DO NOW:
   - Name "Overdue review: <row name> (due <Next Review>)", priority normal, due 7 days after the
     run.
   - Description: the row's status and lane, the number of days overdue, the Notion row link, and
     "To close: review the item, then set a new Next Review date on the row."
   - Use one batch call.
5. Never comment on or edit an existing task, and never create a second task for the same row.
6. Report what changed, closed, carried, failed and became irrelevant, as defined under PRIOR-RUN
   CONTINUITY.
7. End with exactly one final output.

## 🌳 SCENARIOS *(if applicable)*

*N/A. The task does no forecasting.*

## 📊 VISUALS REQUIRED

None. The output is a short table of rows, days overdue and task links. If the run history ever
supports a trend, use a line chart of the overdue count by month; until then write VISUAL
OMITTED — VERIFIED DATA INSUFFICIENT.

## 🖼️ GRAPHICS

NONE

## 📑 OUTPUT ARTIFACT

`tracker`: the ClickUp tasks, plus the run's final message.

## 🎨 DISPLAY STANDARD

Default per SPEC v2. Every ClickUp task is written as an inline markdown link with the task name as
the link text.

## 🧾 EVIDENCE

Consequential claims are tagged `VERIFIED` · `USER-REPORTED` · `DOCUMENT-STATED` · `SYSTEM-RECORDED` · `INFERRED` · `UNKNOWN`.
Task-specific rules:
- "Overdue" is `SYSTEM-RECORDED`, read from the registry this run. It is never carried forward from
  the Run Log.
- A completed ClickUp task is not evidence that a review happened. The row's Next Review date
  moving is the evidence.

## ⚖️ CONTRADICTIONS

⚠️ **The three-reports threshold, adapted.** The 2026-10-29 decision was to escalate a review
"once it has been reported overdue three times". That threshold was set when a report came every
week. At a monthly cadence, three reports would leave a row unescalated for about three months. So
this task escalates **any row overdue at the time of the run**: one monthly look is already longer
than three weekly ones. This is `INFERRED` from the decision, not stated in it, and the principal can
override it by restoring a threshold here. Any other conflict, such as a row overdue while its task
is closed, is reported under "failed" and is never resolved by editing either side.

## 🚨 EXCEPTION CONDITIONS

| Condition | Threshold | Escalation |
|-----------|-----------|------------|
| Notion or ClickUp unreachable | Any read fails after one retry | 🧱 BLOCKED BY; no writes |
| Usage limit reached | Any | Log the miss once in the final message and stop. No retries, no loop. |
| Overdue count jumps | More than 10 new rows in one run | Create nothing; ⚖️ DECISION REQUIRED (probably a bulk date edit or a filter change) |
| Row needs a licensed professional | The review touches legal, tax or licensed-practice content | Say so in the task description; do not tag it `INFERRED` |

## 🛡️ GUARDRAILS

**Prohibited:**
- Editing, deleting, moving or re-dating any Notion row or page
- Writing to any ClickUp list other than 00 DO NOW, or editing, closing or reassigning an existing task
- Assigning tasks to anyone, notifying watchers, or sending email
- Reading or summarizing the content of the record a row points to

**Requires human approval:**
- Changing the threshold or the cadence
- Any write beyond creating "Overdue review:" tasks

## 📌 PROOF REQUIRED

The final message lists every overdue row this run found, with its due date. For each row it
gives the open task it matched or the task it created, and each task's ClickUp link comes back from
the create call. If nothing is overdue, the message says that the view and the registry query both
returned zero rows.

## 🔄 STATE UPDATE

ClickUp 00 DO NOW receives the new tasks. A repo-connected session adds a Run Log row here when it
next touches this file. The Routine itself does not commit.

## 🤝 HANDOFF

The principal works the "Overdue review:" tasks in 00 DO NOW. Moving the row's Next Review date
closes the loop, and the next run reports the closure.

## 📏 SUCCESS METRIC

The overdue count trends to zero, and no row stays overdue for more than one run without an open
task. Counter-metric: tasks completed while their row stays overdue, which means reviews are being
marked done without the date moving.

## 🛑 KILL / MERGE RULE

| Action     | Trigger |
|------------|---------|
| MERGED     | A broader Executive OS health task with Notion and ClickUp access is defined that includes this check |
| REDUCED    | N/A. Monthly is already the minimum useful cadence. |
| PAUSED     | Any run creates a duplicate or misplaced task, pending human review |
| REPLACED   | A native Notion→ClickUp automation does the same job |
| TERMINATED | Three consecutive runs find nothing overdue (the Executive OS Review Rule, adapted to monthly) |

## 💡 SCALE CHECK

Review after 3 runs:

- [ ] Can this become an SOP? Yes. It is five mechanical steps.
- [ ] Can it become a template? The task description already is one.
- [ ] Can it become a reusable artifact? The overdue view already is.
- [ ] Can it become an interactive dashboard? Not needed; the view covers it.
- [ ] Can it be delegated? Yes, to a person with a monthly reminder. That was the alternative the principal declined on 2026-11-02.
- [ ] Can it be automated further? Only with a native Notion→ClickUp automation (see REPLACED).
- [ ] Should it stop? Under the TERMINATED rule.

## ✅ FINAL OUTPUT

Every run ends with exactly one of:
🎯 DO NOW · ⚖️ DECISION REQUIRED · ⏳ WAITING ON · 🧱 BLOCKED BY · ✅ NO ACTION REQUIRED

A run that only created tasks ends 🎯 DO NOW. A run with nothing overdue ends ✅ NO ACTION REQUIRED.

---

## 🗒️ Run Log

| Run date (AS-OF) | Final output | Changed / closed / carried / failed / irrelevant | Proof | Notes |
|------------------|--------------|--------------------------------------------------|-------|-------|
| 2026-11-02 (baseline) | — | 6 rows overdue; each already has an open task from 2026-10-29 | ClickUp 00 DO NOW | Defined. Those six tasks are what the first run carries. |
