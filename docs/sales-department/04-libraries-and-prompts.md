# IV — Skill Libraries and Prompts · items 25–32

🔵 PROPOSED method draft · Claude Code · 2026-10-25. Rules in [README.md](README.md) apply to every item.
Libraries are **structures to be filled from the principal's real conversations**, not pre-written scripts to read at a buyer.

---

## 25 · Discovery Questions — *what to ask, and in what order*

**Order:** situation (what is happening now) → problem (what is not working) → impact (what it costs,
in the buyer's own units) → alternatives (what they tried) → decision (who, how, by when) → fit
(what a good outcome looks like). **Bank:** 3–5 questions per stage, in `[BRACKETS]` for the
offer. Prefer "how" and "what" over "why" (which sounds accusatory). One question at a time.
**Rule:** never ask something already answered in public research (19); say what you read, then ask what the page cannot tell you.

## 26 · Objection Handling — *the answers that actually land*

**Method per objection:** (1) acknowledge in the buyer's own words, (2) **find the real concern**
with one question, (3) answer **only** what is true and demonstrable, (4) check it landed, (5) if
no answer exists, say so and record it as a product/offer finding.
**Standard set to fill in:** price · timing · incumbent · authority · risk · "send me something".
**Guardrail:** no pressure tactics, no invented scarcity or deadlines, no disparagement of named competitors, no claim without a source the principal can produce.

## 27 · Proposals and Pricing — *anatomy and red flags*

**Anatomy:** the buyer's problem in their words → the agreed outcome → scope (in and out) →
deliverables and dates → price and terms → what we need from them → next step and validity.
**Red flags in a draft:** any scope not discussed on a call · a price with no stated basis · an
outcome stated as a guarantee · terms the principal has not set.
**Guardrails:** price, discounts, terms and contract language are **the principal's and, where
binding, a lawyer's** — `PROFESSIONAL_REVIEW_REQUIRED`. This item produces a draft **structure**; it never issues, signs or sends a proposal.

## 28 · Negotiation — *terms, trades and walk-aways*

**Preparation:** the principal sets, in advance and in writing, the **walk-away**, the tradeable
items (term, scope, payment schedule) and the non-tradeable ones. **Rule:** every concession is a
trade ("if X, then Y"), never a gift. Record each concession.
**Guardrail:** the assistant never makes or accepts a concession. It prepares positions; the principal decides.

## 29 · Demo Scripts — *three minutes on their problem*

**Frame:** 20 seconds on their problem (their words) → 2 minutes showing the shortest path to the
fix → 20 seconds on the proof → one question that moves toward a next step. Written per buyer type
(item 20). **Rule:** if the capability is not real today, cut it from the script.

## 30 · Pipeline Hygiene — *sourcing and screening rubric*

**Rubric before a record may enter the pipeline:** a verified or sourced seat (05) · one dated
signal or referral · a fit score with the unanswered count shown (10) · a stated next action with
a date. **A record failing the rubric is held in a "needs evidence" list**, not the pipeline.
**Periodic hygiene (principal sets cadence):** close or park anything past its review age; merge
duplicates; remove contacts who opted out; flag records with no evidence date.

## 31 · Prompt Library — *generate, adapt and review*

*(Replaces "250 Prompts"; organised by pattern so it grows without a quoted count.)*
**Patterns, each a short fill-in prompt saved with its purpose and last-reviewed date:**
`ICP-from-paragraph` · `lookalike-from-customers` · `seat-finder` · `verify-contact` ·
`signal-classifier` · `fit-score` · `account-brief` · `outreach-draft-x2` · `followup-by-reply-type` ·
`discovery-plan` · `call-teardown` · `objection-answer` · `proposal-skeleton-review` ·
`weekly-report`.
**Prompt contract (every prompt carries it):** *inputs* it needs · *sources it may use* · *what it must
mark UNKNOWN* · *what it must not do* (send, invent, name an entity) · *output shape*.
**Review rule:** a prompt that produced an unsourced claim is revised, not reused.

## 32 · Pipeline-Run Prompts — *the set that runs your pipeline*

*(Replaces "50 Prompts"; a subset of 31 in the order a weekly run uses them.)*
**Run order:** `weekly-report` inputs → `verify-contact` on the active set → `signal-classifier`
over new events → `fit-score` for new accounts → `followup-by-reply-type` for replies → stalled-deal
list → the principal's decision list. Each step outputs to the tracker (15) and ends at "draft for
approval", never "sent".
