# Forms

Standalone, offline HTML working instruments. These are not part of the four Vite apps and are
**deliberately not copied into `_site/` by `.github/workflows/deploy-pages.yml`** — nothing in this
folder is published to GitHub Pages. Open a file directly from disk in a browser, or print it.

## `trust-stewardship-intake.html`

A seven-sheet guided client intake for family trust/estate stewardship conversations, with a
Completeness Ledger rail and an Open Items schedule (Sheet 7) generated from what is still blank.

**Status: held.** The document's own banner says it is not to be sent to a prospect, client, or
family until the outside business activity determination (CP-2) is on file and the issuing entity
on Sheet 00 is filled in. It carries no Event ID and the 9-Point Release Gate has not been run.
That is why it lives here rather than under `web/` with the deployed landing page.

### How it behaves

- **Entirely local.** No network calls, no external assets, no fonts or scripts fetched. Nothing
  is transmitted anywhere.
- **Save** writes a snapshot to this browser's `localStorage` (key `ts-intake-001`), which survives
  a reload and lives there until Clear. If `localStorage` is unavailable (private windows, blocked
  site data), it falls back to an in-memory copy for the session.
- **Export / Import** move a JSON snapshot to and from a file on disk. Import *replaces* the whole
  form rather than merging, so a stale answer from a previous file can't survive underneath.
- **Clear** wipes the fields, resets the repeatable property blocks to one, and removes the stored
  copy.
- Save and Export are independent; neither is a backup of the other. Unsaved edits trigger the
  browser's leave-page warning.

### Open Items schedule

Sheet 7 is generated, not typed. A row appears for every blank `data-req` field, and for five
derived conditions on Sheet 5/4 that the document treats as findings in their own right:

| Condition | Open item |
| --- | --- |
| Record status `Believed to exist — not produced` | Produce a signed copy |
| Record status `Family unsure` | Establish whether it exists at all |
| `Signed copy in hand` + execution page `Not seen` | Copy in hand but unverified |
| Execution page `Yes — signature line blank` | Cannot be relied on until cured |
| Any adviser named on Sheet 4 with no contact permission recorded | Do not contact anyone until answered |

The ledger rail reflects both: a sheet reads `filed` only when its required fields are answered
*and* it contributes no derived open items.

### How Sheet 5's statuses map to the repo's evidence vocabulary

`CLAUDE.md` requires that evidence vocabularies be **mapped, not multiplied**. Sheet 5 asks the
family plain questions rather than asking them to pick a governance enum, so its wording stays as
it is — this table is the mapping, and where the two readings differ the stricter one wins.

| Sheet 5 answer | `AssertionStatus` | Executive OS |
| --- | --- | --- |
| `Signed copy in hand` + execution page `Yes — signed and witnessed` | `EXTERNALLY_VERIFIED` | ✅ VERIFIED |
| `Signed copy in hand` + execution page `Not seen` | `DOCUMENT_CLAIM` | 🟠 TENTATIVE |
| `Signed copy in hand` + execution page `Yes — signature line blank` | `DOCUMENT_CLAIM` | 🟠 TENTATIVE |
| `Believed to exist — not produced` | `DOCUMENT_CLAIM` | 🟠 TENTATIVE |
| `Family unsure` | `UNCLASSIFIED` | ❓ UNKNOWN |
| `Does not exist` · `Not applicable` | — (no claim to classify) | — |
| Left blank | `UNCLASSIFIED` | ❓ UNKNOWN — not yet asked |

Two notes, because the mapping is not total:

- **A copy in hand is not `EXTERNALLY_VERIFIED` on its own.** Only the execution page promotes it.
  That is the rule Sheet 5's own caution states, and it is why three of the five derived gap rules
  above exist: the form refuses to let a named document read as a verified one.
- **`PROFESSIONAL_REVIEW_REQUIRED` is not reachable from Sheet 5**, by design. It belongs to
  Sheet 6, where "Refer to counsel — do not draft in house" and "Irrevocable trust — counsel
  required" carry it. An intake interview records what exists; it does not decide that a document
  is sound.

### Deliberately not collected

Social Security numbers, account numbers, minors' dates of birth, and identity documents. Sheet 2
and Sheet 3 say so on the form. Nothing in this file has a place to put them.

### Editing it

Single file, no build step, no dependencies. The script is one IIFE — note that all mutable state
(`propCount`, `bound`, `dirty`, `SHEETS`) is declared at the top, before any code that can reach
it, because `addProperty()` runs during initialization and calls `bind()`.
