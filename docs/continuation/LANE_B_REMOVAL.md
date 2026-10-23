# Lane B estate removal

**As of:** 2026-10-23 (America/New_York) · **Branch:** `cursor/remove-lane-b-estate` · **Base:** `origin/main` at `d25416f` · **Status:** draft. Do not merge.

Khu-el/Khu-el is public and is NTE / Lane A only. Estate administration now lives in the private repository `House-of-Ransom/house-of-ransom-estate` at commit `335d84d`. This file is the inventory of what left this repository, what stayed, and why.

This work did not open `server/data`, any database, or any record body. It did not edit `fly.toml`, `fly-deploy.yml`, or any workflow other than the estate steps in `deploy-pages.yml` and the estate mention in `verify.yml`. It did not rewrite git history.

## Git history

Git history on `main` still contains the estate app, the estate roles, and the names this branch removes from the tree. Rewriting that history is a separate decision for Chaz. This branch does not force-push and does not rewrite history.

## Removed

### App

The whole workspace `apps/legacy-estate/` (package `ccrlt-legacy-estate`):

- `apps/legacy-estate/index.html`
- `apps/legacy-estate/package.json`
- `apps/legacy-estate/postcss.config.js`
- `apps/legacy-estate/tailwind.config.js`
- `apps/legacy-estate/tsconfig.json`
- `apps/legacy-estate/vite.config.ts`
- `apps/legacy-estate/src/App.tsx`
- `apps/legacy-estate/src/main.tsx`
- `apps/legacy-estate/src/index.css`
- `apps/legacy-estate/src/store.ts`
- `apps/legacy-estate/src/store.test.ts`
- `apps/legacy-estate/src/types.ts`
- `apps/legacy-estate/src/components/AssetsTab.tsx`
- `apps/legacy-estate/src/components/BeneficiariesTab.tsx`
- `apps/legacy-estate/src/components/BusinessInterestsTab.tsx`
- `apps/legacy-estate/src/components/ContinuityArchiveTab.tsx`
- `apps/legacy-estate/src/components/DigestTab.tsx`
- `apps/legacy-estate/src/components/DistributionsTab.tsx`
- `apps/legacy-estate/src/components/DocumentsTab.tsx`
- `apps/legacy-estate/src/components/InsuranceTab.tsx`
- `apps/legacy-estate/src/components/OverviewTab.tsx`

Root `package.json` no longer has `dev:legacy-estate` or that workspace in the typecheck list. `package-lock.json` no longer links `apps/legacy-estate` or `node_modules/ccrlt-legacy-estate`. `server/Dockerfile` no longer copies that app's `package.json`. `docs/continuation/inventory.json` was regenerated.

There was no separate shared estate package. Estate types and the estate store lived inside `apps/legacy-estate`. Shared helpers that other apps still import were kept (see below).

### Command-center module used only by the estate surface

- `nte-command-center/src/modules/family-office/index.tsx`
- `nte-command-center/src/modules/family-office/ledger.ts`
- `nte-command-center/seed/family-office.json`
- The registry import of that module in `nte-command-center/src/core/registry.ts`
- The module 07 cases in `nte-command-center/tests/household.test.tsx`

`lifeops` (lane-a and lane-b instances, and `seed/lifeops-lane-b.json`) stays. It is a dual-surface module, and the seed does not name the removed house.

`nte-command-center` is not an npm workspace and is not part of `npm run gate`. Its tests were not executed here (no `node_modules` in that folder).

### Definitions that existed only for the estate

- `docs/claude-projects/projects/CP-CCRLT-001.md` — retired. Do not reuse the id. Next `CCRLT` id is not issued from this repository.
- `docs/scheduled-tasks/tasks/ST-HOR-001.md` — retired. Do not reuse the id. `HOR` next id stays `ST-HOR-002` (`docs/scheduled-tasks/REGISTRY.md`). `HOR` in `scripts/scheduled-tasks.mjs`, `SPEC.md`, and `TEMPLATE.md` remains as a reserved capacity so the retired id cannot be handed out again. Estate work is not defined here.

### Server behavior that existed only for the estate

- `legacy-estate` removed from `APP_IDS` in `server/src/lib/roles.ts` and `packages/governance-core/src/api/types.ts`.
- `isSharedApp()` now returns false for every id. No app is a shared workspace. Records, attachments, and the digest stay owner-scoped through the existing `owner_id` checks in `server/src/routes/records.ts`, `server/src/routes/attachments.ts`, and `server/src/routes/digest.ts`.
- The digest no longer walks estate beneficiary rows. `server/src/lib/digest-logic.ts` still covers deal diligence, capital offering readiness, CRM follow-up, and the notes lien checklist. `recordLabel` no longer reads a family-name field.
- `TWO_YEARS_MS` was only the estate beneficiary window. It left `digest-logic.ts`. The shared staleness helpers stayed.

### Roles and environment variables

Removed from the role catalogue (`server/src/lib/roles.ts` and the matching labels in `packages/governance-core/src/api/types.ts`):

- `FAMILY_COUNCIL_MEMBER`
- `HOUSE_TRUSTEE_OFFICE`
- `HOUSE_AUTHORIZED_REP`

`HOUSE_TRUSTEE_EMAILS` and `HOUSE_AUTHORIZED_REP_EMAILS` were not present in application code or in `fly.toml`. Nothing in this branch had to delete a live env binding. `fly.toml` was not edited.

