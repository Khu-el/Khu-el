# Build Order

Work these in order. The sequence is not arbitrary: the enforcement layer is
built before any module exists that could bypass it, and the two reference
modules are built before the nine that copy them. Skipping ahead produces a
module with its own shape, and a second shape is a defect.

Each step is a prompt to paste into Claude Code, followed by what "done" means.
Do not start a step until the previous one's check passes.

---

## Step 0 — Verify the scaffold

```
Read CLAUDE.md, docs/ARCHITECTURE.md and docs/MODULE-SPECS.md in full before
writing anything. Then run npm install, npm run check:types,
npm run check:lanes and npm run check:network, and report what passes and what
fails. Do not fix anything yet — just report.
```

**Done when** all four commands run and you have a written list of failures.

---

## Step 1 — Green the enforcement layer

```
Fix only what is needed to make check:types, check:lanes and check:network
pass. Do not add features, do not touch the modules, and do not add any
exemption to the guard scripts to make a check pass — if a check fails, the
code is wrong, not the check.
```

**Done when** all three pass with no new entries in either script's EXEMPT list.

---

## Step 2 — Confirm the freeze and the firewall actually bite

```
Write tests proving four things:
  1. A module with buildWork: true renders the freeze stamp when the current
     week has fewer than 40 logged contacts, and renders its content at 40.
  2. A module with buildWork: false renders its content at 0 contacts.
  3. assertSurface throws when a module is mounted on a surface it does not
     declare.
  4. storage keys written under lane-a are not readable after setSurface
     ('lane-b').
Use whatever test runner you prefer; add it to package.json.
```

**Done when** all four pass. If any of them is hard to write, the abstraction
is wrong — fix the abstraction, not the test.

---

## Step 3 — Module 05, Tech Stack

Built early and out of numeric order, on purpose: it carries the security hold,
and an open plaintext credential file in a synced vault outranks the rest of
the board.

```
Build src/modules/tech-stack/ per docs/MODULE-SPECS.md § 05. Copy the shape of
src/modules/gov-infrastructure/index.tsx exactly — seed as data, storage for
state, RecordRow for controlled records, a Reset to seed control.

Three things this module must get right:
  - The security hold record is the first focusable element and has no
    collapse or dismiss control.
  - The unified OS gate is two steps, export-and-hash then deploy, and the
    deploy step is unreachable until the first carries proof.
  - The external-request count is computed by running check:network at build
    time and reading the result, not typed into the seed.

Create seed/tech-stack.json with honest values. Where you do not know a build
status, write UNKNOWN. Do not infer one.
```

**Done when** every acceptance box in § 05 is true.

---

## Step 4 — Module 06, Practice Desk

Built before the other Lane A modules because it is the only surface whose
firewall failure is externally visible, and because the outside business
activity gate it carries unblocks roughly two thirds of the venture register.

```
Build src/modules/practice-desk/ per § 06. This is the practice surface, so:
  - No enterprise vocabulary anywhere, including in comments that end up in
    the bundle, variable names, and seed keys.
  - No navy or gold token. The practice palette has none; if you find yourself
    needing one, the component is reaching outside its surface.
  - Plain business language throughout. The gate states what it blocks without
    describing the enterprise structure.

Then add a test asserting that the rendered DOM of this module contains zero
terms from ENTERPRISE_TERMS.
```

**Done when** § 06 acceptance passes and `check:lanes` is clean with the module
mounted.

---

## Step 5 — Module 10 extension, then Module 02

Module 10 is already built. Extend it first, because module 02 depends on
reading a clean condition register.

```
Extend src/modules/compliance-cp/ to add the changes ledger panel from § 10,
then build src/modules/ventures-revenue/ per § 02.

For module 02, three rules that are easy to get wrong:
  - Every projection carries its scenario label. A number without a scenario
    is not a projection.
  - Placeholder values are flagged and excluded from every roll-up. Do not
    let an unverified figure into a total, even a subtotal.
  - Where a plan and a model disagree, render the model's figure and say so in
    the row. Do not average them and do not silently pick one.

Surface the class-count discrepancy as an open item. Do not reconcile it —
you do not have the information to, and a reconciliation you invented is worse
than the discrepancy.
```

**Done when** the base-case figures in § 02 acceptance match exactly.

---

## Step 6 — Module 03, Education

```
Build src/modules/education-nvu/ per § 03. The twelve houses are a board; four
of them have zero built courses and must render the waiting specs by name, not
a generic empty state.

Two non-negotiables:
  - The AUTHORED provenance flag has no dismiss control. Six entries carry it
    permanently. The UI must make it impossible to present them as recovered
    prior work.
  - Add a lint rule or test asserting that the word "University" appears in no
    outward-facing label. Internal views may use it. Anything a student or
    prospect would see says Academy.
```

---

## Step 7 — Module 04, dual-hosted

The first module on two surfaces. Get this wrong and the firewall is gone.

```
Build src/modules/marketing-content/ per § 04, hosted on lane-a and practice.

Shared code, separate data. Concretely:
  - Two seed files, seed/marketing-lane-a.json and
    seed/marketing-practice.json, with zero overlapping keys.
  - The component takes surface as a prop and selects its seed from it. It
    never imports both.
  - A test asserting the two seed files share no key.
  - The imprint palette is its own token block, not a variant of the enterprise
    one.
```

---

## Step 8 — Modules 07 and 08, the household surface

```
Build src/modules/family-office/ (§ 07) and src/modules/lifeops/ (§ 08).

Module 07 has two hard behaviours:
  - The commands ledger rejects a third carry-over with a clear message. Not a
    warning, not a colour change — a rejection.
  - Any panel containing a youth record has export disabled at the component
    level. Hidden by CSS is not disabled.

Module 08 is dual-hosted like module 04, same separate-seed rule. Its slot
meter computes against 10, and a task with two run times counts as two. Leave
unknown task rows empty and labelled "awaiting source". Do not reconstruct
them from inference — an invented standing task is a defect, not a
placeholder.

Module 08's health and training domain renders as a name and a cadence only.
No metric, target, count, or number of any kind in that view.
```

---

## Step 9 — Modules 09 and 11

```
Build src/modules/capability-services/ (§ 09) and
src/modules/knowledge-canon/ (§ 11).

Module 09's pipeline board must refuse to advance a deal past stage five
without all four criteria checked. The separation-protocol gate is computed
across every product it touches, from the seed — not hard-coded per product,
or it will drift the first time a product is added.

Module 11 holds the quarantine list. Quarantined material may be listed and
never opened, previewed, excerpted, or copied. If a component gives any of
those affordances, remove it. Recovery actions are unreachable without a
completed three-step doctrine pass.
```

---

## Step 10 — Cross-module acceptance and release

```
Run the full cross-module acceptance list at the end of docs/MODULE-SPECS.md.
For each box, either demonstrate it passing or say plainly that it does not.
Do not mark a box passed on inspection — write the check.

Then produce a short release note listing:
  - what was built
  - what remains stubbed
  - every acceptance box that does not pass and why
  - the document control block for this console

Assign no event ID and do not mark it released. Authoring a console does not
release it.
```

---

## What to do when a step conflicts with the spec

The spec wins, and if the spec is wrong, change the spec first and say what you
changed. Do not build to a different rule and leave the spec describing
something that no longer exists — the gap between the two is where the next
false "cleared" comes from.
