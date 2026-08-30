# Release note — NTE Command Center

Document code: `NTE-TECH-2026-CCENTER-001`
Revision: A
Status: **DRAFT**
Event ID: **none assigned**
9-Point Release Gate: **not run**
Lane: A (the console hosts three surfaces; the instrument itself is Lane A)
Updated: 2026-08-30

> Authoring a console does not release it. No event ID is assigned here and
> none is requested. This note records what was built and what is not true yet.

---

## 1 · What was built

Eleven modules across three surfaces, on the enforcement layer that arrived
with the scaffold. Modules 01 and 10 were delivered built; the other nine were
stubs and are now implemented.

| # | Module | Surface | buildWork | State |
|---|---|---|---|---|
| 01 | Governance & Infrastructure | lane-a | false | Delivered built; acceptance now written as checks |
| 02 | Ventures & Revenue | lane-a | true | Built |
| 03 | Education | lane-a | true | Built |
| 04 | Marketing & Content | lane-a + practice | true | Built, dual-hosted, two seeds |
| 05 | Tech Stack | lane-a | true | Built |
| 06 | Practice Desk | practice | false | Built |
| 07 | Household & Estate | lane-b | false | Built |
| 08 | LIFEOPS | lane-a + lane-b | false | Built, dual-hosted, two seeds |
| 09 | Capability & Services | lane-a | true | Built |
| 10 | Compliance & Conditions | lane-a | false | Delivered built; extended with the changes ledger and the critical-set reconciliation |
| 11 | Knowledge & Canon | lane-a | false | Built |

Also added:

- A test suite: **143 checks** across 11 files, run with `npm test`.
- `scripts/check-bundle.mjs` and `npm run check:bundle` — the zero-network
  scan applied to the built output, not only to source.
- `seed/network-scan.json`, written by `check:network` on every build, dev
  start and test run, so module 05's external-request count is measured rather
  than typed.
- `docs/SPEC-CHANGES.md` — five recorded amendments, below.

`npm run check` runs types, both firewall scans, the tests and the production
build with its bundle scan. All pass as of this note.

---

## 2 · What remains stubbed or empty

Nothing is stubbed. `src/modules/stub.tsx` remains in the tree for a future
module; no module uses it.

A great deal is **empty and labelled**, which is different. The following are
structure without content, because the content is not in this workspace and
inventing it would produce something that reads as real:

| Where | What is missing | What ships instead |
|---|---|---|
| 02 | 51 venture titles, group assignment, entity routing | 51 slots in the sourced class distribution (A 9 / B 16 / C 14 / D 11 / E 1), each saying "awaiting source" |
| 02 | The 12 Class A revenue line labels and figures | 12 rows, labels null, with the count discrepancy rendered |
| 02 | Conservative and aggressive scenarios | Both render UNKNOWN. Base-case figures are not relabelled to fill them |
| 02 | Gating events for tranches T-3 and T-4 | Both render DEFECTIVE with the proof control disabled — a tranche gated on an unnamed event is not gated |
| 03 | 83 course titles, house assignment, level, price, per-course deliverable counts | 83 slots in the sourced 30/1/49/3 distribution |
| 03 | Which four houses are empty, and the 13 waiting spec names | The mechanism is complete and tested; the 13 render as distinct rows, unassigned |
| 03 | Wave quarter assignment | Eight waves, quarter column empty |
| 04 | Every calendar slot, both instances | Four empty weeks each |
| 05 | Build status of five of six applications | UNKNOWN, with the reason on each row |
| 06 | The desk roster, the seven funnel stage labels, the prompt set per stage | Empty roster with an explanation; seven numbered stages marked AWAITING SOURCE |
| 07 | The council's actual commands | Four rows carrying the mechanism, titles not invented |
| 08 | 15 enterprise and 4 household task names, cadences and run times | Slots marked "awaiting source", counted as one slot each |
| 08 | Seven of eight domain names and every tool assignment | Slots; the one named domain is named because the spec names it |
| 09 | Service product names, ladder position, price, entity routing | Six slots, all BLOCKED because none has been classified or scope-checked |
| 09 | Nine of ten stage gate names | Stage 5 is named; the rest render AWAITING SOURCE |
| 11 | 18 system instrument titles and file identifiers | 18 slots. A file identifier is the value most likely to be copied into a citation; an invented one would make a broken citation look like a working one |

