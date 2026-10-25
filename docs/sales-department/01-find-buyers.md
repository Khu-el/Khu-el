# I — Find Buyers · items 01–08

🔵 PROPOSED method draft · Claude Code · 2026-10-25. Rules in [README.md](README.md) apply to every item.

---

## 01 · ICP Builder — *a paragraph in, accounts out*

**Use when:** the capacity has no written Ideal Customer Profile, or the current one is vibes.
**Inputs the principal supplies:** what is sold, to whom it has already sold (real, producible), the
problem it removes, what it costs the buyer *not* to fix it. Anything not supplied is `UNKNOWN`.
**Steps**
1. Turn the paragraph into **testable criteria**: firmographic (size, sector, geography), situational
   (an event that makes the problem urgent), and disqualifiers.
2. Mark each criterion `STATED` (principal said it), `OBSERVED` (seen in a real past buyer), or
   `HYPOTHESIS` (reasoned). Only `OBSERVED` may carry weight in item 10.
3. Output a one-page ICP and a **search spec** for item 02: the criteria as queries, not names.
**Output:** `ICP v[n]` with date, criteria table, disqualifiers, open questions.
**Guardrail:** no ICP is built from a market-size guess. A segment with no observed buyer is a hypothesis to test, labelled as such.

## 02 · Account Search — *companies like your best ones*

**Inputs:** ICP search spec (01), 3–10 best existing customers *held in the capacity's record system*.
**Steps:** derive the shared traits of the best customers → search public business sources for
organisations with those traits → return a **candidate list with the evidence for each trait** and
the source URL and date.
**Output:** candidate accounts, each with `trait → evidence → source → date → status`.
**Guardrail:** candidates are not leads until item 10 scores them. A trait inferred from a company's own marketing is `DOCUMENT-STATED`, not verified.

## 03 · Buyer Lookalike — *who bought from firms like yours*

**Use when:** the principal's firm is small and its own buyer list is thin.
**Steps:** identify firms comparable to the principal's (same offer shape, same buyer type) → find
**publicly stated** customers of those firms (case studies, press, partner pages) → treat each as a
lookalike *hypothesis* → run through 01's criteria.
**Output:** lookalike accounts with "why they resemble a buyer" and the public source.
**Guardrail:** a competitor's customer is a public fact, not a target to be approached by quoting the competitor's confidential terms. Do not infer private contract detail. If the source is a customer testimonial, quote none of it without attribution.

## 04 · Contact Finder — *the right seat inside the account*

**Steps:** from the account, name the **buying roles** (economic buyer, champion, user, blocker,
gatekeeper) → for each, list the **job titles** likely to hold it → locate the public, business-context
listing of the person who holds that seat (company site, public professional profile, press).
**Output:** role → title → named holder *only if publicly stated* → source → date.
**Guardrails:** business role information only. No personal addresses, personal numbers, family or
home detail. No purchased or scraped lists without a lawful basis — a channel or jurisdiction
question is `PROFESSIONAL_REVIEW_REQUIRED`. Output is a **record**: it goes to the capacity's system
of record, never into this repository or the shared method.

## 05 · Contact Verification — *checks they still hold the job*

**Steps:** for each contact (04), re-read a current public source → compare title, company and
start date → assign `VERIFIED [date, source]`, `STALE` (source older than the freshness window the
principal sets), `CHANGED` (new role found), or `UNKNOWN` (source unreadable).
**Output:** a status per contact with the dated source.
**Guardrail:** unreadable or undated is `UNKNOWN`, never `VERIFIED`. A job-change finding feeds item 35 and re-routes the account, it is not sent to the person.

## 06 · Intent Signals — *hiring, funding, job changes*

**Definition:** an observable, public event that raises the odds the problem is live now.
**Catalogue** (each with a source type and a decay time): hiring for the function you serve · new
funding · new executive in the seat · new product or market launch · regulatory deadline · public
complaint about the incumbent · expansion or contraction notices.
**Steps:** attach signals to accounts with `signal → source → observed date → decay`. A signal past
its decay is dropped from scoring, not left to look fresh.
**Output:** signal log per account (template in item 47).
**Guardrail:** a signal raises priority, not certainty. Never write "they are ready to buy"; write "signal observed, [date], [source]".

## 07 · Lead Scoring — *ranked by relevance and fit*

**Formula (principal edits the weights):** `priority = fit × timing`, where **fit** is item 10 and
**timing** is the decayed signal set from 06. Show both axes, not one blended number.
**Rules:** an unanswered criterion makes that axis **unscored**, displayed `—`; it is never `0` and
never averaged away. Tie-break by the account's reachability (is a verified seat holder known, 05).
**Output:** a ranked list with the two axes, the reasoning line per account, and the unscored ones
listed separately with what is missing.
**Guardrail:** a score is a prioritisation aid, not a prediction of closing. No conversion probability unless the principal supplies a historical basis.

## 08 · Territory Planner — *the guide, plus 5 skill files*

**Use when:** several accounts, one person's weeks. **Steps:** group scored accounts by segment or
geography → set a **weekly capacity** (accounts worked, not accounts held) → assign each account
a cadence tier (work now / nurture / park) → name the trigger that promotes a parked account
(a fresh signal, a verified new contact).
**Output:** a weekly territory plan: top accounts, parked accounts and their wake-up triggers.
**Guardrail:** the plan sizes to the principal's real hours. No plan that assumes unlimited capacity.
