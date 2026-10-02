# ⚙️ Scheduled Task Definition — `ST-OTHER-001`

> Governing spec: `../SPEC.md` (v2).

| Field           | Value |
|-----------------|-------|
| 🏷️ Task ID      | `ST-OTHER-001` |
| 🏷️ Name         | Executive OS Network Integrity Watch |
| 🧑‍💼 Capacity    | `OTHER:SYSTEMS` |
| 📆 Defined      | 2026-10-02 |
| 🔧 Status       | `DRAFT` |
| 🔗 Routine ID   | `trig_01BD3YpYapyhpN1pLMuv8rT1` |

## 🎯 MISSION

Keep the **Chaz Executive OS — Knowledge Index** in Notion a complete map of the operating network.
On October 2, 2026 the index linked 6 of the 24+ command centers recorded in its own two dashboard
registries, and one registered Operating Entity (9 Figure Vision) had no category hub at all.
Nothing had broken. The registries grew and the index never caught up, so the navigation layer
showed an incomplete network with no sign anything was missing. This task closes that gap each
week before the Sunday Weekly War Council, so the review starts from a complete map rather than
a partial one.

## 🧑‍💼 CAPACITY

`OTHER:SYSTEMS` — the Executive OS's own **Systems / Automation** capacity, as named in the index's
Capacity Firewall. The task maintains navigation: which page links to which. It reads registry
metadata (titles, links, lane labels, status, review dates) across lanes **because the index spans
lanes**, but it never reads, copies or reasons over the *contents* of a Lane A, Lane B, licensed or
employment record. Not `NTE`: most of the command centers it checks are not Lane A. Not `HOR` /
`CCRLT`: it never touches estate records, only a navigation link to the CCRLT command center.
Navigation does not transfer authority between capacities, and this task must never act as if it did.

## ⏰ SCHEDULE / TRIGGER

| Field              | Value |
|--------------------|-------|
| Cadence            | Weekly |
| Local time         | Sunday 15:46 |
| Timezone           | America/New_York |
| UTC cron           | `46 19 * * 0` |
| Condition          | Unconditional. A week with no gaps is a result worth recording, and it feeds the Executive OS four-empty-runs rule. |
| Start date         | 2026-10-04 |
| End date           | *N/A — runs until the kill/merge rule retires it* |
| Exception schedule | ⚠️ The cron is fixed UTC, so the run lands at 14:46 local while Eastern Standard Time is in effect (November–March). Accepted: it still precedes the 16:00 War Council. Do not edit the cron seasonally without updating this row. |

## ⚠️ KNOWN CONSTRAINT ON THIS ROUTINE

**The Routine exists but is disabled, and it holds no connectors.** It was created on 2026-10-02
from a session that could not pass connector grants: the create call refused a `connectors`
argument for this organization, and the Routine stored none. With no Notion connector, every step
of PROCESS fails at step 2. The stored prompt has a pre-check that would end each run
🧱 BLOCKED BY. Leaving it enabled would only generate a weekly blocked report, so it was disabled
the same minute.

**Remedy (principal):** in the `claude.ai` Routines UI, open this Routine, attach the **Notion** and
**ClickUp** connectors (the grant approved on 2026-10-02), enable it, then change this file's
Status to `ACTIVE` and update `REGISTRY.md`. If the UI cannot attach connectors to an existing
Routine, create a new one there with the same prompt and cron, delete this one, and record the new ID.
Recorded in `../../continuation/HUMAN_ACTION_REQUIRED.md`.

**Same root cause as `ST-NTE-001`.** Both Routines lack connectors for the same reason.

## 📥 INPUTS

- **Chaz Executive OS — Knowledge Index** (Notion), especially the Command Center Network, the
  Complete Command Center Map and Workspace Categories sections
- The 16 **category hub** pages beneath the index
- **Core Dashboard Registry** (Notion database): Lane A / Lane B entity and NTE project command centers
- **Core Ecosystem Dashboard Registry** (Notion database): umbrella, program, licensed-practice,
  employment and operating-entity command centers
- **Executive OS Knowledge Registry** (Notion database): Next Review dates and this task's own prior run rows
- ClickUp **00 Executive Command → 00 DO NOW** list, to check for an open task from a prior run
  before opening another

Notion page and database identifiers are recorded in the Routine's stored prompt, not here:
this repository is public.

## 📁 CANONICAL ARTIFACTS

**SEARCH → READ → REUSE → UPDATE.** This task updates the existing index and hubs. It does not
create a parallel map.

| Artifact | Location | Role (read / update / both) |
|---|---|---|
| Chaz Executive OS — Knowledge Index | Notion | both — append-only links |
| Category hubs (16) | Notion, children of the index | both — append-only links |
| Core Dashboard Registry | Notion | read |
| Core Ecosystem Dashboard Registry | Notion | read |
| Executive OS Knowledge Registry | Notion | both — one row per run |
| 00 Executive Command → 00 DO NOW | ClickUp | both — at most one task per run, only on an escalation |
| This definition's Run Log | this file | both — updated by a human or a repo-connected session; the Routine cannot commit here |

