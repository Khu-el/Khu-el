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

Sheet 7 is generated, not typed. A row appears for every blank `data-req` field, and for four
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

### Deliberately not collected

Social Security numbers, account numbers, minors' dates of birth, and identity documents. Sheet 2
and Sheet 3 say so on the form. Nothing in this file has a place to put them.

### Editing it

Single file, no build step, no dependencies. The script is one IIFE — note that all mutable state
(`propCount`, `bound`, `dirty`, `SHEETS`) is declared at the top, before any code that can reach
it, because `addProperty()` runs during initialization and calls `bind()`.
