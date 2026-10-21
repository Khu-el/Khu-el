# NVS Agent Desk (working title)

NTE Virtual Solutions · NVS commercial delivery lane · INTERNAL · **draft, locally tested, not deployed**

A governed agent toolkit: the useful parts of ten popular agent repos, with the guardrails moved from prompts into code.

- **Start here:** [docs/REVERSE_ENGINEERING.md](docs/REVERSE_ENGINEERING.md) (what each upstream repo really does, with evidence) and [docs/DESIGN.md](docs/DESIGN.md) (what this version changes, its limits, and the roadmap).
- Zero runtime dependencies. Node ≥ 22.18 (uses `node:sqlite` and native TypeScript stripping).

```bash
# from the Khu-el repo root: npm install
npm test --workspace=packages/nvs-agent-desk   # 63 tests, node:test
npm run typecheck                               # root sweep includes this package
node bin/audit.ts fixtures/synthetic-google-ads.csv --platform "Google Ads" --start 2026-09-01 --end 2026-09-30 --currency '$'
```

| Module | Path | Does |
|---|---|---|
| Ledger | `src/core` | propose → human approves exact hash → execute once; caps; halt; hash-chained audit |
| Research | `src/research` | no-lookahead backtester, NaN-safe metrics, deterministic risk gate, **paper** broker only |
| Audit | `src/audit` | ad-export checks (pass/fail/unknown/n.a.), unscored while unknown, drafts as ledger proposals |
| Context | `src/context` | FTS5/bm25 store + restricted think-in-code runner (clean-room) |
| Inbox | `src/inbox` | per-mailbox ACL, injection pre-screen, draft-first, send bound to approved payload |
| Browse | `src/browse` | honest-UA, robots.txt, rate-limited, SSRF-safe fetch. No evasion |
| Video | `src/video` | timeline lint; metered generation as a capped, approved spend action |

## Rules that hold in every module

1. An agent never approves anything. A consequential action runs only after a named human approves the exact payload hash.
2. Spend caps default to zero.
3. Unmeasured is `NaN` / `null` / `unknown`. Never `0`, never `pass`.
4. No live trading, no ad-account writes, no bot-detection evasion, no auto-send exist in this codebase. Adding one requires the principal's explicit written authorization for that exact action.
5. Upstream licences: nothing from AGPL (Fincept) or ELv2 (context-mode) is copied.

Not financial, legal or investment advice. The research module is for NVS's own R&D on paper.
