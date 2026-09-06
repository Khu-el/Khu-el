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
5. `docs/SPEC-CHANGES.md` — every place the build diverged from the spec, and why.
6. `docs/RELEASE-NOTE.md` — what is built, what is empty, and every acceptance
   box with the check that proves it.

## Run it

```
npm install
npm run dev
npm run check            # everything below, in order
npm run check:types
npm run check:lanes      # firewall scan, source
npm run check:network    # zero-external-origin scan, source
npm test                 # 152 checks
npm run build            # ends with check:bundle — the same scan on the output
npm run single           # one-file outputs, for looking without a toolchain
```

## What runs on a pull request

`.github/workflows/command-center.yml` runs types, the lane firewall, the
external-origin scan, the 152 tests, the production build and the bundle scan
on every pull request touching `nte-command-center/**`, and checks that no
generated file drifted during the build.

It exists because the repo's other workflow deploys on push to `main` and never
runs on a pull request. These guarantees are only guarantees if something other
than a person's memory runs them.

## Looking at it without installing anything

`npm run single` (also run as part of `npm run build`) writes three generated
artifacts into `dist/`:

| File | What it is |
|---|---|
| `command-center.html` | The whole console as one self-contained page. No server, no install, no network — open it in a browser. |
| `command-center.jsx` | The whole console as one readable JSX file, types stripped and every seed inlined. React stays external. |
| `command-center.css` | The stylesheet `command-center.jsx` expects beside it. |

All three are **generated from `src/` and `seed/`** by
`scripts/bundle-single.mjs`, and are not committed. Do not edit them — a
hand-written preview of eleven modules is a second implementation, it drifts
from the real one, and someone clicks it and believes what they saw.
Regenerate instead.

The standalone page is the real app, not a demo: the build freeze, the surface
firewall, the storage namespacing and the proof gates all run in it.

## What is built

| # | Module | Surface | State |
|---|---|---|---|
| 01 | Governance & Infrastructure | Enterprise | Built — reference implementation |
| 02 | Ventures & Revenue | Enterprise | Built |
| 03 | Education | Enterprise | Built |
| 04 | Marketing & Content | Enterprise + Practice | Built — dual-hosted, two seeds |
| 05 | Tech Stack | Enterprise | Built — carries the security hold |
| 06 | Practice Desk | Practice | Built |
| 07 | Household & Estate | Household | Built |
| 08 | Operating System | Enterprise + Household | Built — dual-hosted, two seeds |
| 09 | Capability & Services | Enterprise | Built |
| 10 | Compliance & Conditions | Enterprise | Built — proof-gate pattern, plus the changes ledger |
| 11 | Knowledge & Canon | Enterprise | Built |

All eleven are implemented. Modules 01 and 10 arrived built and are the two
shapes the other nine copy: 01 is the register-and-ledger shape, 10 is the
shape where a control stays disabled until proof exists.

## What is empty, and why

Structure is built everywhere. A lot of the content is deliberately absent,
because it is not in this workspace and inventing it would produce something
that reads as real: 51 venture titles, 83 course titles, the desk roster, the
seven recruiting stage labels, 19 standing task rows, 18 file identifiers.
Those render as slots that say "awaiting source" rather than as plausible
values. `docs/RELEASE-NOTE.md` § 2 lists every one.

Sourced counts are asserted rather than transcribed — the class distribution
sums to 51, the course distribution to 83, the deliverable gap to 152 + 96 =
248, the capital tranches to the 28,500 ask.

## Three things this repo will not let you do

- **Ship build work in a week under 40 documented outbound contacts.** The
  freeze is hard-coded with no override.
- **Mix lanes.** Three surfaces, separate storage namespaces, separate
  vocabularies, enforced at render and at build.
- **Let a note outrank its own gate strip.** A record whose note claims "eight
  of nine" while its strip records seven renders the conflict on the row. One
  document in the delivered seed does exactly that.
- **Claim an external event without proof.** `EXECUTED`, `FILED`, `SERVED`,
  `PAID`, `DEPLOYED` and `RELEASED` are not constructible in the type system
  without a proof object.

## Three things it will not let itself do

- **Reach an outside origin.** `check:network` scans the source and
  `check:bundle` scans the built output for request-capable calls. There are
  none, and the page's own CSP sets `connect-src 'none'` behind that.
- **Open quarantined material.** The rows in module 11 carry no control, link,
  embed, `href`, `src`, `download`, `tabindex` or `title` attribute, and the
  seed holds no field that could carry the content.
- **Export a youth record.** Module 07 disables the control and the export
  function throws, so a panel that forgot to disable its button still cannot
  produce a file.
