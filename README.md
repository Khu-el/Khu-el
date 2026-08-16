# NTE Web Apps

Four private planning tools, built as a shared-package monorepo, backed by one self-hosted
backend. Each app turns a specific area of deal/finance/estate work into disciplined calculators,
checklists, and draft decision memos — instead of hype.

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
- A hard architectural boundary on **what the backend is allowed to touch**: it can store your
  data, generate PDFs, and email *you*. It cannot contact anyone else, file anything with a
  regulator, or move money — there's no code path for any of that, not just a UI convention.

Two of the four apps (Capital Readiness, Notes Underwriting) intentionally stop short of features
that would make them investor-solicitation or debt-collection tools — see below and each app's own
"do not build" list for specifics on what's scoped out and why.

## Structure

```
packages/governance-core/   Shared types + UI + API client: Lane, AssertionStatus,
                             ReconciliationStatus, AuthorityContext, EvidenceRef, GovernedRecord<T>,
                             badges, gates, form/table primitives, decision-memo renderer,
                             auth screen, attachments panel, backend sync hook.

apps/deal-architect/        App 1 — Real estate deal intelligence
apps/capital-readiness/     App 2 — Entity & offering-readiness diligence
apps/notes-underwriting/    App 3 — Distressed-debt / note underwriting analysis
apps/legacy-estate/         App 4 — CCRLT / House of Ransom family estate coordination (Lane B)

server/                     Shared backend for all four apps (Express + SQLite)
```

Each app is Vite + React + TypeScript + Tailwind, matching the stack already used in this
account's `mental-alchemy` repo.

## The backend

One Node/Express server, shared by all four frontends, using SQLite (via Node's built-in
`node:sqlite` — no database to install or host separately). It exists to do exactly four things:

1. **Accounts & multi-device sync** — email/password accounts (bcrypt-hashed, JWT sessions), so
   your data isn't stuck in one browser. Each app still keeps a `localStorage` cache underneath, so
   it keeps working if the backend is briefly unreachable.
2. **File attachments** — upload real documents (deeds, notes, trust paperwork, insurance
   declarations) to any record, stored on disk with per-record access control.
3. **PDF export & email-to-self** — every Decision Memo can be downloaded as a PDF or emailed —
   **but only to the signed-in user's own account address.** There is no recipient field anywhere
   in the client or server code; `sendSelfEmail()` on the backend hard-codes the recipient to
   `req.user.email`. If you don't configure SMTP, these actions return a clear "not configured"
   message instead of failing silently or doing nothing.
4. **A "needs attention" digest** — stale beneficiary designations, incomplete checklists, etc.,
   computed server-side across your records, viewable in-app or emailed to yourself on demand
   (never automatically — a human clicks the button every time).

### Access rules

- **Deal Architect, Capital Readiness, Notes Underwriting**: records are private to the user who
  created them.
- **Legacy & Estate Coordination**: records are a *shared* workspace — every signed-in user can see
  the same family records (this is the one app meant for multiple family members), but a
  `READ_ONLY_AUDITOR` role can view without being able to edit. Role is self-selected at
  registration in this version; there's no admin panel to manage other users' roles yet.

### Running the backend

```bash
cd server
cp .env.example .env      # fill in JWT_SECRET before using this anywhere but your own machine
npm run dev                # or: npm run build && npm start
```

Defaults to `http://localhost:4000`. Each app talks to that by default; override per-app with a
`VITE_API_BASE_URL` env var if you deploy the backend somewhere else.

**SMTP is optional.** Without `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` set, PDF export still
works, but "Email me this" and the digest email return a plain "not configured" message rather than
pretending to send anything.

## The shared governance model

Every record in every app carries an `AuthorityContext` and an `AssertionStatus`
(`CURRENT_INTERNAL_MODEL` / `DOCUMENT_CLAIM` / `EXTERNALLY_VERIFIED` /
`PROFESSIONAL_REVIEW_REQUIRED` / `SUPERSEDED` / `UNCLASSIFIED`), so the UI never conflates "I typed
this in" with "a professional confirmed this." `Lane` (`LANE_A` enterprise/technology vs. `LANE_B`
family/estate vs. `PERSONAL`/`UNCLASSIFIED`) keeps the four apps from silently assuming any given
asset or entity belongs to a specific side. Nothing here auto-connects Lane A and Lane B — a
"bridge" (like the Business Interests registry in the Legacy & Estate app) records a reference, not
a merge.

## Running everything locally

```bash
npm install                    # from repo root — installs all four apps + shared package + server
npm run dev:server             # terminal 1 — the shared backend
npm run dev:deal-architect      # terminal 2
npm run dev:capital-readiness   # terminal 3
npm run dev:notes-underwriting  # terminal 4
npm run dev:legacy-estate       # terminal 5
```

Register a separate account per app the first time you open it (accounts are shared across apps —
registering once and logging in again elsewhere works the same way), or reuse the same login on
all four; family members sharing the Legacy & Estate workspace should each register their own
account so edits are attributable.

## Building

```bash
npm run build              # builds all four apps + the server
```

Each app's build output lands in `apps/<app>/dist` (static, deployable to GitHub Pages, Netlify,
Vercel, S3, etc.) and needs `VITE_API_BASE_URL` set at build time if the backend isn't on
`localhost:4000`. The server builds to `server/dist` and runs anywhere Node runs — a small VM,
a Docker container, a Raspberry Pi on your own network. It keeps its SQLite file and uploaded files
under `server/data` / `server/uploads` (or wherever `NTE_DATA_DIR` / `NTE_UPLOADS_DIR` point) — back
those up like you would any real data.

## What's deliberately not here

- No investor contact, accreditation verification, or offering-document generation
  (`apps/capital-readiness`)
- No debt collection, borrower contact, or foreclosure action (`apps/notes-underwriting`)
- No automatic trust amendment, asset retitling, or beneficiary change (`apps/legacy-estate`)
- No brokerage, lending, or title-conclusion logic (`apps/deal-architect`)
- No email recipient other than the signed-in user's own address, anywhere in the system
- No automatic/scheduled outbound email — every send (memo, digest) is a human clicking a button in
  the moment, not a background job
- No claim, anywhere, that an internal document by itself establishes verified legal status, tax
  treatment, or creditor protection

Where the underlying idea needs a licensed professional (securities counsel, an estate attorney, a
title company, a CPA), the app says so and stops.
