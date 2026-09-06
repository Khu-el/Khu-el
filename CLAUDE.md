# 🧭 CLAUDE.md — Khu-el/Khu-el (NTE Web Apps)

**📌 Read `docs/EXECUTIVE_OS.md` first.** It is the controlling operating standard for
research, evidence, visuals, artifacts, and the approval boundary in this account. This
file is the repo-specific layer on top of it.

---

## 🧬 What this repo is

A npm-workspaces monorepo: **four private planning tools + one shared backend**, plus the
`Khu-el` GitHub profile README.

```
packages/governance-core/   Shared types + UI + API client (@nte/governance-core)
apps/deal-architect/        Real-estate deal intelligence
apps/capital-readiness/     Entity & offering-readiness diligence
apps/notes-underwriting/    Distressed-debt / note underwriting
apps/legacy-estate/         CCRLT / House of Ransom family estate (Lane B, shared workspace)
server/                     Express + SQLite backend shared by all four
web/landing/                Static landing page published to GitHub Pages
```

**Stack:** Vite + React 18 + TypeScript + Tailwind (per app) · Express + `node:sqlite` +
JWT + PDFKit (server).

## ⚙️ Commands

```bash
npm install                     # repo root — installs every workspace
npm run dev:server              # backend on :4000
npm run dev:deal-architect      # and dev:capital-readiness / dev:notes-underwriting / dev:legacy-estate
npm run build                   # all apps + server
npm run typecheck               # root-level tsc sweep
```

Per-app `npm run build` runs `tsc -b --noEmit && vite build` — **type errors fail the
build**, so run a build (or `typecheck`) before pushing. There is no test runner or
linter configured; do not claim ✅ on "tests pass" — there are none. Say what you actually
ran.

## 🛡️ Hard boundaries — do not cross without an explicit instruction

These are architectural, not stylistic. §10 and §14 of the Executive OS standard bind
here:

- **🚫 No third-party send.** The server may email **only the signed-in user's own
  address** — `sendSelfEmail()` hard-codes `req.user.email` and there is no recipient
  field anywhere in client or server. Do not add one.
- **🚫 No filing, signing, transacting, publishing, or representing the principal
  externally.** There is deliberately no code path; adding one requires express
  authorization for that exact action.
- **🚫 No automatic sends.** The digest email goes out only when a human clicks the button.
- **🔐 Registration stays invite-only and fail-closed.** No bypass, including for the owner.
- **⛔️ Scoped-out by design:** features that would turn Capital Readiness into an
  investor-solicitation tool or Notes Underwriting into a debt-collection tool. Each app
  has its own "do not build" list — read it before adding features there.
- **↔️ Lane A and Lane B never auto-connect.** A bridge (e.g. the Business Interests
  registry) records a *reference*, not a merge.

## 🏛️ Governance model — reuse it, don't reinvent it

`packages/governance-core/src/types.ts` is the vocabulary for every record:

- `AuthorityContext` — lane, principal, acting office, capacity, authority/source ref,
  assertion status
- `AssertionStatus` — `CURRENT_INTERNAL_MODEL` · `DOCUMENT_CLAIM` · `EXTERNALLY_VERIFIED` ·
  `PROFESSIONAL_REVIEW_REQUIRED` · `SUPERSEDED` · `UNCLASSIFIED`
- `ReconciliationStatus` — `STAGED` · `HOLD` · `REVIEW` · `RECONCILED` · `EXCLUDED` ·
  `EXCEPTION`
- `Lane` — `LANE_A` · `LANE_B` · `PERSONAL` · `PHILANTHROPIC` · `UNCLASSIFIED`
- `EvidenceRef` — source system, source date, description, and a
  `PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED` classification
- `GovernedRecord<T>` — the wrapper everything persists as

**The point of these types is that the UI never conflates "I typed this in" with "a
professional confirmed this."** New features carry the same status vocabulary. See §14 of
the standard for the mapping between these enums and the Executive OS status/confidence
icons — keep them consistent.

Shared UI lives in `packages/governance-core/src/components/` (`Badges`, `Gates`,
`DecisionMemo`, `AuthGate`, `AttachmentsPanel`, `SyncStatus`, `Ui`) and the backend client
in `src/api/` (`client.ts`, `useAuth.ts`, `useSyncedRecords.ts`). **Check there before
writing a new primitive** — §4, artifact-first.

## 📊 Output conventions in the apps

- Calculators produce **scenarios, not guarantees**; checklists carry **explicit status**;
  memos are **drafts**, never offering documents or solicitations.
- Any number shown to the user should be traceable to inputs or an `EvidenceRef`
  (§2 — data window · as-of · unit · source · limitations).
- Never render ✅ for something unverified, and never let ❓ UNKNOWN degrade into ✅ (§1).

## 🚀 Deployment

Frontends → GitHub Pages via `.github/workflows/deploy-pages.yml` (runs on push to `main`;
served at the account root because the repo is `Khu-el/Khu-el`). Backend → `server/Dockerfile`
+ `fly.toml`, portable to any Docker host. Secrets (`JWT_SECRET`, SMTP, `CORS_ORIGINS`) are
set on the platform — **never committed**. Full walkthrough is in `README.md`.
