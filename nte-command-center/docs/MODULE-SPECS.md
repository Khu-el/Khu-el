# Module Specs

Eleven modules, one per portfolio section. Each spec is the acceptance contract
for that module. A module is done when every line under **Acceptance** is true,
not when it renders.

Common to all: panel kinds from `docs/ARCHITECTURE.md`, `DocHeader` on every
controlled record, `laneGuard` passing, seed file present with honest
`UNKNOWN`s rather than invented values.

---

## 01 · Governance & Infrastructure — `gov-infrastructure`

**Surface** lane-a · **buildWork** false (governance is never build work)
**Purpose** The control layer. Answers "what governs, what is provisional, what
may I sign today."

**Panels**
1. `register` — Controlling instruments. MASTERPLAY Rev. B, MIGRATE-INIT-001,
   MIGRATE-CORR-001, SCHED-001, CANON-001, IPI-LIC-001. Each with revision,
   gate strip, supersession target.
2. `register` — Entity & capacity. Nine Lane A entities with a
   `nameStatus: CONFIRMED | PROVISIONAL` flag. GHC, IPI, TFS confirmed; VEI,
   OPS, NPE, QVI provisional; MFG/Sui Generis confirmed. Renders the approved
   execution blocks and the prohibited execution forms alongside.
3. `ledger` — Supersession ledger. C-01..C-07 corpus corrections plus the
   file-level ledger rows. Append-only, no edit control.
4. `gate` — The IP licence chain. Head licence NTE→IPI plus sublicences
   L-1..L-7, each with its blocking dependency (L-1/2/3/6 on Q-03, L-4 on D-13,
   L-5 clear). Renders as a dependency chain, not a checklist.
5. `register` — Excluded register X-01..X-12, read-only, permanently visible so
   items do not get reinvented.

**Rules** Entity names flagged PROVISIONAL render in the caution treatment and
carry the note that any instrument using a superseded name fails the Release
Gate on that ground alone. The three-capacity protocol (Trustee / Executor /
Beneficiary) renders as RETIRED with its provenance note, never as active.

**Acceptance**
- [ ] No entity renders without a `nameStatus`.
- [ ] The excluded register cannot be edited or dismissed from the UI.
- [ ] Supersession ledger has no delete or edit affordance in the DOM.
- [ ] Head licence renders as a prerequisite of all seven sublicences, not as a
      peer — a flat list of eight is a failed implementation.

---

## 02 · Ventures & Revenue — `ventures-revenue`

**Surface** lane-a · **buildWork** true

**Purpose** The 51-venture register, the six business plans, the financial
models, and the capital position. Answers "what am I selling and what is it
worth."

**Panels**
1. `register` — 51 ventures, filterable by class (A 9 / B 16 / C 14 / D 11 /
   E 1) and group (7 groups), with entity routing per venture.
2. `board` — The six plans (HOPE, OPHQ, PUB, AGS, ACAD, LAND) with phase,
   revision, funder-annex presence, and blocking CP.
3. `meter` — Capital position. Portfolio ask 28,500 across four tranches
   (8,500 / 6,000 / 8,000 / 6,000), each tranche gated on a named verifiable
   event. Renders tranches as locked until their event carries proof.
4. `register` — Model registry. MODEL-TOP5-001 (10 tabs, 583 formulas) and
   MODEL-LAND-001 (6 tabs, 274 formulas), each with recalc status, scenario
   switch cell, and its YELLOW placeholder cells listed explicitly.
5. `gate` — Class A near-term revenue line, 12 numbers against a declared count
   of 9. **Render the discrepancy, do not reconcile it silently.**

**Rules** No projection renders without its scenario label (conservative / base
/ aggressive). YELLOW placeholder values render in the caution treatment with
"unverified — not a real figure" and are excluded from any roll-up total. Where
plan and model disagree, the model governs; the panel says so.

**Acceptance**
- [ ] Base-case Y1 figures match the model exactly: gross 260,351, contribution
      238,861, net after owner comp 142,221, Q1 (10,813).
- [ ] The B1 average case value placeholder ($600) is visibly flagged and
      excluded from totals.
- [ ] Class A count discrepancy is surfaced as an open item, not resolved.
- [ ] Whole module locks under the build freeze except the plans board, which
      stays readable (reading a plan is not build work).

---

## 03 · Education — `education-nvu`

**Surface** lane-a · **buildWork** true

**Purpose** The 80-entry course register, twelve houses, deliverable waves,
production queue.