## 🔄 PRIOR-RUN CONTINUITY

Read the most recent **"Network Integrity Watch — <date>"** row in the Executive OS Knowledge
Registry before doing anything else, then compare:

- **what changed** — registry rows added, renamed or removed since that run
- **what closed** — a gap the last run reported that is now linked
- **what carried** — an escalated gap still unresolved, with its run count
- **what failed** — a link that resolved last run and now does not
- **what became irrelevant** — a registry row now marked superseded or archived

**Never act as though every run is the first run.** A gap reported for the third time is
reported as such, not as new.

## 🌐 WEB RESEARCH MODE

`NONE`

Every input is the principal's own Notion and ClickUp workspace. No external claim is made, so
there is nothing for outside sources to verify.

## 🔎 RESEARCH QUESTIONS

*N/A — WEB RESEARCH MODE is `NONE`.* The questions are mechanical and listed under PROCESS.

## 🏛️ SOURCE PRIORITY

1. **The two dashboard registries.** They are the record of which command centers exist.
2. **A page fetched this run.** It shows whether a link is actually present and resolves.
3. **The prior run's registry row.** Context only, never evidence for a current claim.

If the index links a page that no registry lists, that is **not** an error to remove. It is
reported as an unregistered command center for the principal to decide on.

## ⚔️ RED-TEAM CHECK

Before reporting ✅ NO ACTION REQUIRED, ask whether "no gaps" could be produced by a failed read:

- An empty registry query, a 404 or a permission error is a **failed read**, never zero gaps.
- Compare the row counts against the prior run. A sudden drop is a finding, not a cleanup.
- A mention that renders without a title may mean the connector lost access. Fetch it before
  counting it as linked.

## 🧠 PROCESS

1. **Recover prior state.** Read the latest run row in the Executive OS Knowledge Registry.
2. **Read both dashboard registries in full** (paginate). Record row counts.
3. **Fetch the index and every category hub.** Collect every page they link.
4. **Diff.** For each registry row, decide whether its command center is linked from (a) the
   index's Complete Command Center Map and (b) the category hub matching its lane or domain.
5. **Classify each gap:**
   - *Missing link, obvious destination* (the registry lane or domain maps to exactly one existing
     hub) → **auto-fix**: append one mention under that hub's registry-sourced section and under the
     matching group in the index map. Additive only.
   - *No matching hub exists* (a new domain or entity type) → **escalate**. Do not create a hub.
   - *Ambiguous lane or domain* → **escalate**.
   - *Linked but unregistered* → **report only**.
6. **Read back** every page edited and confirm each new mention resolves to the intended page.
7. **Check review dates.** List Knowledge Registry rows whose Next Review is in the past, with
   days overdue. Report them; never change their Status or dates.
8. **Write the run row** to the Executive OS Knowledge Registry (see STATE UPDATE).
9. **Escalate to ClickUp** only when the run ends 🎯 DO NOW or ⚖️ DECISION REQUIRED. First search
   the DO NOW list for an open task named `Network Integrity Watch — escalation`. Update it with a
   comment if one exists; otherwise create one. Never more than one per run.
10. **End** with exactly one final-output status.

## 🌳 SCENARIOS

*N/A — this task reports observed link state and does not forecast.*

## 📊 VISUALS REQUIRED

- **Coverage table** each run: registered command centers vs. linked, per group (Lane A, Lane B,
  public programs, licensed/employment, systems).
- **Gap trend** once three or more runs exist: open gaps per run. Until then state
  **VISUAL OMITTED — VERIFIED DATA INSUFFICIENT**.

**Never fabricate visual data.**

## 🖼️ GRAPHICS

None. A coverage table says more than a diagram for a link audit.

## 📑 OUTPUT ARTIFACT

A **tracker** row in the Executive OS Knowledge Registry, plus the in-place link additions. No
standalone report page: a second map that disagrees with the index is the failure this task exists
to prevent.

## 🎨 DISPLAY STANDARD

Emoji-led sections, mobile-readable, coverage as a table. Lead with what changed since the last
run. A run with no gaps should be three lines.

## 🧾 EVIDENCE

| Claim type | Classification |
|---|---|
| A link fetched and resolved this run | `VERIFIED` |
| A registry row's contents | `SYSTEM-RECORDED` |
| A command center's lane or domain, as the registry states it | `DOCUMENT-STATED` |
| "This gap is still open" without re-fetching | `UNKNOWN` |
| A page the connector could not open | `UNKNOWN` — never "missing" and never "linked" |

## ⚖️ CONTRADICTIONS

Surface, never reconcile silently:

- The two registries disagree on a command center's lane → escalate and edit nothing for that row.
- A registry row points to a page whose own header states a different lane → escalate.
- The index groups a center under one lane and the registry under another → report it, and do not
  move the existing link.

## 🚨 EXCEPTION CONDITIONS

