# V — Signal Agents · items 33–40

🔵 PROPOSED method draft · Claude Code · 2026-10-25. Rules in [README.md](README.md) apply to every item.

## ⚠️ What "agent" means here

Each item is a **specification for a governed, human-reviewed observation routine** — not a running
service. **None of these is scheduled, deployed or live.** All eight share the same design:

- **Inputs:** a watch-list the principal approves (accounts, people, competitors) — a *record*, held in the system of record.
- **Sources:** public pages and public business feeds, read honestly: the site's own robots rules, a
  declared user agent, rate limits, no evasion of access controls. A platform whose terms forbid
  automated collection is **not** collected from by a script — the principal reviews it by hand.
- **Output:** a ranked list of observations, each `signal → source → observed date → decay`, delivered to the principal.
- **It never** contacts anyone, posts, follows, likes, comments or messages. Outreach that follows a
  signal is a draft (12) the principal sends.
- **Recurring = a scheduled task.** To run any of these on a timer, first search
  `docs/scheduled-tasks/REGISTRY.md`, then define it under `docs/scheduled-tasks/SPEC.md`. Until then
  it is run by hand, on request. Browse capability, if built, reuses `packages/nvs-agent-desk` `src/browse`
  (honest UA, robots.txt, rate-limited) rather than a new fetcher.
- **Privacy:** a watch-list of *people* is personal data — keep it minimal, business-context only,
  and `PROFESSIONAL_REVIEW_REQUIRED` for any monitoring beyond public business information.

---

## 33 · Competitor Engagement — *who engages with their posts*
**Observes:** public engagement on a named competitor's own public posts, as a lens on who is
paying attention to the problem. **Output:** accounts/roles appearing, with the public link and date.
**Limit:** engagement is weak evidence (curiosity, a colleague, a competitor). It is `OBSERVED`, never `intent`.

## 34 · Influencer Engagement — *who follows your niche*
**Observes:** public participation around the principal's niche's recognised voices (publicly visible
comments, speaker lists, community rosters). **Output:** candidate accounts and roles with source.
**Limit:** a follower is not a buyer. Do not collect follower lists in bulk.

## 35 · Job Changes — *new seat, new budget*
**Observes:** a public change of role at a watched account or watched contact (from item 05's
verification pass or a public announcement). **Output:** `person → old/new role → source → date`
and the **action it suggests to the principal** (re-map, new entry seat, congratulate if appropriate).
**Limit:** a new seat is a *reason to review* an account, not a promise of budget.

## 36 · Funding Rounds — *fresh money, fresh buying*
**Observes:** publicly announced funding or investment into a **prospect** (its own press release or a reputable report). **Output:** `account → event → source → date → decay`.
**Limit:** this watches **prospects' news as a buying signal** only. It never builds investor lists
and never supports raising capital — see item 23's scope note.

## 37 · Top 5% of ICP — *the most active accounts*
**Observes:** the ICP accounts with the most **recent, sourced, undecayed signals** across 06's
catalogue. **Output:** a ranked top slice and *why* each ranks — the signals themselves.
**Limit:** "top 5%" is relative to the watched list; with a small list it is a handful. State the list size.

## 38 · Content Engagement — *who reads about your problem*
**Observes:** engagement only with **the principal's own** public content where the platform's
analytics expose it to the account owner. **Output:** accounts/roles engaging, aggregated.
**Limit:** use only analytics the platform gives the owner; no de-anonymising visitors by other means.

## 39 · Your Company Page — *who is already looking at you*
**Observes:** the principal's own company-page analytics and inbound enquiries. **Output:** a list of
accounts showing interest, flagged for the principal to review. **Limit:** inbound interest is the
strongest signal here and also the one most tempting to over-read — it earns a human reply draft, not an automated one.

## 40 · Daily Signal Digest — *the morning list, ranked*
**Does:** merges 33–39 and 06 into one ranked list for the principal: the top accounts with a fresh
signal, the verification status of their seat (05), the suggested next action as a **draft** reference.
**Status:** 🔵 PROPOSED. A daily run is a recurring task and **does not exist**. If wanted, define it under
`docs/scheduled-tasks/SPEC.md` after searching its registry; until then, run on request.
**Limit:** the digest informs; it never initiates contact. It reports counts as `[n] of [watch-list size], [as-of]`.