**Panels**
1. `register` — Course register. 83 entries post-Amendment 002:
   30 BUILT / 1 PARTIAL / 49 SPECIFIED / 3 PLANNED. Columns: code, title,
   house, level, price, status, deliverables filled (n/8), blocking CP.
2. `board` — Twelve houses as a board. I Ma'at · II Auset · III Ptah ·
   IV Djehuti · V Heru · VI Hapi · VII Sekhmet · VIII Amun · IX Seshat · X Hu ·
   XI Sia · XII Khepera. Four houses at zero built render as empty states that
   name the 13 production-ready specs waiting.
3. `meter` — Deliverable gap. 152 of 248 slots filled, 96 open, broken by type:
   CERT 21, GLOS 20, CAT 17, STG 15, SYL 9, WBK 5, TEXT 5, ASMT 4. Waves
   W-1..W-8 with quarter assignment.
4. `gate` — Course-level conditions: CP-3 (Georgia attorney review of CERT
   texts), CP-4 (SAFE Act / RE licensing / securities, TRMS-201), CP-5
   (due-on-sale disclosure), CP-6 (Georgia tax attorney, TRRE-201 Modules
   IV & VII), CP-9 (NVU Georgia tax attorney review).
5. `ledger` — Amendment ledger. The six-step amendment procedure with each
   out-of-register build's progress through declare → conform → place →
   crosswalk → declare deliverables → clear compliance.

**Rules** Six courses carry a permanent AUTHORED provenance flag — the UI must
never let them be described as recovered prior work; the flag is not
dismissible. Any asset teaching income placement into grantor-controlled
"non-grantor" structures renders UNPUBLISHED and locked. GNPEC: "University"
cannot be used in public-facing strings — the module title is "Academy" on any
outward-facing view, and a lint rule enforces it.

**Acceptance**
- [ ] AUTHORED flag renders on all six adoptions and has no dismiss control.
- [ ] EVOP-201 renders INOPERABLE with its dependency named (40-document
      practice file not built).
- [ ] Empty houses render the 13 waiting specs, not a generic "nothing here."
- [ ] Public-facing strings say Academy; a test asserts "University" appears in
      no outward-facing label.

---

## 04 · Marketing & Content — `marketing-content` (DUAL-HOSTED)

**Surface** lane-a AND practice · **buildWork** true
**Separate seed per surface. Shared code, never shared data.**

**Lane A instance** — Neterverse Publishing, the Opportunity Architect imprint,
the Sales Bible / Field Edition line, the 48 Models deck and Model Selector.
**Practice instance** — the financial education blog, its content calendar and
performance tracking, the Agent Growth Series product line, the 7-stage career
funnel in its four versions, team standup cadence.

**Panels**
1. `board` — Content calendar, week columns, each slot with status and channel.
2. `register` — Asset register (books, decks, tools, prompt sets) with
   imprint/palette assignment.
3. `meter` — Outbound contacts. This is the same counter that drives the build
   freeze. On the practice surface it is labelled in practice vocabulary.
4. `ledger` — Publication ledger with dates and channels.

**Rules** The practice instance must pass `laneGuard` with zero blocked terms.
The Lane A instance must not contain "Primerica." The Opportunity Architect
imprint uses its own palette (drafting-paper grey-green, survey ink, parcel
teal) and must not inherit NTE navy/gold.

**Acceptance**
- [ ] `npm run check:lanes` passes with the practice instance mounted.
- [ ] Zero shared seed keys between the two instances — asserted by a test.
- [ ] The contact meter on both instances reads the same underlying count.

---

## 05 · Tech Stack — `tech-stack`

**Surface** lane-a · **buildWork** true

**Purpose** Repositories, applications, build health, and the canonical-source
determinations.

**Panels**
1. `register` — Application register: Console A, Console B, reference dashboard,
   Opportunity Model Selector, 18-desk HTML interface, this console. Each with
   status, hosting surface, and external-request count (must read 0).
2. `gate` — Unified OS V2. Canonical source determined (Apr 24 in-thread build,
   38 server files, 65+ client, Prisma 35-table schema, CI/CD). **First action
   is export to a private repo plus hash baseline, NOT deployment.** Render it
   as a two-step gate so deployment cannot be marked done first.
3. `board` — Repository health, bi-weekly check: build status, dependency
   updates, activation priority, tech debt.
4. `gate` — Open defects. The file-ID collision
   (`14tj7L_lStV7fxXpi_unfqebvvfOU2vDj` recorded against two documents — one row
   is wrong), the seal-asset question (seals exist in Drive; confirm approved
   assets before use, never recreate a seal), and **the SECURITY HOLD on the
   plaintext credential file in the synced vault.**

