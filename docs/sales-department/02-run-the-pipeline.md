# II — Run the Pipeline · items 09–16

🔵 PROPOSED method draft · Claude Code · 2026-10-25. Rules in [README.md](README.md) apply to every item.

---

## 09 · Account Mapping — *decides who goes first*

**Steps:** for each ranked account (07), draw the buying group: roles (04), the relationship
between them where publicly known, and the **entry seat** — the one person to approach first and why.
**Output:** one account map per top-N account: entry seat, backup seat, the single reason to reach out now (a signal from 06), and what is `UNKNOWN`.
**Guardrail:** an org chart assembled from guesses is labelled `INFERRED`. Do not present an inferred reporting line as fact.

## 10 · Fit Scoring — *scores the fit before you write*

**Steps:** score the account against the ICP (01) criteria. Each criterion is `MET [evidence]`,
`NOT MET [evidence]`, or `UNKNOWN`. Compute fit **only from criteria with evidence**; show how many
criteria are unanswered.
**Output:** fit score as `met / answered`, plus `answered / total`, plus the disqualifier check.
**Guardrail:** any hard disqualifier ends the exercise. An account with most criteria `UNKNOWN` is *not scored*, it is sent back to item 02/05 for evidence. Never write a copy line before fit is scored.

## 11 · Warm-Path Mapping — *finds who can introduce you*

**Steps:** list the principal's **own, real** relationships (supplied by the principal — never mined
from private mailboxes without instruction) → find the shortest path to the entry seat (shared
board, community, client, partner, event) → rank paths by **strength and consent**: a relationship
that would be spent on a cold ask is flagged.
**Output:** path → connector → why they would plausibly help → draft ask **to the principal**, for them to decide whether to make it.
**Guardrail:** never contact a connector on the principal's behalf. An introduction request is the principal's relationship to spend. Do not enumerate private contacts into a shared file.

## 12 · Personalized Outreach — *one real thing per buyer*

**Rule:** one **verifiable, public, relevant** observation about the buyer, then one question or
offer. No flattery, no manufactured familiarity.
**Steps:** pick the strongest signal (06) → write ≤ 4 sentences: the observation (with its source
held by the principal), the bridge to the problem, one low-effort ask → give two variants.
**Output:** two drafts + the source for the personalised line + the channel recommendation.
**Guardrails:** DRAFT ONLY — the principal sends. The personalised line must be traceable; if it cannot be sourced it is cut. Channel permissibility (email vs. call vs. SMS, jurisdiction) is `PROFESSIONAL_REVIEW_REQUIRED` if unclear. No deceptive subject lines, no fake reply threads, no implied prior relationship.

## 13 · Discovery Planner — *the questions before the call*

**Steps:** from the account map (09) and signals (06), write: the **hypothesis** to test, 6–8
open questions in a sensible order (situation → problem → impact → alternatives → decision
process → timeline), the **disqualifying answers**, and the one commitment to ask for at the end.
**Output:** a one-page call plan.
**Guardrail:** discovery tests a hypothesis; it is not a pitch. Questions must not invent facts about the buyer's situation.

## 14 · Call Teardown — *reads the call like a coach*

**Inputs:** a transcript or notes the principal provides, for a call they were party to and where
recording/notes were lawful (consent rules vary — `PROFESSIONAL_REVIEW_REQUIRED` if unsure).
**Steps:** separate **what the buyer said** (quote) from **what we concluded** (inference) →
extract pain, impact, process, objections, commitments → rate each discovery question answered /
unanswered → list three coaching points on the principal's own technique.
**Output:** a teardown that labels each takeaway `STATED` or `INFERRED`.
**Guardrail:** do not attribute a position to the buyer that is not in the record. Store transcripts in the system of record, not the repo.

## 15 · CRM Tracking — *moves replies down the pipeline*

**Stages (editable):** Identified → Contacted → Replied → Discovery held → Proposal → Negotiation →
Closed-won / Closed-lost / Parked. **Each stage change names its evidence** (the reply, the held call).
**Rules:** a stage advances on **buyer action**, not our optimism. No record sits in a stage
beyond its review age without a decision: advance, park, or close.
**Output:** a stage-change log and a stale-record list.
**Guardrail:** records live in the **system of record the principal designates** (⚪ UNKNOWN until named). `apps/financial-services-crm` is a different capacity's tool and holds no sales-pipeline records for this method; a pipeline record is not copied into it.

## 16 · Weekly Pipeline Report — *who moved and who went cold*

**Steps:** from the tracker (15) report, per week: moved forward · stalled past review age · went
cold · new · closed. Name the **next action** per stalled deal and the single decision needed from
the principal.
**Output:** a one-page report. Any number is shown as `[count] of [population], [as-of date]`.
**Guardrail:** VISUAL OMITTED — VERIFIED DATA INSUFFICIENT where the history is too short for a trend. No forecast revenue unless the principal supplies the deal values and a stated basis; then it is a scenario.
