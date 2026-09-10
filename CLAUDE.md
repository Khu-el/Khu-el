# 🧭 CLAUDE.md — Khu-el/Khu-el (NTE Web Apps)

**📌 Two controlling standards govern work here. Read both before starting.**

| Standard | Governs | Read before |
|---|---|---|
| `docs/EXECUTIVE_OS.md` | How *any* work is researched, evidenced, visualized, and recorded; the approval boundary | Any analysis, report, artifact, or recommendation |
| `docs/scheduled-tasks/SPEC.md` | How a *scheduled* task (Routine, cron, trigger, recurring brief) is defined | Creating, editing, or scheduling any recurring task |

This file is the repo-specific layer on top of both.

---

## ⏰ Scheduled tasks

Before creating, editing, or scheduling **any** recurring task, read
`docs/scheduled-tasks/SPEC.md` and follow it in full:

1. Search `docs/scheduled-tasks/REGISTRY.md` and `docs/scheduled-tasks/tasks/` for an
   existing task that covers the mission. Reuse and update it if one exists.
2. Otherwise copy `docs/scheduled-tasks/TEMPLATE.md` to
   `docs/scheduled-tasks/tasks/<TASK-ID>.md` and fill every section before scheduling.
3. Add the task to `REGISTRY.md` with its Routine ID once scheduled.
4. Each run appends to the task file's Run Log and ends with exactly one final-output status.

One capacity per task. Never fabricate visual data. Do not manufacture an action when none
is warranted. This is SPEC v2's `SEARCH → READ → REUSE → UPDATE` rule, and it is the same
rule as Executive OS §4 (artifact-first continuity) applied to task definitions.

---

## 🧬 What this repo is

A npm-workspaces monorepo: **four private planning tools + one shared backend**, plus the
`Khu-el` GitHub profile README.

```
packages/governance-core/   Shared types + UI + API client (@nte/governance-core)
packages/neterverse-kernel/ Control-plane kernel (@nte/neterverse-kernel) — has tests
apps/deal-architect/        Real-estate deal intelligence
apps/capital-readiness/     Entity & offering-readiness diligence
apps/notes-underwriting/    Distressed-debt / note underwriting
apps/legacy-estate/         CCRLT / House of Ransom family estate (Lane B, shared workspace)
server/                     Express + SQLite backend shared by all four
web/landing/                Static landing page published to GitHub Pages
.neterverse/                Claude Code ↔ Codex collaboration bus — read its README first
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
npm test                        # the kernel suite — the only tests in this repo
npm run bus -- status           # what the control plane knows
npm run bus -- validate         # is .neterverse/ state still valid
```

Per-app `npm run build` runs `tsc -b --noEmit && vite build` — **type errors fail the
build**, so run a build (or `typecheck`) before pushing.

**Where tests exist, and where they do not:**

| Workspace | Test runner |
|---|---|
| `packages/neterverse-kernel` | ✅ `node --test` — run it with `npm test` from the root |
| `packages/governance-core`, the four apps, `server/` | ❌ none configured |

**No linter is configured anywhere in this repo.** In a workspace with no runner, do not
claim ✅ on "tests pass" — there is nothing to run, so say what you actually ran. In
`packages/neterverse-kernel` there is something to run, so run it.

⚠️ This table is scoped deliberately, not a claim about the whole repository forever. A
workspace may arrive with its own runner and its own `CLAUDE.md`; check the workspace you
are actually in before concluding either way. Reporting "no tests" where tests exist is
the same failure as reporting ✅ where they were never run.

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

## 🧾 One evidence vocabulary, three spellings

Three vocabularies now describe the same idea in this repo. They are **not** three
different concepts — map, do not multiply. Where they disagree, the strictest reading wins.

| Executive OS (§1, §8) | SPEC v2 `EVIDENCE` | `governance-core` `AssertionStatus` |
|---|---|---|
| ✅ VERIFIED COMPLETE / 🟢 STRONG | `VERIFIED` | `EXTERNALLY_VERIFIED` |
| 🟡 MODERATE — from our own systems | `SYSTEM-RECORDED` | `CURRENT_INTERNAL_MODEL` |
| 🟡 MODERATE — stated by the principal | `USER-REPORTED` | `CURRENT_INTERNAL_MODEL` |
| 🟠 TENTATIVE — a document says so | `DOCUMENT-STATED` | `DOCUMENT_CLAIM` |
| 🟠 TENTATIVE — we reasoned to it | `INFERRED` | `CURRENT_INTERNAL_MODEL` *(flag the inference)* |
| ❓ UNKNOWN / ⚪ | `UNKNOWN` | `UNCLASSIFIED` |

**⚠️ Two gaps, deliberately left visible rather than papered over:**

- `PROFESSIONAL_REVIEW_REQUIRED` has **no SPEC v2 equivalent.** A scheduled task that
  surfaces something needing an attorney, CPA, or licensed professional should say so in
  its `🚨 EXCEPTION CONDITIONS` and escalate — not tag it `INFERRED` and move on.
- `SUPERSEDED` has **no SPEC v2 equivalent.** SPEC v2 handles supersession at the *task*
  level (`REPLACED` in its kill/merge rule), not at the *claim* level. A superseded claim
  inside a still-active task has nowhere to go in that vocabulary.

Neither gap is a defect in SPEC v2 — it governs task definitions, not record-level claims.
They are recorded here so the next person doesn't assume the mapping is total.

## 🚀 Deployment

Frontends → GitHub Pages via `.github/workflows/deploy-pages.yml` (runs on push to `main`;
served at the account root because the repo is `Khu-el/Khu-el`). Backend → `server/Dockerfile`
+ `fly.toml`, portable to any Docker host. Secrets (`JWT_SECRET`, SMTP, `CORS_ORIGINS`) are
set on the platform — **never committed**. Full walkthrough is in `README.md`.
