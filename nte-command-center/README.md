# Command Center

A private, local-first command center covering every section of the operating
portfolio. Eleven modules across three firewalled surfaces.

Document code: `NTE-TECH-2026-CCENTER-001` · Status: DRAFT · No event ID
assigned · 9-Point Release Gate not run.

## Start here

1. `CLAUDE.md` — standing rules. Read before writing any code.
2. `docs/ARCHITECTURE.md` — the three surfaces and the module contract.
3. `docs/MODULE-SPECS.md` — one spec per section, with acceptance criteria.
4. `docs/BUILD-ORDER.md` — the sequenced prompts to run in Claude Code.

## Run it

```
npm install
npm run dev
npm run check:lanes      # firewall scan
npm run check:network    # zero-external-origin scan
```

## What is built

| # | Module | Surface | State |
|---|---|---|---|
| 01 | Governance & Infrastructure | Enterprise | Built — reference implementation |
| 02 | Ventures & Revenue | Enterprise | Spec + stub |
| 03 | Education | Enterprise | Spec + stub |
| 04 | Marketing & Content | Enterprise + Practice | Spec + stub |
| 05 | Tech Stack | Enterprise | Spec + stub |
| 06 | Practice Desk | Practice | Spec + stub |
| 07 | Household & Estate | Household | Spec + stub |
| 08 | Operating System | Enterprise + Household | Spec + stub |
| 09 | Capability & Services | Enterprise | Spec + stub |
| 10 | Compliance & Conditions | Enterprise | Built — proof-gate pattern |
| 11 | Knowledge & Canon | Enterprise | Spec + stub |

Two modules are built rather than eleven because they are the two shapes
everything else copies: module 01 is the register-and-ledger shape, module 10
is the shape where a control stays disabled until proof exists. Build the rest
from those, in the order in `docs/BUILD-ORDER.md`.

## Three things this repo will not let you do

- **Ship build work in a week under 40 documented outbound contacts.** The
  freeze is hard-coded with no override.
- **Mix lanes.** Three surfaces, separate storage namespaces, separate
  vocabularies, enforced at render and at build.
- **Claim an external event without proof.** `EXECUTED`, `FILED`, `SERVED`,
  `PAID`, `DEPLOYED` and `RELEASED` are not constructible in the type system
  without a proof object.