---

## 3 · Acceptance

Every box below was checked by a test, not by looking. The test file and case
are named. Boxes that do not fully pass are marked and explained.

### Module 01 · Governance

| Box | Result | Check |
|---|---|---|
| No entity renders without a `nameStatus` | PASS | `governance-compliance` · "renders one on every entity row" |
| The excluded register cannot be edited or dismissed | PASS | same file · "renders all twelve with no control of any kind" |
| Supersession ledger has no delete or edit affordance | PASS | same file · "renders C-01 through C-07 read only" |
| Head licence is a prerequisite of all seven, not a peer | PASS | same file · "renders one head above seven indented sublicences" |

### Module 02 · Ventures & Revenue

| Box | Result | Check |
|---|---|---|
| Base-case Y1 matches the model exactly (260,351 / 238,861 / 142,221 / (10,813)) | PASS | `ventures-revenue` · "renders the four figures the acceptance names" |
| The B1 $600 placeholder is flagged and excluded from totals | PASS | same file · four cases, including subtotals |
| Class A count discrepancy surfaced as an open item, not resolved | PASS | same file · "renders twelve against nine" and "does not invent the twelve line labels" |
| Module locks under the freeze except the plans board | PASS | same file · "locks the module but leaves the plans board readable" |

### Module 03 · Education

| Box | Result | Check |
|---|---|---|
| AUTHORED flag on all six adoptions, no dismiss control | PASS | `education` · three cases, including across a filter change |
| EVOP-201 renders INOPERABLE with its dependency named | PASS | same file · "renders INOPERABLE with its dependency named" |
| Empty houses render the 13 waiting specs by name | **PARTIAL** | see below |
| Public-facing strings say Academy; "University" in no outward label | PASS | same file · scans every `[data-outward]` node, and asserts the module refuses to render a seed carrying the word |

**PARTIAL — empty houses.** The mechanism is built and tested: a house with
zero built renders its waiting specs as named rows, asserted against a fixture
in `education` · "name the waiting specs as rows rather than a generic empty
state". The seed cannot satisfy the box, because which four houses are empty
and which spec belongs to which are not in this workspace. The 13 specs render
as 13 distinct rows with the reason stated. Supply the house assignment and the
box closes with no code change.

### Module 04 · Marketing & Content

| Box | Result | Check |
|---|---|---|
| `check:lanes` passes with the practice instance mounted | PASS | `cross-module` · box 1 runs the real script; `marketing-content` · "renders clean on its own surface" |
| Zero shared seed keys between the two instances | PASS | `marketing-content` · "shares not one key between the seed files, at any depth" (25 keys vs 20, zero intersection) |
| The contact meter on both instances reads the same count | PASS | same file · "shows the same number after logging on one surface" |

### Module 05 · Tech Stack

| Box | Result | Check |
|---|---|---|
| SECURITY HOLD is the first focusable element, frozen or not | PASS | `tech-stack` · "is the first focusable element" and "survives the build freeze" |
| Unified OS V2 deploy step unreachable until export+hash is proven | PASS | same file · two cases, asserting the real `disabled` attribute |
| External-request count is computed, not typed | PASS | same file · "is measured, not typed into the seed" |

### Module 06 · Practice Desk