**Rules** The SECURITY HOLD renders at the top of the module, above everything,
in the alert treatment, until it carries a `proof` of remediation. It outranks
the whole board. Do not let it be collapsed or dismissed.

**Acceptance**
- [ ] SECURITY HOLD is the first focusable element in the module.
- [ ] Unified OS V2 deployment step is unreachable until export+hash is proven.
- [ ] External-request count is computed, not typed — a build step scans for
      `fetch(`, `XMLHttpRequest`, `<link rel` to remote origins and fails on any.

---

## 06 · Licensed Practice — `practice-desk`

**Surface** practice ONLY · **buildWork** false (selling is never build work)

**Purpose** The practice desk: team, production, recruiting funnel, pipeline.
Carries zero enterprise vocabulary.

**Panels**
1. `board` — Team standup: roster, production, wins, blockers, resources.
   Weekly cadence.
2. `board` — Recruiting funnel, 7 stages, with the prompt set attached to each
   stage.
3. `meter` — Weekly outbound contacts against the 40 threshold.
4. `register` — Warm-market assets: the 100-Name List, script pack, tracker.
5. `gate` — Outside business activity determination. This is the single
   highest-leverage open item in the whole portfolio; it renders as a
   one-question gate with the drafted letter attached and a submitted / not
   submitted state.

**Rules** No NTE trade dress, no seal, no document codes in the enterprise
format. Use plain business vocabulary throughout. The OBA gate must state
plainly what it blocks (roughly two thirds of the venture register sits at
Class D behind it) without naming the enterprise structure.

**Acceptance**
- [ ] `laneGuard` blocked-term scan returns zero matches across the rendered
      DOM, asserted in a test.
- [ ] Palette contains no navy/gold token from the Lane A set.
- [ ] The module is unreachable from surfaces lane-a and lane-b.

---

## 07 · Family Office & Estate — `family-office`

**Surface** lane-b ONLY · **buildWork** false

**Purpose** The Lane B rhythm: family council, legacy plan, instrument binder,
youth safeguards.

**Panels**
1. `board` — Sunday rhythm: pre-bulletin prep checklist, bulletin, council.
2. `ledger` — Family Commands ledger with the **two-carry limit enforced** — no
   more than two commands may carry over; the third forces a close or a
   deliberate drop, and the UI will not accept a third carry.
3. `register` — Instrument binder: CCRLT and related governance documents,
   Legacy Plan V2, each with revision and status.
4. `gate` — Distribution interface. Lane B receives value only as a
   trustee-approved distribution. Renders the rule and the approval state; it
   does not model amounts.
5. `register` — Youth safeguards, read-only.

**Rules** Youth-protection rules from the bulletin format apply to every view
that names a minor: no location, no schedule, no image, no third-party-shareable
export. The export control is disabled for any panel containing a youth record.
Revenue never routes to Lane B in this console — there is no revenue field.

**Acceptance**
- [ ] Third carry-over is rejected by the ledger with a clear message.
- [ ] Any panel containing a youth record has export disabled at the component
      level, not hidden by CSS.
- [ ] No Lane A entity name, seal, or document code appears anywhere.

---

## 08 · LIFEOPS — `lifeops` (DUAL-HOSTED, separate seed)

**Surface** lane-a AND lane-b · **buildWork** false

**Purpose** The eight-domain operating system, the cadence architecture, and
the master scheduled-task calendar.

**Panels**
1. `board` — Eight domains with their tool assignment. The assignment map is
   the one-source-of-truth rule made visible.
2. `board` — Cadence: daily / weekly / bi-weekly / monthly / quarterly standing
   tasks with run times and owning surface.
3. `meter` — Scheduled-task slots. **Ceiling is 10, not 15, and a task with two
   run times consumes two slots.** The meter must compute against 10 and show
   the register as over-capacity until trimmed.
4. `gate` — Naming collision: `S-01` means two different things (LIFEOPS
   S-01..S-15 vs the sales series S-01..S-04). Render as an open item requiring
   a renaming decision; do not auto-resolve.

**Rules** Task rows ship EMPTY where the source register is not in the
workspace. Do not reconstruct them — an empty slot labelled "awaiting source"
is correct; an invented task is a defect. Health, training, and nutrition
detail stays out of this console entirely; the domain renders as a name and a
cadence with no metrics, targets, or numbers.

**Acceptance**
- [ ] Slot meter computes against 10 and counts dual-run tasks as two.
- [ ] Empty task slots render "awaiting source" and are not populated by
      inference.
