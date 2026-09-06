# ⚙️ Scheduled Task Definition — `ST-XXXX-000`

> Copy to `tasks/<TASK-ID>.md`. Fill every section. Sections marked *(if applicable)* may be
> set to `N/A` with a one-line reason. Everything else must be filled before scheduling.
> Governing spec: `../SPEC.md` (v2).

| Field           | Value |
|-----------------|-------|
| 🏷️ Task ID      | `ST-XXXX-000` |
| 🏷️ Name         | |
| 🧑‍💼 Capacity    | one of `PERS` `HOPE` `VZB` `REPR` `DIGP` `NTE` `HOR` `CCRLT` `MM` `OTHER:<name>` |
| 📆 Defined      | YYYY-MM-DD |
| 🔧 Status       | `DRAFT` / `ACTIVE` / `PAUSED` / `MERGED` / `REPLACED` / `TERMINATED` |
| 🔗 Routine ID   | `trig_…` (fill in after scheduling) |

## 🎯 MISSION

<!-- The outcome this task exists to improve. One paragraph. -->

## 🧑‍💼 CAPACITY

<!-- One capacity only. State why it is this capacity and not an adjacent one. -->

## ⏰ SCHEDULE / TRIGGER

| Field              | Value |
|--------------------|-------|
| Cadence            | |
| Local time         | |
| Timezone           | |
| UTC cron           | |
| Condition          | |
| Start date         | |
| End date           | *(if applicable)* |
| Exception schedule | |

## 📥 INPUTS

- 

## 📁 CANONICAL ARTIFACTS

<!-- SEARCH → READ → REUSE → UPDATE. List the controlling artifacts with locations. -->

| Artifact | Location | Role (read / update / both) |
|----------|----------|-----------------------------|
| | | |

## 🔄 PRIOR-RUN CONTINUITY

<!-- Where the prior run's output lives and how it is retrieved. -->

Each run must report: what changed · what closed · what carried · what failed · what became irrelevant.

## 🌐 WEB RESEARCH MODE

`NONE` / `QUICK VERIFY` / `STANDARD RESEARCH` / `DEEP RESEARCH` — record AS-OF time on each run.

## 🔎 RESEARCH QUESTIONS *(if applicable)*

- **Primary:** 
- **Subquestions:** 
- **Contrary questions:** 
- **Current-development questions:** 
- **Unknowns requiring verification:** 

## 🏛️ SOURCE PRIORITY *(if applicable)*

1. 
2. 
3. 

## ⚔️ RED-TEAM CHECK *(if applicable)*

<!-- What evidence would defeat the expected conclusion, and where to look for it. -->

## 🧠 PROCESS

1. 
2. 
3. 

## 🌳 SCENARIOS *(if applicable)*

| Scenario     | Description |
|--------------|-------------|
| BEST         | |
| BASE         | |
| ALTERNATIVE  | |
| WORST        | |
| TAIL         | |
| UNKNOWN      | |

## 📊 VISUALS REQUIRED

<!-- Named visuals, and the verified data source each one draws from. Never fabricate. -->

## 🖼️ GRAPHICS

<!-- Which images/diagrams/maps/screenshots, or NONE. Only when materially useful. -->

## 📑 OUTPUT ARTIFACT

`bulletin` / `dashboard` / `spreadsheet` / `report` / `presentation` / `interactive artifact` / `tracker` / `chart` / `brief` / `no artifact`

## 🎨 DISPLAY STANDARD

Default per SPEC v2 (emoji-led navigation, mobile-readable, fitting emojis, visuals where they help).
Overrides:

## 🧾 EVIDENCE

Consequential claims are tagged `VERIFIED` · `USER-REPORTED` · `DOCUMENT-STATED` · `SYSTEM-RECORDED` · `INFERRED` · `UNKNOWN`.
Task-specific rules:

## ⚖️ CONTRADICTIONS

<!-- How conflicting evidence is surfaced in this task's output. -->

## 🚨 EXCEPTION CONDITIONS

| Condition | Threshold | Escalation |
|-----------|-----------|------------|
| | | |

## 🛡️ GUARDRAILS

**Prohibited:**
- 

**Requires human approval:**
- 

## 📌 PROOF REQUIRED

<!-- What evidence proves a run executed and completed correctly. -->

## 🔄 STATE UPDATE

<!-- Which ledger / artifact / dashboard / database receives the verified result. -->

## 🤝 HANDOFF

<!-- Which next task or review consumes this output. No orphan tasks. -->

## 📏 SUCCESS METRIC

<!-- The outcome measure, not "task ran." -->

## 🛑 KILL / MERGE RULE

| Action     | Trigger |
|------------|---------|
| MERGED     | |
| REDUCED    | |
| PAUSED     | |
| REPLACED   | |
| TERMINATED | |

## 💡 SCALE CHECK

Review after ___ runs:

- [ ] Can this become an SOP?
- [ ] Can it become a template?
- [ ] Can it become a reusable artifact?
- [ ] Can it become an interactive dashboard?
- [ ] Can it be delegated?
- [ ] Can it be automated further?
- [ ] Should it stop?

## ✅ FINAL OUTPUT

Every run ends with exactly one of:
🎯 DO NOW · ⚖️ DECISION REQUIRED · ⏳ WAITING ON · 🧱 BLOCKED BY · ✅ NO ACTION REQUIRED

---

## 🗒️ Run Log

| Run date (AS-OF) | Final output | Changed / closed / carried / failed / irrelevant | Proof | Notes |
|------------------|--------------|--------------------------------------------------|-------|-------|
| | | | | |