| Box | Result | Check |
|---|---|---|
| Blocked-term scan returns zero matches across the rendered DOM | PASS | `practice-desk` · scans text and markup, then every term one at a time |
| Palette contains no navy/gold token from the enterprise set | PASS | same file · reads `tokens.css`, asserts zero shared colour values |
| The module is unreachable from lane-a and lane-b | PASS | same file · "does not appear on the enterprise or household surfaces" |

### Module 07 · Household & Estate

| Box | Result | Check |
|---|---|---|
| Third carry-over rejected with a clear message | PASS | `household` · three cases, at the rule and through the UI |
| Export disabled at the component level for any panel with a youth record | PASS | same file · asserts the real `disabled` attribute, and that `exportRows` throws |
| No Lane A entity name, seal, or document code appears | PASS | same file · asserts every entity name and doc code in the governance seed is absent |

### Module 08 · LIFEOPS

| Box | Result | Check |
|---|---|---|
| Slot meter computes against 10 and counts dual-run tasks as two | PASS | `household` · four cases |
| Empty task slots render "awaiting source" and are not populated by inference | PASS | same file · asserts every seeded task field is null |
| No numeric target, count, or metric in the fitness or nutrition view | PASS | same file · asserts the rendered node contains no digit, on both surfaces |

### Module 09 · Capability & Services

| Box | Result | Check |
|---|---|---|
| A deal cannot move past Stage 5 without all four criteria | PASS | `capability-canon` · five cases, including each criterion missing in turn |
| CP-8 unsigned blocks every product it touches, computed from the seed | PASS | same file · "is computed from the set, not marked per product" |

### Module 10 · Compliance & Conditions

| Box | Result | Check |
|---|---|---|
| Every CP row shows its alias set across all four numbering systems | PASS | `governance-compliance` · "renders aliases inline, and says so where a row has none" |
| "Clear" is disabled until a proof source is entered | PASS | same file · asserts the control stays disabled through two of three fields |
| The critical seven are labelled by type and none is build work | **PASS, with a discrepancy surfaced** | see below |

**The critical set does not reconcile, and the console now says so.** The spec
names seven: CP-2, R-02, G0.1-A, CP-8, CP-L1, S-1, A-1. Against the delivered
register:

1. Seven names resolve to **six** distinct conditions — CP-2 and R-02 both
   resolve to Q-01. The critical set is six conditions called by seven names.
2. The declared split is five administrative and one drafting. The resolved
   split is four administrative, two drafting and one review.
3. The register flags **eight** conditions critical, not seven: the six above
   plus Q-07 and Q-16. Q-16 is the security hold, raised after the set was
   declared.
4. **R-02 names both a condition alias and a row in the remediation register.**
   An instruction to "clear R-02" is ambiguous, and one that resolves to the
   wrong register looks like it resolved correctly. This is the exact failure
   this module exists to prevent, sitting inside the module's own critical set.

None of it is reconciled here. Reconciling needs the authority that declared
the set, and a reconciliation this console invented would be a fifth numbering
system on top of the four that already overlap. The type box passes: every
declared name carries a type, none is `build`, and no condition anywhere in the
register is typed `build`.

### Module 11 · Knowledge & Canon

| Box | Result | Check |
|---|---|---|
| No quarantined item has a preview, open, or copy affordance | PASS | `capability-canon` · asserts nine absences per row, plus that the seed holds no field that could carry the material |
| Recovery actions unreachable without a completed three-step pass | PASS | same file · four cases, including a pass marked complete with no proof |
| The five missing evidence items render MISSING, never pending | PASS | same file · "renders MISSING, never pending" |

### Cross-module

| Box | Result | Check |
|---|---|---|
| `npm run check:lanes` passes | PASS | `cross-module` · box 1 executes the real script |
| `npm run check:network` finds zero remote origins | PASS | `cross-module` · box 2 executes the real script; 46 files, zero findings |
| Freeze locks every `buildWork: true` module below 40 and leaves every `buildWork: false` module open | PASS | `cross-module` · box 3, one case per module, all eleven |
| No EXECUTED / FILED / SERVED / PAID / RELEASED anywhere without a `proof` | PASS | `cross-module` · box 4 walks every seed file, plus a case proving the walk would catch one |
| Every surface carries `noindex` | PASS | `cross-module` · box 5, and `check:bundle` re-checks it on the built page |

