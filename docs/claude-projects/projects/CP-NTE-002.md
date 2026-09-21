# 🗂️ Claude Project Definition — `CP-NTE-002`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-NTE-002` |
| 🏷️ Name           | NTE Planning Tools — Lane A Apps & Backend |
| 🧑‍💼 Capacity      | `NTE` |
| 🛣️ Lane           | `LANE_A` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `DRAFT` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `PUBLIC` |

## 🎯 MISSION

Build and maintain the three Lane A planning tools — **Deal Architect** (real-estate deal
intelligence), **Capital Readiness** (entity and offering-readiness diligence) and **Notes
Underwriting** (distressed-debt and note underwriting) — together with the shared
`@nte/governance-core` package and the Express + SQLite backend all four apps use.

The work here is product and engineering: new tabs, new calculators, new checklist gates, shared
UI primitives, backend routes. The reason it needs a loaded project is that every one of those
changes has to carry the governance vocabulary correctly, and that vocabulary is a real
type system, not a style guide.

## 🧑‍💼 CAPACITY

`NTE` — Lane A. These three apps serve enterprise and controlled commercial activity under the
trust. Shared with `CP-NTE-001`, which is deliberate: they are the same capacity, split by *kind
of work* rather than by authority. The control plane project reasons about governance; this one
writes application code under it. Splitting them keeps each knowledge base small enough to be
useful without either one blending a capacity.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **`apps/legacy-estate/`.** It is the fourth app in the same monorepo and it is **Lane B**. It
  shares the workspace, the backend and the component library — and none of that makes its records
  Lane A. Its source belongs to `CP-CCRLT-001`. Sharing a repository is a hosting fact, not a data
  relationship.
- **Any real deal, entity, borrower or counterparty record.** This project holds the *tools*. The
  data those tools hold belongs to whoever is using them, in the app's own storage.
- **Investor lists, accreditation records, or borrower contact information.** Loading them would
  supply exactly the raw material the two scoped-out feature sets were designed to make impossible.

## 📝 DESCRIPTION

Engineering project for the three Lane A NTE planning tools, the shared governance-core package
and the invite-only Express/SQLite backend. Scenario calculators and diligence checklists with an
architectural boundary on what the backend may touch.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are building the Lane A NTE planning tools, in the NTE capacity.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md, docs/AI_COUNCIL.md, and the repo layer in
CLAUDE.md. Where they appear to disagree, the stricter reading wins. A task-specific instruction
from the principal overrides all of them.

SCOPE. Three apps — deal-architect, capital-readiness, notes-underwriting — plus
packages/governance-core and server/. The fourth app, legacy-estate, is Lane B and is NOT part of
this project. If a request touches it, say so and stop rather than editing it here. Lane A and
Lane B never auto-connect; the Business Interests registry records a reference, never a merge.

REUSE BEFORE WRITING. packages/governance-core/src/types.ts is the vocabulary for every record:
AuthorityContext, AssertionStatus, ReconciliationStatus, Lane, EvidenceRef, GovernedRecord<T>.
New features carry the same vocabulary rather than inventing a parallel one. Shared UI lives in
packages/governance-core/src/components (Badges, Gates, DecisionMemo, AuthGate, AttachmentsPanel,
SyncStatus, Ui) and the backend client in src/api (client.ts, useAuth.ts, useSyncedRecords.ts).
Check there before writing a new primitive.

THE POINT OF THE TYPES. The UI must never conflate "I typed this in" with "a professional
confirmed this." CURRENT_INTERNAL_MODEL is not EXTERNALLY_VERIFIED. Never render a check mark
for something unverified, and never let an UNKNOWN degrade into a verified status. Any number
shown to a user should be traceable to its inputs or to an EvidenceRef carrying source, as-of
date, unit and limitations. Where a visual would help but the data do not exist, say
VISUAL OMITTED — VERIFIED DATA INSUFFICIENT rather than rendering an empty or invented chart.

OUTPUT CONVENTIONS. Calculators produce scenarios, not guarantees. Checklists carry explicit
status, not automatic conclusions. Memos are drafts — never offering documents and never
solicitations. Where the underlying idea needs a licensed professional, the app says so and
stops; that is what PROFESSIONAL_REVIEW_REQUIRED is for.

HARD BOUNDARIES, ARCHITECTURAL AND NOT STYLISTIC. Do not add a recipient field anywhere in
client or server — sendSelfEmail() hard-codes req.user.email and the system can email only the
signed-in user's own address. Do not add automatic or scheduled outbound email; every send is a
human clicking a button. Keep registration invite-only and fail-closed, including for the owner.
Do not add a code path for filing, signing, transacting, publishing or representing the principal
externally. Specifically scoped out and not to be built: investor contact, accreditation
verification or offering-document generation in capital-readiness; debt collection, borrower
contact or foreclosure action in notes-underwriting; brokerage, lending or title-conclusion logic
in deal-architect.

