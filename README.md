# NTE Web Apps

Four private, client-side planning tools, built as a shared-package monorepo. Each app is a
standalone static site (no backend, no API, no external data leaves the browser) that turns a
specific area of deal/finance/estate work into disciplined calculators, checklists, and draft
decision memos — instead of hype.

> **Note:** this repo doubles as the `Khu-el` GitHub profile README repo. This file replaces the
> default profile placeholder; if you want the original "Hi there 👋" content back on your profile,
> it's in git history (`git log -- README.md`).

## Why these apps look the way they do

The source material for this build (real-estate/wealth "blueprint" decks, plus an NTE/CCRLT
governance model) mixes genuinely useful structure with overstated or legally contingent claims
("infinite ROI," guaranteed outcomes, sovereign/private-law framing). These apps deliberately
translate that into:

- **Scenario calculators**, not guarantees
- **Checklists with explicit status**, not automatic conclusions
- **Draft decision memos**, not offering documents or solicitations
- A hard architectural boundary: **no app here has a backend**. None of them can contact a third
  party, move money, sign anything, or file anything — because there's no server-side code capable
  of doing so. That boundary is enforced by the stack, not just by a banner in the UI (though there's
  one of those too).

Two of the four apps (Capital Readiness, Notes Underwriting) intentionally stop short of features
that would make them investor-solicitation or debt-collection tools — see each app's README for
specifics on what's scoped out and why.

## Structure

```
packages/governance-core/   Shared types + UI: Lane, AssertionStatus, ReconciliationStatus,
                             AuthorityContext, EvidenceRef, GovernedRecord<T>, badges, gates,
                             form/table primitives, the decision-memo renderer.

apps/deal-architect/        App 1 — Real estate deal intelligence
apps/capital-readiness/     App 2 — Entity & offering-readiness diligence
apps/notes-underwriting/    App 3 — Distressed-debt / note underwriting analysis
apps/legacy-estate/         App 4 — CCRLT / House of Ransom family estate coordination (Lane B)
```

Each app is Vite + React + TypeScript + Tailwind, matching the stack already used in this
account's `mental-alchemy` repo. State persists to `localStorage` only.

## The shared governance model

Every record in every app carries an `AuthorityContext` and an `AssertionStatus`
(`CURRENT_INTERNAL_MODEL` / `DOCUMENT_CLAIM` / `EXTERNALLY_VERIFIED` /
`PROFESSIONAL_REVIEW_REQUIRED` / `SUPERSEDED` / `UNCLASSIFIED`), so the UI never conflates "I typed
this in" with "a professional confirmed this." `Lane` (`LANE_A` enterprise/technology vs. `LANE_B`
family/estate vs. `PERSONAL`/`UNCLASSIFIED`) keeps the four apps from silently assuming any given
asset or entity belongs to a specific side. Nothing here auto-connects Lane A and Lane B — a
"bridge" (like the Business Interests registry in the Legacy & Estate app) records a reference, not
a merge.

## Running an app locally

```bash
npm install               # from repo root — installs all four apps + the shared package
npm run dev:deal-architect
npm run dev:capital-readiness
npm run dev:notes-underwriting
npm run dev:legacy-estate
```

## Building

```bash
npm run build              # builds all four apps
```

Each app's build output lands in `apps/<app>/dist` and can be deployed anywhere that serves static
files (GitHub Pages, Netlify, Vercel, S3, etc.) — there's no server to provision.

## What's deliberately not here

- No investor contact, accreditation verification, or offering-document generation
  (`apps/capital-readiness`)
- No debt collection, borrower contact, or foreclosure action (`apps/notes-underwriting`)
- No automatic trust amendment, asset retitling, or beneficiary change (`apps/legacy-estate`)
- No brokerage, lending, or title-conclusion logic (`apps/deal-architect`)
- No claim, anywhere, that an internal document by itself establishes verified legal status, tax
  treatment, or creditor protection

Where the underlying idea needs a licensed professional (securities counsel, an estate attorney, a
title company, a CPA), the app says so and stops.