---

## 4 · Spec amendments

Five, all recorded in `docs/SPEC-CHANGES.md` with the conflict that forced
each. **Neither guard script's `EXEMPT` list was touched; both are identical to
the delivered scaffold.**

| # | Change | Why |
|---|---|---|
| SC-01 | A module may declare a `FreezeExempt` part | Otherwise the security hold vanishes under the freeze in the weeks it matters most |
| SC-02 | `ProofForm` moved into the shared component set | Four copies of an evidence gate is four places for one to drift into accepting an empty source |
| SC-03 | The contact counter is held across surfaces | One rule, one number. A counter that resets on a surface switch is a bypass, and § 04 requires both instances to read the same count |
| SC-04 | Blocked terms match on word boundaries | Substring matching fired on *interface*, *documented*, *content* and *plane*. The same change tightened the scan to include comments on the practice surface |
| SC-05 | "Under practice" means any path component that names it | The delivered detector left `seed/marketing-practice.json` outside every firewall check |

---

## 5 · Known limitations

Stated because they are true, not because they block anything.

1. **All three surfaces ship in one bundle.** The firewall is enforced at
   render (`assertSurface`, `assertLane`), at build (`check:lanes`) and in
   storage (per-surface namespacing). It is not enforced at the bundle: someone
   reading the JavaScript file can see all three surfaces' vocabulary. This
   follows from the route-switched single-app architecture the scaffold
   defines. Separate builds per surface would close it and would be a change to
   `docs/ARCHITECTURE.md`, not a bug fix.

2. **Two URL string families are present in the built bundle and accounted
   for.** `check:bundle` names them: XML/SVG namespace URIs, which are
   identifiers the browser never dereferences, and React's error-decoder
   documentation link, which is text inside a thrown Error. No request-capable
   call remains — Vite's modulepreload polyfill, which shipped a live
   `fetch(link.href)`, is now disabled in `vite.config.ts`. The judgement about
   those two families concerns vendored library code; nothing about our own
   source was relaxed.

3. **`seed/network-scan.json` is generated.** It is committed so the module
   renders without a build step, and regenerated on every build, dev start and
   test run. Do not hand-edit it — the point of the file is that nobody typed
   the number in it.

4. **EVOP-201's status is this console's assumption.** The register does not
   say which of the 83 entries is the single PARTIAL. Assigning it to EVOP-201
   is a reading, and the row says so on its face rather than letting an
   inference sit inside a sourced distribution.

5. **Provisional document codes.** Where a register row needed a code this
   console did not carry from a source, the code is flagged
   `docCodeProvisional` and rendered "code provisional". Modules 05 and 02
   contain these.

---

## 6 · Document control

```
NTE-TECH-2026-CCENTER-001   Rev. A   ○○○○○○○○○   DRAFT      30 Aug
└─ document code (mono) ─┘  └rev┘   └ 9 points ┘ └status┘  └updated┘
```

| Point | Release gate | State |
|---|---|---|
| 1 | Scope and authority confirmed | not run |
| 2 | Entity and capacity correct | not run |
| 3 | Lane firewall clear | not run |
| 4 | Prohibited language scan clear | not run |
| 5 | Compliance conditions cleared | not run |
| 6 | Document control complete | not run |
| 7 | Review and sign-off | not run |
| 8 | Event ID assigned | not run |
| 9 | Seal and execution | not run |

Nine points open. **Not run is not the same as failed, and neither is the same
as passed** — the strip reads empty because the gate has not been run, and this
note does not run it. `check:lanes` passing is evidence for point 3; it is not
point 3.

Supersedes: nothing. Superseded by: nothing.
