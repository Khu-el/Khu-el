# Live trading — scope decision and gate

**DRAFT. Not legal or investment advice. Nothing here connects to a broker.** Decision recorded 2026-10-21: live trading is **in scope** for the roadmap. This document says what must be true before any code path may place a real order. Until every box is ticked **and** the principal authorizes the exact adapter in writing, `trade.live` has no executor (enforced by the ledger; see `test/research.test.ts`).

## Whose money, which lane
Decide first, because it changes the legal analysis entirely:
- [ ] **A. NVS's own capital** (a proprietary account NVS owns). Narrowest regulatory surface.
- [ ] **B. The principal's personal account.** Check employer / licensing restrictions below.
- [ ] **C. Anyone else's money or advice** (clients, family, DAO members, pooled funds). This is investment-adviser / broker / fund territory. Do not start without counsel.
If unanswered, ownership stays **undecided (`unknown`)** and the system stays **paper only**; nothing defaults to any option.

## Questions for counsel / compliance (unverified; framing only)
1. Registration triggers for option C: Investment Advisers Act of 1940, broker-dealer registration under the Exchange Act, state IAR rules; for futures/crypto derivatives, CFTC/NFA (CTA/CPO). Does option A or B trigger anything?
2. **Licensing conflicts:** the principal's H.O.P.E./Primerica and other licensed activity. Outside-business-activity and private-securities-transaction disclosure/approval rules (FINRA Rules 3270 and 3280 for associated persons) and firm policy. This lane must stay separate from NVS; confirm in writing before any live account exists.
3. Employer policy and conflict-of-interest rules.
4. Whether an autonomous agent placing orders changes supervision, record-keeping or best-execution duties.
5. Tax and entity structure for the trading account.

## Technical preconditions (all must hold)
- [ ] Written compliance/counsel sign-off referenced by id in the ledger context.
- [ ] Separate runtime, credentials and data store from every other lane (esp. H.O.P.E./Primerica, licensed practice).
- [ ] Broker API key is **trade-scoped with withdrawal disabled**, held in a secrets manager; never in env files or the repo.
- [ ] Read-only adapter first (positions, balances) running ≥ 30 days against the paper results.
- [ ] Paper track record produced by the existing no-lookahead engine, with costs, reviewed by the principal. Backtests are not evidence of future results.
- [ ] Hard limits set in code by the principal: per-order notional, per-day notional, max open risk, symbol allowlist, daily-loss halt. Defaults stay zero.
- [ ] **Every order** is a ledger `trade.live` action approved by the named human on the exact payload hash. No standing approvals, no batch approvals.
- [ ] Kill switch tested: `ledger.halt()` stops the adapter within one cycle; broker-side limits configured independently of our code.
- [ ] Order and approval log retained per counsel's retention advice; audit head hash anchored outside the database.
- [ ] A second reviewer confirms the adapter diff before first use.

## Not permitted at any stage
Leverage or options before a separate review; trading on others' behalf; marketing any returns; connecting an LLM directly to the broker credential; any "token" or "memecoin" tied to a strategy (Vibe-Trading's own README warns of impostor tokens).

## Next action (needs principal)
Choose A/B/C, name counsel, and approve the read-only adapter scope. No adapter is written before then.
