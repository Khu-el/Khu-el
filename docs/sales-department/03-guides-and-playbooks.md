# III — Guides and Playbooks · items 17–24

🔵 PROPOSED method draft · Claude Code · 2026-10-25. Rules in [README.md](README.md) apply to every item.
These guides compose items from Sections I–II; they do not add new authority.

---

## 17 · High Intent Playbook — *target: 15 demos in 5 days*

The graphic's target is **a marketing claim, not evidence** — treated here as an *example of a
sprint goal*, not a benchmark. The principal sets the real goal and its basis.
**Sequence:** (1) pull accounts with a fresh signal (06) and verified seat (05) → (2) fit-score (10)
→ (3) one personalised draft each (12), principal approves → (4) a same-day follow-up draft keyed
to any reply (44) → (5) discovery plan (13) for each booked call.
**Capacity check:** a demo target is divided by the number of accounts the principal can genuinely
work (08). If the arithmetic does not close, say so rather than lowering quality.
**Output:** a 5-day run sheet with daily counts as `[done] of [planned]`.

## 18 · Outreach Playbook — *three messages, 30 words each*

**Structure:** message 1 (observation + question) → message 2 (a different angle, new fact) →
message 3 (a clean close-the-loop). Each ≤ 30 words, one ask, no attachments.
**Spacing and stop rule:** the principal sets intervals; **a clear "no" or opt-out ends the sequence
and is recorded.** No fourth message "just checking in".
**Guardrail:** every message is a draft for approval (rule 1). Opt-out handling and channel rules are `PROFESSIONAL_REVIEW_REQUIRED` where jurisdiction is unclear.

## 19 · Account Research Guide — *the account research playbook*

**Fields, in order:** what they sell and to whom · size and trajectory (sourced) · recent events
(06) · stated priorities (their own words, dated) · incumbent or alternative · buying group (09) ·
what we do not know. **Time-box** the research (principal sets it); stop at "enough for one good
first message".
**Output:** a one-page brief where every line carries `source → date` or is marked `UNKNOWN`.
**Guardrail:** no private-information gathering. A buyer's financial distress, health, family or legal troubles are not outreach hooks.

## 20 · The Demo Guide — *ten chapters, six buyer types*

**Ten chapters:** goal → agenda agreed → recap their words → the one problem → show the shortest
path to the fix → the proof → objections → alternatives → decision process → next step with a date.
**Six buyer types** (edit to the market): economic buyer · technical evaluator · end user · champion
· procurement · sceptic. For each: what they listen for, what loses them.
**Guardrail:** demo only what exists. Where a capability is planned or unproven, say so on the spot; a roadmap item is never shown as a feature. Pricing promises are the principal's alone.

## 21 · Founder-Led Sales — *sell it before you hire for it*

**Purpose:** make the principal's own selling **repeatable and writable** before any delegation.
**Steps:** run 10 (or the number the principal chooses) real conversations → record, per conversation,
the problem words buyers used, objections, the reason won / lost (22, 25–26) → distil a one-page
**sales memory**: ICP corrections, the best opener, the three objections, the close that worked.
**Output:** the sales memory document and a hire/delegate readiness note.
**Guardrail:** 10 conversations is a small sample. State it as such; do not generalise it into a market claim.

## 22 · Your Own AI SDR — *the full build guide*

**Scope:** how the principal's own research, scoring and drafting work (Sections I–II, V) is
assembled into one governed workflow.
**Hard design rules:** (a) the agent **drafts and ranks; it never sends, books, or posts**; (b)
every send is a human-approved exact payload — see `packages/nvs-agent-desk` (ledger + draft-first
inbox) for the existing implementation and its limits before building another; (c) an agent holds
**no standing credentials** to external accounts; (d) every record the agent writes names its
source and date; (e) it stops and asks when a required input is `UNKNOWN`.
**Output:** a build plan with each connector checked against `docs/CONNECTORS.md` first.
**Guardrail:** this item produces a plan. Wiring a connector, spending on a tool, or granting access is the principal's approval, per action.

## 23 · Sales Evidence and the Capital Narrative — *(reframed from "Sales and Fundraising")*

**Purpose:** record sales traction **honestly**, so that any later, separate decision to describe the
business to a third party rests on evidence.
**What it does:** keeps a dated ledger of actual outcomes — conversations held, proposals made,
deals closed, repeat buyers — each `VERIFIED` (a contract, an invoice, a dated record) or
`USER-REPORTED`. It **does not** draft investor pitches, rank investors, or solicit capital.
**Why the departure:** this repository scopes out turning any tool here into an investor-solicitation
tool. Raising capital, and any securities-law question that comes with it, is
`PROFESSIONAL_REVIEW_REQUIRED` and outside this project.
**Output:** a dated traction ledger, with no forward-looking claims.

## 24 · The 48-Hour Start — *the method, plus 2 skill files*

**Purpose:** go from nothing written to a first approved batch of outreach in 48 hours.
**Hour 0–8:** ICP v1 (01). **8–20:** 25 candidate accounts with evidence (02–03). **20–30:** seats
and verification (04–05). **30–40:** fit-score and rank (10, 07); entry seats (09). **40–46:** drafts
for the top accounts (12), 1 follow-up (44), tracker set up (15, 46). **46–48:** principal reviews
and approves the first batch. Nothing sends before step 48.
**Guardrail:** if evidence for an account cannot be found in the window, it is dropped — not filled in with plausible detail.
