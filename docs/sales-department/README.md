# 🧭 The Sales Department — 48-item method playbook

**Status:** 🔵 PROPOSED draft · authored by Claude Code, 2026-10-25 · not yet reviewed by the principal or a peer contributor.
**Class:** `PUBLIC` — method only. This repository is public, so nothing here names a buyer, a price, a client or a contact.

A capacity-neutral method for finding buyers, running a pipeline, and closing — organised as 48
numbered items in six sections. It is loaded into **two** Claude Projects, each carrying exactly one
capacity (`CP-NTE-004`, `CP-DIGP-002`). The method is shared; the facts are not — each capacity's
ICP, offer, pricing and pipeline live in that capacity's own system of record, never here.

## 🗺️ The 48 items

| Section | Items | File |
|---|---|---|
| I — Find Buyers | 01–08 | [01-find-buyers.md](01-find-buyers.md) |
| II — Run the Pipeline | 09–16 | [02-run-the-pipeline.md](02-run-the-pipeline.md) |
| III — Guides and Playbooks | 17–24 | [03-guides-and-playbooks.md](03-guides-and-playbooks.md) |
| IV — Skill Libraries and Prompts | 25–32 | [04-libraries-and-prompts.md](04-libraries-and-prompts.md) |
| V — Signal Agents | 33–40 | [05-signal-agents.md](05-signal-agents.md) |
| VI — Templates and Trackers | 41–48 | [06-templates-and-trackers.md](06-templates-and-trackers.md) |
| Per-capacity overlays | — | [overlays/NTE.md](overlays/NTE.md) · [overlays/DIGP.md](overlays/DIGP.md) |

## 🛑 Rules that hold for every item

1. **Drafts only.** Every outreach, DM, follow-up, proposal and report is a draft for the principal.
   Nothing is sent, posted, booked, invoiced or published without the principal's approval of that
   exact payload (Executive OS §10). Where a send path is ever built, it is the propose → human
   approves exact payload → execute-once model already in `packages/nvs-agent-desk` — cite it, do
   not re-invent it.
2. **No contact data in the repo or in the shared method.** A named person, address, number or
   company-specific fact is a record, and belongs in the capacity's system of record. Examples in
   this playbook are placeholders in `[BRACKETS]`.
3. **An unread source is not a verification.** A claim about a buyer is tagged by how it is known
   (vocabulary: `docs/AI_COUNCIL.md` §9 — map, do not multiply). A page that could not be read is
   `UNKNOWN`; it never defaults to "fits" or "still employed".
4. **A missing input is `UNKNOWN`, never zero.** A fit score with an unanswered criterion is
   *unscored*, not low. Same rule as `CLAUDE.md` for calculations.
5. **Lawful, ordinary sources only.** Public business information a person would find themselves.
   No evasion of access controls or robots rules, no purchased or scraped personal data without a
   lawful basis. Whether a channel is permitted (email, SMS, calls, cross-border) is a legal
   question: mark it `PROFESSIONAL_REVIEW_REQUIRED` and escalate — never tag it `INFERRED`.
6. **Scenarios, not guarantees.** No promised outcomes, conversion rates or revenue. A target is a
   target. Case-study and testimonial claims need a source the principal can produce.
7. **Recurring work is a scheduled task, not a prompt.** Items in Section V are *proposed* agents.
   None is scheduled. Defining one means `docs/scheduled-tasks/SPEC.md` first.
8. **Reuse before rebuild.** Search `REGISTRY.md` files and existing tools before adding a parallel
   one (Executive OS §4).

## ⚖️ Deliberate departures from the source graphic

This playbook was **built from a table of contents** — a social-media graphic listing 48 titles in
six sections. Its 48 files were behind a "comment for access" gate and were **not read**. Every item
here is original text written to the listed title and one-line description. Nothing is copied, and
nothing is claimed about what the original files say. Provenance of the graphic: ⚪ UNKNOWN author,
unverified claims on it (e.g. "15 demos in 5 days") are treated as marketing, not evidence.

| Item | Graphic's title | Change | Why |
|---|---|---|---|
| 23 | Sales and Fundraising | Reframed as **Sales Evidence and the Capital Narrative** | `CLAUDE.md` scopes out anything that turns Capital Readiness into investor solicitation. Item 23 records traction honestly; it does not solicit |
| 31 | 250 Prompts | **A prompt library by pattern, not a count** | A quoted count goes stale and invites padding (SPEC source rule 4) |
| 32 | 50 Prompts | Merged into item 31's structure with a pipeline-run subset | Same reason |
| 33–40 | Signal Agents | Specified as **human-reviewed, public-source, unscheduled** | No auto-send, no evasion, recurring work needs a task definition |

## 🧾 Provenance

| Field | Value |
|---|---|
| Defined by | Claude Code, 2026-10-25 (session `01LrFNVevuPHZw9JoikkKgdo`) |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed |
| Evidence | Structure from the user-supplied graphic (a screenshot, read as an image). Body text is `CURRENT_INTERNAL_MODEL` — our own reasoning, not market evidence |
| Rollback | Delete `docs/sales-department/`, the two `CP-*` definitions and their registry rows. Nothing else depends on them |