- 🔴 A registry or index read fails → 🧱 BLOCKED BY, naming the page. Write nothing else.
- 🔴 Any sign of **capacity contamination**: a link that would place a Lane B record under a Lane A
  hub or the reverse, or licensed-practice material under H.O.P.E. public pages.
- 🟠 A new domain or entity type with no hub → ⚖️ DECISION REQUIRED.
- 🟠 A gap carried for **three runs** → escalate it as being ignored.
- 🟠 Registry row count drops by more than two between runs → escalate as possible data loss.
- 🟠 Anything suggesting an entity's legal form, ownership or authority changed → this needs
  `PROFESSIONAL_REVIEW_REQUIRED`, which SPEC v2's vocabulary cannot express. Say so explicitly.

## 🛡️ GUARDRAILS

**Granted by the principal on 2026-10-02:** Notion + ClickUp connectors, and additive link edits
to the index and category hubs.

**Prohibited without an explicit instruction for that exact action:**

- 🚫 Deleting, moving, renaming or archiving any page, database or row
- 🚫 Creating a category hub, command center or registry row (other than this task's run row)
- 🚫 Changing any Status, Review date, lane, entity or legal field anywhere
- 🚫 Editing page content beyond appending a mention line under a registry-sourced section
- 🚫 Publishing, sharing or changing permissions on any page
- 🚫 Writing to any ClickUp list other than 00 Executive Command → 00 DO NOW, or assigning,
  closing or reprioritizing tasks
- 🚫 Copying record content between lanes; navigation links only
- 🚫 Writing any Notion or ClickUp identifier into this public repository

## 📌 PROOF REQUIRED

- Row counts read from both registries
- Every page edited, with the mentions added, each read back after writing
- The run row's URL in the Executive OS Knowledge Registry
- The ClickUp task URL, when an escalation was filed
- Exactly one final-output status

A run that could not open a page says which one and marks it ⚪ UNKNOWN.

## 🔄 STATE UPDATE

- **Executive OS Knowledge Registry**: one row per run, titled `Network Integrity Watch — YYYY-MM-DD`,
  with Kind `Artifact Index`, Lane `SYSTEMS`, Status `REVIEW` when it made edits or escalated, else
  `VERIFIED`, and Next Review set to the following Sunday.
- The **index and hubs**: appended links.
- **ClickUp** DO NOW list: one task or comment, on escalation only.

## 🤝 HANDOFF

- **The Sunday 16:00 Weekly War Council** consumes the run row and any DO NOW task.
- **A capacity-contamination finding** → the principal the same run, via the DO NOW task.
- **Overdue reviews** → listed in the run row for the War Council; each review's owner acts on it.

**No orphan output:** every finding has a named destination.

## 📏 SUCCESS METRIC

**Not "the task ran."** Useful only if the index stays a complete map without manual audits.

1. **Time-to-link**: weeks between a command center entering a registry and being linked. Target: one run.
2. **Coverage**: linked ÷ registered command centers, shown each run. Target: 100%.
3. **Escalations resolved**: decisions the War Council actually made from this task's output.

Counter-metric: four consecutive runs with no gaps, no escalation and no overdue review means the
network has stabilised. Apply the kill/merge rule rather than letting the task run idle.

## 🛑 KILL / MERGE RULE

| Condition | Action |
|---|---|
| Four consecutive runs produce no edit, escalation or overdue finding (Executive OS Review Rule) | `REDUCED` to monthly |
| A Notion automation or synced view keeps the index map in step with the registries | `REPLACED` |
| A broader Executive OS health task is defined that includes this check | `MERGED` |
| The Knowledge Index is retired | `TERMINATED` |
| Any run causes an unintended edit | `PAUSED` immediately pending human review |

## 💡 SCALE CHECK

- **SOP?** Yes. Steps 4–5 are a deterministic rule and could be written into Executive Operations.
- **Template?** The run row has a fixed shape.
- **Reusable artifact?** The Complete Command Center Map could become a linked database view over
  both registries, which would make most of this task unnecessary. That is the likely end state.
- **Interactive dashboard?** Coverage by group, once run history exists.
- **Delegated?** The escalations cannot be: they are lane and entity decisions.
- **Automated further?** Only via the database-view replacement above.
- **Should it stop?** When that view exists, yes.

## ✅ FINAL OUTPUT

Exactly one of: 🎯 DO NOW · ⚖️ DECISION REQUIRED · ⏳ WAITING ON · 🧱 BLOCKED BY · ✅ NO ACTION REQUIRED

**Do not manufacture an action when none is warranted.**

## 🗒️ Run Log

| Run | Date | Registry rows (Core / Ecosystem) | Links added | Escalations | Final output |
|---|---|---|---|---|---|
| 0 | 2026-10-02 | 16 / 8 | Manual baseline: 9 Figure Vision hub created; Complete Command Center Map added to the index; NTE & Equity and H.O.P.E. Dealers hubs completed | — | ✅ NO ACTION REQUIRED (baseline, run by hand before scheduling) |