Unset registration assigns `PROFESSIONAL_REVIEWER` (`DEFAULT_INVITE_ROLE`). It can write its own records and cannot read another account. Chaz confirmed this default on Oct 23, 2026.

`server/src/lib/db.ts` sets the SQLite column default to `PROFESSIONAL_REVIEWER`. That default applies to new databases created with this schema. It does not migrate an existing database.

## What stayed, and why

Shared by Lane A and the lane model. Deleting these would break Network Desk, the NVS agent desk, auth, or the release gate.

| Path | Why it stays |
|---|---|
| `packages/governance-core/src/types.ts` `Lane`, including `LANE_B` | Lane vocabulary for every governed record. A bridge is still how a lane crossing is named. This repo does not host Lane B records. |
| `packages/governance-core/src/components/Badges.tsx` | Renders the lane enum. Label is now `Lane B`. |
| `packages/neterverse-kernel/src/lane.ts` and `src/types.ts` | Lane firewall. Crossing into Lane A still requires an express instrument. Tests unchanged. |
| `packages/neterverse-kernel/src/connectors.ts` | ClickUp `lane_scope` is `LANE_A` and `LANE_B`. Google Drive is `LANE_A`, `LANE_B`, and `PERSONAL`. Generated `.neterverse/state/connector-registry.json` matches. Changing scope would be a connector-policy edit, not an estate-app deletion. |
| `.neterverse/schemas/*.json` | Bus schemas enumerate the same lane vocabulary. |
| `server/src/routes/records.ts`, `attachments.ts`, `digest.ts` | Lane A planning apps and the CRM. Owner scope remains. |
| `server/src/lib/staleness.ts` and `packages/governance-core/src/verification.ts` | Shared date rule. The two copies must agree. Comments no longer say the estate app. |
| `server/src/network/logic.ts` | Network Desk refusal list. It must name what it refuses. See the grep exceptions below. |
| `server/test/network.test.ts` | Proves a refused lane and a refused brand. |
| `nte-command-center/src/core/firewall-terms.mjs` | Practice-surface blocklist. Shared firewall, not the estate app. |
| `packages/nvs-agent-desk/` | Lane A agent desk. `CCRLT_HOR` and `FAMILY` were removed from its lane union. Other lanes (`HOPE_PRIMERICA`, `LICENSED_PRACTICE`, `EMPLOYER`, and the rest) stay. |
| `nte-command-center` `lifeops` and the lane-b surface id | The firewall still has three surfaces. Only the estate-only office module was removed. |
| `docs/forms/trust-stewardship-intake.html` and `docs/forms/README.md` | Held offline instrument. It is not the estate app, it is not published, and it does not name the removed house, the removed capacity token, or the living trust. Left in place. |
| `PROFESSIONAL_REVIEWER`, `SYSTEM_ADMIN`, `NTE_*`, `READ_ONLY_AUDITOR` | Lane A role catalogue. Bootstrap admin and `MINISTRY_OPERATOR_EMAILS` are unchanged. |
| Network Desk, auth, release gate, sample approver | Lane A. Sample approver still cannot publish. `POST /api/network/queues/:id/act` still returns 403. |

`LANE_B` in Executive OS, Claude Project templates, and scheduled-task capacity tables stays as a lane or reserved capacity. The estate project and the estate bulletin do not.

## Grep exceptions

Required search: `legacy-estate`, `FAMILY_COUNCIL`, `HOUSE_TRUSTEE`, `HOUSE_AUTHORIZED_REP`, `House of Ransom`, `CCRLT`, `Living Trust`.

These files are the only allowed matches. This inventory is one of them, because it has to name what was removed.

| File | Why the string remains |
|---|---|
| `docs/continuation/LANE_B_REMOVAL.md` | This inventory. |
| `server/src/network/logic.ts` | Refusal list and error text. `AUTHORITY.excluded` names the house, the living trust, and private family records. `REFUSED_LANES` includes `CCRLT` and `CCRLT_HOR`. `assertMinistryLane` refuses those lanes. |
| `server/test/network.test.ts` | Asserts lane `House of Ransom` is 403 and brand `House of Ransom` is 400. |
| `nte-command-center/src/core/firewall-terms.mjs` | `ENTERPRISE_TERMS` includes `CCRLT` and `House of Ransom` so the practice surface cannot render them. |
`FAMILY_COUNCIL`, `HOUSE_TRUSTEE`, and `HOUSE_AUTHORIZED_REP` appear only in this file. After Chaz's Oct 23, 2026 approval, `.github/workflows/deploy-pages.yml` and `.github/workflows/verify.yml` no longer name the removed app. `fly.toml` and `fly-deploy.yml` were not edited.

## Before this can merge

1. No estate export is required. Chaz confirmed on Oct 23, 2026 that there is no estate data in production. This branch still does not migrate or delete rows, and this work did not open a database.
2. Accounts stored as `FAMILY_COUNCIL_MEMBER`, `HOUSE_TRUSTEE_OFFICE`, or `HOUSE_AUTHORIZED_REP` fail closed. `toPublicUser` and `authenticate` reject a role that is no longer in the catalogue. This work did not read or update those rows.
3. The pull request stays a draft until Chaz says to merge. `fly.toml` was not changed. A green local `npm run gate` does not deploy and does not show that `FLY_API_TOKEN` is set.
4. `PROFESSIONAL_REVIEWER` is the confirmed default registration role (Chaz, Oct 23, 2026).

## Rollback

Close the draft pull request, or revert the commit on this branch. Do not merge to undo it. History on `main` is unchanged until a merge.