- [ ] No numeric target, count, or metric appears in the fitness or nutrition
      domain views.

---

## 09 · Capability & Services — `capability-services`

**Surface** lane-a · **buildWork** true

**Purpose** The outward-facing capability statement and the client-facing
service products behind it.

**Panels**
1. `register` — Service products with offer ladder position, price, entity
   routing, and compliance gate.
2. `gate` — The trust-mill separation protocol (CP-8, seven clauses, signable)
   covering the estate-education / insurance-licence adjacency. Renders as a
   gate on every service product it touches.
3. `board` — Pipeline by stage, using the ten stage gates from the Field
   Edition. **Stage 5 is the forecast gate:** real problem + real consequence +
   identified stakeholder + scheduled next step — all four, or it does not
   enter the forecast.
4. `register` — Reference playbooks, marked reference-only.

**Rules** Third-party trust drafting and administration is X-05, excluded — any
service product drifting toward it renders blocked with the exclusion cited. No
service product renders as available while CP-8 is unsigned.

**Acceptance**
- [ ] A deal cannot be moved past Stage 5 without all four criteria checked.
- [ ] CP-8 unsigned blocks every product it touches, computed from the seed,
      not hard-coded per product.

---

## 10 · Compliance & Conditions Precedent — `compliance-cp`

**Surface** lane-a · **buildWork** false

**Purpose** Every gate in the portfolio in one register. This is the module
that decides what may be worked on.

**Panels**
1. `gate` — Unified CP register. **Reconcile the four overlapping numbering
   systems** (MASTERPLAY CP · CP-1..CP-8 · CP-L1..L6 · Q-01..Q-21) to the
   Q-series, showing each row's aliases. The overlap is the known cause of a
   false "cleared" — the panel exists to prevent that.
2. `gate` — Critical seven: CP-2, R-02, G0.1-A, CP-8, CP-L1, S-1, A-1. Five are
   administrative, one is drafting, none are build work — label them so.
3. `register` — Release remediation register R-01..R-06.
4. `meter` — 9-Point Release Gate status across all DRAFT documents; how many
   are blocked on Point 8 (Event ID) alone.
5. `ledger` — Changes ledger CL-001 onward.

**Rules** A CP with more than one alias renders all aliases inline. Marking a CP
cleared requires a `proof` object; the control is disabled without one. This is
the evidence boundary made mechanical.

**Acceptance**
- [ ] Every CP row shows its alias set across all four numbering systems.
- [ ] "Clear" is disabled until a proof source is entered.
- [ ] The critical seven are labelled by type (administrative / drafting) and
      none is labelled build work.

---

## 11 · Knowledge Base & Canon — `knowledge-canon`

**Surface** lane-a · **buildWork** false

**Purpose** Canon lock, supersession, doctrine quarantine, source recovery.

**Panels**
1. `register` — Canon manifest: the authoritative set by domain and the 18
   system instruments, with file IDs.
2. `ledger` — File-level supersession ledger: CANON / SUPPORT / ARCHIVE REVIEW /
   SECURITY HOLD.
3. `register` — **Doctrine quarantine list.** Postal trust declaration (X-03),
   master trust agreement with fee schedule, DAO folder (X-04), enhanced notice
   defense package, the eviction-warfare cluster, 2025 IRS and banking manuals,
   signature capacity codex and empire charter (provenance only). Read-only,
   permanently visible.
4. `gate` — Doctrine pass. Nothing is regenerated from recovered March/April
   material without a doctrine + entity-name + capacity pass. Renders as a
   three-step gate attached to any recovery action.
5. `register` — Genuinely missing evidence: the five third-party items in no
   vault (contract set, two certified dockets, transcripts, final statement).

**Rules** Quarantined material may be listed but never opened, previewed, or
excerpted in this console. The doctrine pass gate must be attached to every
recovery action in the UI — a recovery action with no gate attached is a failed
implementation.

**Acceptance**
- [ ] No quarantined item has a preview, open, or copy affordance.
- [ ] Recovery actions are unreachable without a completed three-step pass.
- [ ] The five missing evidence items render as MISSING, never as pending.

---

## Cross-module acceptance

- [ ] `npm run check:lanes` passes.
- [ ] `npm run check:network` finds zero remote origins.
- [ ] Build freeze locks every `buildWork: true` module below 40 contacts and
      leaves every `buildWork: false` module open.
- [ ] No status of EXECUTED / FILED / SERVED / PAID / RELEASED exists anywhere
      without a `proof` object.
- [ ] Every surface carries `noindex`.
