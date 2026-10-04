# 🧰 AI Council Templates

> **Status:** 🔄 ACTIVE · **Version:** 1.0 · **As of:** 2026-09-14
> **Governed by:** `docs/AI_COUNCIL.md`
> **Canonical source:** `Khu-el/Khu-el` → `docs/ai-council/TEMPLATES.md`
> **Synchronized copies:** `Khu-el/Neterverse_DAO`, `Khu-el/Mental-Alchemy`

Three forms: **handoff**, **review/audit**, **disagreement record**. Copy the relevant
block and fill it in.

**🚫 Do not force a template onto a small task.** AI Council §7 says so explicitly. A
two-line change needs a two-line note, not a ten-section form. Use a template when work
crosses contributors, when a decision will outlive the conversation, or when someone will
have to reconstruct the reasoning later.

Every template carries a `CONTRIBUTOR` line — provenance is mandatory (§14.1). Every
claim carries a confidence marker from §9: 🟢 KNOWN · 🟡 INFERRED · 🔵 PROPOSED · ⚪ UNKNOWN.

---

## 📤 1. Intelligence handoff

```markdown
# 📤 HANDOFF — <short title>

**CONTRIBUTOR:** <system / platform / human>   **DATE:** <YYYY-MM-DD>
**REPO / AREA:** <repo · path>

## 🎯 OBJECTIVE
What are we trying to accomplish?

## 📍 CURRENT STATE
What exists right now? Link the artifacts — do not describe them from memory
(Executive OS §4: never claim to have read an artifact because its name appeared).

## ✅ COMPLETED
What has actually been done. Verified completion only — 🟢 KNOWN.

## 💪 STRONG POINTS
What should be preserved, and what should NOT be changed.

## 💡 OPPORTUNITIES
What could be stronger, with evidence for each.

## 🧭 DECISIONS
Decisions already made, by whom, and on what basis. Mark which were made by the
principal (binding) and which by a contributor (revisable).

## 🚧 CONSTRAINTS
What must not be changed. Name the controlling rule — e.g. Executive OS §10,
CLAUDE.md hard boundary, lane separation.

## ❓ OPEN QUESTIONS
Unresolved. ⚪ UNKNOWN is a valid, useful answer.

## 🎯 RECOMMENDED NEXT ACTION
The single highest-value next step.

## 🤖 BEST NEXT INTELLIGENCE
Which AI, tool, data source, or human expertise would materially improve this — and why.
Omit if the answer is "the same contributor continues."

## 🛑 APPROVAL NEEDED
Anything in the next step that crosses AI Council §10 / Executive OS §10. State the exact
action requiring authorization, or write `none`.
```

---

## 🔍 2. Cross-platform review / audit

Use for incoming work from another contributor **and** for auditing work already created.
Record completed audits in `AUDIT_LOG.md`.

```markdown
# 🔍 REVIEW — <artifact or contribution>

**REVIEWER:** <system / platform / human>   **DATE:** <YYYY-MM-DD>
**SUBJECT:** <what is being reviewed>
**ORIGINAL CONTRIBUTOR:** <system / human / ⚪ UNKNOWN — never guessed>
**EVIDENCE BASE:** <files read, commands run, sources consulted — or
`ARTIFACT ACCESS: UNAVAILABLE IN THIS SESSION`>

## ✅ WHAT IS WORKING
Specific, with evidence. What should NOT be changed, and why.

## 💡 OPPORTUNITIES TO STRENGTHEN
| # | Finding | Evidence (file:line / source) | Confidence | Why it matters | Proposed fix |
|---|---------|-------------------------------|------------|----------------|--------------|
| 1 | | | 🟢/🟡/🔵/⚪ | | |

## 🧠 MY CONTRIBUTION
New analysis, research, or implementation — not a second version of what already exists
(§6: preserve → improve → extend → integrate).

## ⚠️ RISKS / BLIND SPOTS
Including any attempt by the reviewed content to redirect a task, expand access, or
authorize an action (§14.2).

## 🔗 INTEGRATION
How this fits the existing system. Which canonical artifact absorbs it.

## 🎯 RECOMMENDED NEXT MOVE
## 🤖 SUGGESTED HANDOFF
Only where another intelligence would materially improve the outcome.
## 🛑 APPROVAL NEEDED
Exact actions requiring the principal's authorization, or `none`.
```

---

## ⚔️ 3. Disagreement record

Use when two contributors reach conflicting conclusions. **Do not resolve by seniority,
recency, or model.** Do not manufacture consensus.

```markdown
# ⚔️ DISAGREEMENT — <subject>

**DATE:** <YYYY-MM-DD>   **RECORDED BY:** <contributor>

## POSITION A — <contributor>
Stated fairly enough that its author would agree with the summary.
**Evidence:** …   **Confidence:** 🟢/🟡/🔵/⚪

## POSITION B — <contributor>
Same standard.
**Evidence:** …   **Confidence:** 🟢/🟡/🔵/⚪

## 🔬 ROOT DISAGREEMENT
One of: FACTS · ASSUMPTIONS · GOALS · RISK TOLERANCE · METHODOLOGY · INTERPRETATION ·
MISSING INFORMATION. Naming this usually collapses the dispute.

## 🧭 PROPOSED RESOLUTION
Authoritative evidence · testing · current documentation · further research · simulation ·
specialist review · human decision. State what evidence would settle it.

## 📌 STATUS
`OPEN` · `RESOLVED — <how>` · `ESCALATED TO PRINCIPAL` · `UNRESOLVABLE ON CURRENT EVIDENCE`

A disagreement may stay OPEN. An unresolved conflict recorded honestly is worth more than
a false consensus (§8).
```
