# CLAUDE.md — NTE Command Center

Standing instructions for Claude Code working in this repository. Read this
before writing any code. These rules are not stylistic preferences; several of
them are structural and a build that breaks them has to be thrown away.

Document code: `NTE-TECH-2026-CCENTER-001`
Status: DRAFT — no Event ID assigned, 9-Point Release Gate not run.

---

## 1. What this repository is

A private, local-first command center covering every section of the operating
portfolio. It is a **read-and-enforce surface**. It is not a database of record.

The record of record lives elsewhere and keeps its assignment:

| Domain | System of record |
|---|---|
| Tasks, phases, build queues | ClickUp |
| Registers, catalogs, knowledge base | Notion |
| Documents, canon, seals | Google Drive |
| Scheduling | Google Calendar |
| Correspondence | Gmail |

This console reads those, mirrors them into local state, and enforces gates on
top of them. When the console and the system of record disagree, **the system of
record governs and the console is corrected** — never the other way round.

## 2. The firewall — THREE surfaces, not eleven

The request that produced this repo asked for one app per portfolio section.
That is refused at the architecture level and the reason is structural, not
aesthetic:

- **Lane A and Lane B may never share an instrument.** A single app rendering
  both is a single instrument. This is the same rule that produced two consoles
  in `NTE-CTRL-2026-SURFACE-DET-001`, not fifteen.
- **The licensed practice is separately firewalled.** It carries no NTE trade
  dress, no NTE seal, no NTE document codes, and no governance vocabulary.
- Eleven surfaces would also breach the LIFEOPS one-source-of-truth rule and
  reproduce the build-to-revenue inversion the Build Freeze Rule exists to stop.

So: **three deployable surfaces, eleven modules.** Each portfolio section is a
module. Each module declares which surface may host it. `laneGuard()` enforces
it at runtime and `npm run check:lanes` enforces it at build time.

```
surfaces/lane-a       NTE enterprise           navy + gold
surfaces/lane-b       House of Ransom / CCRLT  warm ink + brass
surfaces/practice     Licensed practice / AGS  light slate + teal, zero NTE marks
```

A module NEVER imports from another surface's directory. A Lane B module never
imports a Lane A seed file. If you find yourself wanting to, the answer is a
shared type in `src/core`, not a cross-import.

## 3. Vocabulary that must not appear on the practice surface

`laneGuard` blocks these strings from any component rendered under
`surfaces/practice`. Do not work around it:

NTE · Neterverse · lane · CCRLT · EDM · trustee · ministry · Private
Administrator · Sui Generis · PMA · Event ID · Release Gate · House of Ransom ·
GodMode · Lane A · Lane B

Conversely, `Primerica` must not appear in Lane A or Lane B surfaces. Use
"the licensed practice."

## 4. The Build Freeze Rule

Hard-coded, not a setting. `src/core/build-freeze.ts`.

> No build work in any week that missed 40 documented outbound contacts.

The Lane A surface opens with the contact meter. Below 40, the modules flagged
`buildWork: true` render locked with a freeze stamp. Selling, signatures,
conditions precedent, and register review stay open at all counts — those are
never build work. **Do not add a bypass, an override flag, or a dev-mode
escape.** A gate with a bypass is not a gate.

## 5. Evidence boundary

Carried in from the migration corpus and it applies to code:

> Authoring an artifact never proves execution, signature, filing, service,
> payment, deployment, licensing, or outcome.

Practically: the console may display `status: BUILT` for a document. It may
never display `EXECUTED`, `FILED`, `SERVED`, `PAID`, or `RELEASED` unless the
record carries a `proof` object with a source reference. `src/core/types.ts`
makes `proof` mandatory on those statuses at the type level. Do not relax it.

Never seed a status you cannot source. Seed `UNKNOWN`. An honest empty state is
correct; an invented one is a defect.

## 6. Document control on every record

Every register row carries: `docCode`, `revision`, `status`, `eventId | null`,
`gate` (9 booleans), `lane`, `updated`. The `DocHeader` component renders these
as the standard strip. A record without a `docCode` does not enter a register.

Status vocabulary — use exactly these, no synonyms:
`PLANNED` · `SPECIFIED` · `DRAFT` · `PARTIAL` · `BUILT` · `CONDITIONAL` ·
`RELEASED` · `SUPERSEDED` · `EXCLUDED` · `UNKNOWN`

## 7. Runtime constraints

- **Zero external network requests at runtime.** No CDN fonts, no analytics, no
  telemetry, no remote images. System font stacks only.
- `<meta name="robots" content="noindex, nofollow">` on every surface.
- Persistence is `localStorage` with an in-memory fallback (`src/core/storage.ts`).
  Never write portfolio content to a remote store from this app.
- Installable to iOS home screen. Native iOS is out of scope — it needs Xcode
  and a paid developer account, which this environment cannot produce.
- Ship offline. If a connector integration is added later it goes behind an
  explicit user action, never on load.

## 8. Build commands

```
npm install
npm run dev            # all three surfaces, route-switched
npm run build
npm run check:lanes    # firewall scan — must pass before commit
npm run check:types
```

## 9. How to work through this repo

Follow `docs/BUILD-ORDER.md` in order. It is sequenced so the enforcement layer
exists before any module can bypass it. Module 01 (Governance) is already built
as the reference implementation — copy its shape, do not invent a second shape.

Every module must satisfy `docs/MODULE-SPECS.md` § for that module, including
its acceptance criteria, before it is considered done.

## 10. What not to build

Do not build, in any module, in any framing:

- Anything on the Excluded Register X-01..X-12 (see `seed/exclusions.json`) —
  private bond issuance, at-par/CUSIP/DTC, private court services to third
  parties, ecclesiastical postal instruments as a service, DAO/tokenized trust,
  third-party trust drafting, income rebuttal toolkits, accurate-inquiry
  removal, UCC filings as credit manufacturing, family credit pooling, business
  credit absorbing personal debt, the cash-value insurance loop, BVM.
- Any calculator, generator, or template that produces a filing, a demand, a
  notice, or an instrument for a third party. This console tracks work; it does
  not manufacture legal instruments.
- Any surface that styles an individual as trustee or executor. Capacity is
  controlled by `NTE-GOV-2026-SCHED-001`; the console displays capacity, it does
  not assign it.
- A credential store. If you find plaintext credentials in any imported data,
  stop, do not commit, and flag it. There is an open SECURITY HOLD on this
  point.
