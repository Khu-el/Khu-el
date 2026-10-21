# NVS Agent Desk — design (working title)

**State:** DRAFTED design · LOCALLY_TESTED code (60 tests, `tsc --noEmit` clean) · not saved to any remote, not deployed, nothing published.
**Entity / lane / tenant / owner / confidentiality:** NTE Virtual Solutions · NVS_DELIVERY (assumed, confirm) · none · Chief Ransom · INTERNAL.
Evidence for every upstream claim is in [REVERSE_ENGINEERING.md](REVERSE_ENGINEERING.md).

## Thesis

The ten repos each hand an agent a capability: trade, send mail, drive a browser, spend on video, change an ad account. Their guardrails are mostly **prompts** ("Draft only", "risk first") or **a single shared trust boundary**. NVS's better version keeps the capabilities and moves the guardrails into **code that the model cannot argue with**:

1. **One approval ledger** (`src/core/ledger.ts`). Every consequential step is `propose → human approves the exact payload hash → execute once`, with a hash-chained audit log.
2. **One evidence vocabulary** (`VERIFIED … UNKNOWN`) and **one rule for the unknown**: unmeasured is `NaN`/`null`/`unknown`, never `0` or `pass`.
3. **Declared context on every action**: entity, lane, tenant, source of truth, owner, confidentiality. Executors are bound to lanes; `UNCLASSIFIED` is refused.

## Module map

| Upstream | NVS module | Same as upstream | Better | Deliberately not built |
|---|---|---|---|---|
| AutoHedge, Vibe-Trading (+ Fincept's research role) | `src/research` | Director/Quant/Risk roles; backtests | Risk is code (`riskGate`); evidence must be ≥ `SYSTEM_RECORDED`; stop required; position/daily-loss caps; no-lookahead engine; NaN-not-0 metrics; required annualisation | **Any live broker.** Fincept's terminal (AGPL, native app) |
| claude-ads, toprank/NotFair | `src/audit` | pass/fail/unknown/n.a.; read-only; unscored while unknown | Findings become ledger proposals tagged with lane/tenant; tracking failure makes campaign verdicts `unknown` | Breadth of platforms/checks (use claude-ads for that); any account-write path |
| agentic-inbox | `src/inbox` | draft-only agent; fail-closed injection screen | Per-mailbox, per-role ACL (default deny); send bound to approved hash; new recipients surfaced | Any mail transport (inject one); auto-send |
| context-mode | `src/context` | FTS5/bm25 store; think-in-code | Clean-room (license); honest savings stat; restricted runner with tests for each denial | Cross-platform hook installer; many-language runner |
| camofox-browser | `src/browse` | agent-friendly fetching | Honest UA, robots.txt, rate limit, SSRF/private-IP refusal, no auto-redirect | **Fingerprint spoofing, proxy rotation, cookie borrowing, bot-detection bypass.** Refuses instead of working around |
| Open-Higgsfield-AI | `src/video/genJob.ts` | paid third-party generation | Cost known and capped before running; human approves prompt+price; likeness consent required | The "no content filters" / white-label resale posture |
| HyperFrames | `src/video/lint.ts` | (uses its attribute contract) | Pre-render timeline lint | A renderer. Use upstream |

## How an action flows

```
agent ──propose(kind, context, payload, cost)──▶ ledger  (PROPOSED, hash H)
                                                   │ DRAFT class (reversible, local)  → may execute unattended
                                                   │ CONSEQUENTIAL (send, publish, deploy, spend, credential,
                                                   │   access, prod-data, trade.live, ads.change, external.*)
human ──approve(id, H)──▶ APPROVED (only a listed *human*; an agent is logged as denied)
                                                   ▼
execute(id): not halted · not expired · stored payload still hashes to H · executor exists
             · lane allowed · cost ≤ per-action cap and ≤ daily cap · runs once · failure is final (no retry)
```

Spend caps default to **0**, so nothing that costs money runs until the principal sets a number.

## Lane boundaries (from the principal's standing rules)

- `NVS_DELIVERY` is the only lane any executor is registered for. Registering one for another lane is an explicit code change.
- Nothing here touches Excellence District, CCRLT/House of Ransom, H.O.P.E./Primerica, licensed practice, employer, family or client records. Do not load those into this tool's inputs.
- **Securities.** The research module is paper-only and for NVS's own R&D. Anything that trades, recommends, or manages money for another person needs licensed review and is outside this lane. The H.O.P.E./Primerica and licensed-practice lanes must never share a runtime or data with it.

## Known limits (stated, not hidden)

- **Audit log** is tamper-*evident* inside one SQLite file. Someone who can rewrite the file can rewrite the whole chain. Anchor `ledger.head()` somewhere outside (a signed note, a separate store) to detect truncation.
- **Approver identity** is an id in a list; there is no authentication layer. In a real deployment the approve call must sit behind real auth (SSO/passkey) and the approver list must come from configuration, not code.
- **`runScript`** blocks filesystem writes, child processes and env leakage, **not network**. Not for untrusted code.
- **Injection screen** is regex heuristics. It reduces noise; the human approval on sends is the real control.
- **Browse** checks private IPs on the DNS answer, but the fetch itself uses the platform's resolver; a hardened deployment should pin the resolved IP for the connection.
- **Audit module** ships six checks. It is a wrapper pattern, not a replacement for claude-ads.
- No UI, no persistence beyond SQLite files, no deployment.

## What I did not do (and why)

- No live trading, mail, ad-account or browser-evasion code, because those are the actions the principal reserves approval for.
- No copy of AGPL or ELv2 code.
- No connector calls, secrets, DNS, deployment, spend, or external messages.
- Not pushed anywhere, not added to Khu-el, Neterverse_DAO or Mental-Alchemy.

## Decisions (Chief Ransom, 2026-10-21)

1. Home: new workspace `packages/nvs-agent-desk` in Khu-el (branch `claude/nvs-agent-desk`, uncommitted). Lane NVS_DELIVERY confirmed.
2. Browser evasion: **legal review first.** No evasion code. Brief: [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md).
3. First pilot: ad-export audit + draft change plan, one consenting client, no live account access. CLI: `node bin/audit.ts` (synthetic fixture included).
4. Live trading: **in scope**, behind a gate. See [LIVE_TRADING_GATE.md](LIVE_TRADING_GATE.md). No broker adapter exists until the gate is met and the exact adapter is authorized in writing.

## Roadmap — each phase needs the principal's go-ahead

| Phase | Work | Needs approval for |
|---|---|---|
| 0 (done, local) | Dossier, ledger, six modules, pilot CLI, 63 tests, Khu-el CI gates green | commit / push / PR |
| 1 | Pilot with one consenting client: written authorization, they export CSVs, we deliver report + draft plan | client communication |
| 2 | Approval UI with real auth; persistence config; set caps | access, credentials |
| 3 | Counsel answers (browse + trading); choose trading option A/B/C | counsel engagement |
| 4 | Inbox draft assistant on one NVS-owned mailbox, injected transport | credentials, external send |
| 5 | Video: HyperFrames render + one metered provider under caps | spend, vendor terms |
| 6 | Trading: read-only adapter, then paper-vs-real comparison, then gated live | every item in the gate |

## Rollback

Everything lives in `/home/user/nvs-agent-desk` (new directory, untracked, not a git repo). Delete the directory to remove it. Upstream clones are in the session scratchpad and are ephemeral.