VERIFICATION. Per-app build runs tsc -b --noEmit && vite build, so type errors fail the build.
Run npm run typecheck or a build before pushing. Tests exist ONLY in
packages/neterverse-kernel; the apps, governance-core and server have no test runner and there is
no linter anywhere. Do not report "tests pass" for a workspace that has no runner — state what
you actually ran.

THIS REPOSITORY IS PUBLIC. No secrets, no real records, no identifiers in committed files.
JWT_SECRET, SMTP settings and CORS_ORIGINS are set on the platform and never committed.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Khu-el | CLAUDE.md | Repo layer — commands, boundaries, governance model, output conventions | `PUBLIC` |
| Khu-el/Khu-el | README.md | What each app is, the backend design, and what is deliberately not built | `PUBLIC` |
| Khu-el/Khu-el | docs/EXECUTIVE_OS.md | Controlling standard, including §14's mapping to these exact types | `PUBLIC` |
| Khu-el/Khu-el | docs/AI_COUNCIL.md | Controlling standard for extending another contributor's work | `PUBLIC` |
| Khu-el/Khu-el | docs/CONNECTORS.md | Which connectors and skills legitimately apply to app work | `PUBLIC` |
| Khu-el/Khu-el | docs/DOMAIN_NETWORK.md | Where these apps deploy, and the variables that gate it | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/types.ts | The vocabulary every record uses — the single most important file here | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/components/ | Shared UI primitives to reuse before writing a new one | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/api/ | Backend client, auth hook and record sync hook | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/index.ts | What the package actually exports | `PUBLIC` |
| Khu-el/Khu-el | apps/deal-architect/src/ | App 1 — real-estate deal intelligence | `PUBLIC` |
| Khu-el/Khu-el | apps/capital-readiness/src/ | App 2 — entity and offering-readiness diligence | `PUBLIC` |
| Khu-el/Khu-el | apps/notes-underwriting/src/ | App 3 — distressed-debt and note underwriting | `PUBLIC` |
| Khu-el/Khu-el | server/src/ | The shared backend, where the send boundary is enforced in code | `PUBLIC` |
| Khu-el/Khu-el | server/.env.example | Which secrets exist, without their values | `PUBLIC` |
| Khu-el/Khu-el | package.json | Workspace layout and the scripts CI runs | `PUBLIC` |
| Khu-el/Khu-el | .github/workflows/verify.yml | What CI enforces on every pull request | `PUBLIC` |
| Khu-el/Khu-el | .github/workflows/deploy-pages.yml | How the frontends reach GitHub Pages, and the CNAME variable gate | `PUBLIC` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| GitHub | Khu-el/Khu-el pull requests and CI runs | Where a change is actually reviewed and verified | `PUBLIC` |
| claude.ai artifacts | The three Lane A app snapshots listed in CONNECTORS.md | Static snapshots of past builds. Where an artifact and a repo file disagree, the repo file wins | `INTERNAL` |

### 🚫 Deliberately excluded

- **`apps/legacy-estate/`** — Lane B. The one exclusion that matters most in this file.
- **`packages/neterverse-kernel/`** — control-plane machinery, not application code. It belongs to
  `CP-NTE-001` and would be ambient noise in a UI conversation.
- **`.neterverse/`** — same reason.
- **`package-lock.json`, `node_modules/`, `dist/`** — no governance content, and large enough to
  crowd out what matters.
- **`server/data/`, `server/uploads/*`, any `.env`** — runtime data and secrets. Gitignored, and
  excluded here as well so the rule holds even when building from a working checkout.
- **Tailwind, PostCSS and Vite config files** — real files, but they answer questions nobody asks
  of a knowledge base. Read them in the repo when a build question actually turns on them.

## 🔄 REBUILD TRIGGERS

- Any change to `packages/governance-core/src/types.ts`. This is the highest-value trigger in the
  file: the type vocabulary is what the whole project reasons from.
- A new or changed shared component or API hook in `governance-core`.
- A new tab, calculator or checklist in any of the three Lane A apps.
- Any change to `server/src/` that touches auth, email or the record routes.
- Any change to the controlling standards or to `CLAUDE.md`.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed by the principal or a peer contributor |
| Evidence for the source list | Direct file listing and read of `Khu-el/Khu-el` at commit `5848e75`, this session. The scoped-out feature list is quoted from `README.md` "What's deliberately not here" and `CLAUDE.md` hard boundaries — `EXTERNALLY_VERIFIED` as to the repository's own text |
