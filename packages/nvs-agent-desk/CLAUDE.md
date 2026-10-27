# CLAUDE.md — nvs-agent-desk

NTE Virtual Solutions, NVS commercial-delivery lane. Read `docs/DESIGN.md` first; upstream evidence is in `docs/REVERSE_ENGINEERING.md`.

## Commands
```bash
npm test            # node --test, native TS stripping (no flags needed on Node >= 22.18)
npm run typecheck   # tsc --noEmit; tsconfig has erasableSyntaxOnly
```
Strip-only TypeScript: no `enum`, no parameter properties (`constructor(private x)`), no `namespace`. Use plain fields.

## Hard boundaries — do not cross without the principal's explicit instruction for that exact action
- No live trading adapter, ad-account write, mail transport, browser fingerprint/proxy evasion, or auto-send. The ledger classes these CONSEQUENTIAL and none has an executor; keep it that way.
- Agents never approve. Do not weaken `Ledger.approve`, the payload-hash binding, the lane check, the caps, or the audit chain; each has a test that must keep failing if it is removed.
- Spend caps default to 0.
- Do not copy code from AGPL/ELv2 upstreams (Fincept, context-mode). Clean-room only.
- Do not load Excellence District, private-estate, H.O.P.E./Primerica, licensed-practice, employer, or client records into this tool. Client work needs a declared tenant and written authorization. Estate records live in a separate private repository.
- Unknown stays unknown: `NaN`/`null`/`'unknown'`, never `0` or `pass`. Do not add a score that hides an unknown.
- Report delivery state truthfully: proposed / drafted / saved / locally tested / deployed / live-verified.

## Adding a module
Put the consequential step behind `ledger.propose` with a `kind` (prefixes in `core/types.ts` are always CONSEQUENTIAL), declare the executor's lanes, and add a test proving it does not run unapproved and does not run twice.
