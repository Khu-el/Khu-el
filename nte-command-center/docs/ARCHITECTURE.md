# Architecture

## The three surfaces

```
                        ┌─────────────────────────┐
                        │   src/core   (shared)   │
                        │  types · lane-guard ·   │
                        │  build-freeze · storage │
                        │  · registry · gate      │
                        └───────────┬─────────────┘
                                    │  types only, never data
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐        ┌─────────▼────────┐        ┌─────────▼────────┐
│  SURFACE: A    │        │   SURFACE: B     │        │ SURFACE: PRACTICE│
│  NTE Enterprise│        │  House of Ransom │        │ Licensed practice│
│  navy + gold   │        │  warm ink + brass│        │ slate + teal     │
├────────────────┤        ├──────────────────┤        ├──────────────────┤
│ 01 Governance  │        │ 07 Family Office │        │ 06 Practice Desk │
│ 02 Ventures    │        │ 08 LIFEOPS (B)   │        │ 04 Marketing*    │
│ 03 Education   │        │                  │        │                  │
│ 04 Marketing*  │        │                  │        │                  │
│ 05 Tech Stack  │        │                  │        │                  │
│ 08 LIFEOPS (A) │        │                  │        │                  │
│ 09 Capability  │        │                  │        │                  │
│ 10 Compliance  │        │                  │        │                  │
│ 11 Knowledge   │        │                  │        │                  │
└────────────────┘        └──────────────────┘        └──────────────────┘

* Module 04 is dual-hosted with SEPARATE seed files and separate copy.
  Its Lane A instance covers Neterverse Publishing and the Opportunity
  Architect imprint. Its practice instance covers the financial education
  blog and Agent Growth Series. They share code, never data.
```

There is no combined surface and no "admin" surface that sees all three. That
is the firewall. A person switches surfaces the way they switch capacity —
deliberately, one at a time.

## Module contract

Every module is a directory under `src/modules/<slug>/` exporting a default
object typed `ModuleDefinition`:

```ts
export default {
  id: 'gov-infrastructure',
  ordinal: '01',
  title: 'Governance & Infrastructure',
  eyebrow: 'Control layer',
  surfaces: ['lane-a'],        // which surfaces may host it
  buildWork: false,            // true = locks under the build freeze
  seed: () => import('../../../seed/governance.json'),
  panels: [ ... ],             // PanelDefinition[]
  Component: GovernanceModule, // React component
  FreezeExempt: undefined,     // optional — see below
} satisfies ModuleDefinition
```

`FreezeExempt` is an optional second component. When the build freeze locks a
module, this is what renders above the freeze stamp; everything else in the
module stays closed. It exists because two things in the spec are not build
work and must not vanish below 40 contacts: a standing security hold (§ 05)
and a finished plan someone needs to read (§ 02). It is not an override — a
module cannot exempt itself in full, only name a specific part, in code. See
`docs/SPEC-CHANGES.md` SC-01.

`src/core/registry.ts` collects them. A surface renders only the modules whose
`surfaces` array includes it. Nothing else routes.

## Panel taxonomy

Five panel kinds cover every section. Do not invent a sixth without a reason
written into the module spec.

| Kind | Use | Signature affordance |
|---|---|---|
| `register` | A list of controlled documents or records | doc-code strip, status pill, gate dots |
| `gate` | Conditions precedent, blockers, dependencies | dependency chain, critical flag, days-open |
| `meter` | A counted discipline (contacts, waves, slots) | gauge with a hard threshold line |
| `ledger` | Append-only event or change history | date column, no edit affordance |
| `board` | A sequenced queue with stages | stage columns, exit criteria on hover |

## Data flow

```
seed/*.json  ──►  storage.load(key)  ──►  module state  ──►  panels
                        ▲                       │
                        └───── storage.save ◄───┘
```

Seed files are the initial import only. After first load the local store wins,
and a `Reset to seed` control in each module restores. There is no server.

Storage keys are namespaced per surface, with exactly one deliberate
exception: the build-freeze contact counter, which is one number across the
whole portfolio because it enforces one rule. See `docs/SPEC-CHANGES.md`
SC-03.

Import from a system of record is a **manual paste or file drop**, handled by
`src/core/import.ts`, never an automatic fetch. This keeps the zero-network
constraint true and keeps the console honest about provenance: every imported
row records `source` and `importedAt`.

## The signature element

Every controlled record renders a **gate strip**:

```
NTE-GOV-2026-MASTERPLAY-001  Rev. B   ●●●●●●●○○   BUILT      12 Aug
└─ document code (mono) ──┘  └rev┘   └ 9 points ┘ └status┘  └updated┘
```

Nine dots, one per Release Gate point, filled when passed. This is the one
place the design spends boldness. Everything around it stays quiet: hairline
rules, generous spacing, no card shadows, no gradients, no icon decoration.

Lane is carried by a 3px ribbon on the left edge of every panel, in that
surface's accent. You can tell which lane you are in from across the room, and
that is the point.

## Accessibility & motion floor

Keyboard focus visible on every interactive element. `prefers-reduced-motion`
respected — the only motion in the system is a 120ms opacity fade on panel
mount and gate-dot fill, both disabled under the media query. Contrast ratio
4.5:1 minimum on body text against panel ground; verified per surface.

## Deliberately out of scope

- Server, auth, multi-user, sync
- Any write path to ClickUp / Notion / Drive / Gmail from this app
- PDF or document generation (the document forge is a separate instrument)
- Native iOS
- Anything on the Excluded Register
