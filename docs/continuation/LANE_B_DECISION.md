# Lane B flag — decision for Chaz

**As of:** 2026-10-22 (America/New_York) · **Contributor:** Cursor cloud agent · **Scope:** code inspection only

This is a decision item. It is not a mandate to move, delete, or open family records. No SQLite database was queried. No record body was read. Nothing was moved or deleted.

## What the code does

| Question | Finding | Evidence |
|---|---|---|
| Does `apps/legacy-estate` hold a Lane B workspace? | Yes. The app calls itself a shared family workspace and sets new estates to lane `LANE_B`. | `apps/legacy-estate/src/App.tsx` (“Shared family workspace — invite only. Lane B only.”); `apps/legacy-estate/src/store.ts` `createEstate` sets `authority.lane` to `LANE_B` with empty collections. |
| Does `FAMILY_COUNCIL_MEMBER` reach that workspace? | Yes. It is the default registration role, and `canWrite` is true for it. | `server/src/routes/auth.ts` `assignRoleAtRegistration`; `server/src/lib/roles.ts`. |
| Is the workspace private per account? | No. `legacy-estate` is the only shared app. Any signed-in user who can write can read and change every `legacy-estate` row, not only rows they created. `SYSTEM_ADMIN` can also read them. The other apps, including `financial-services-crm`, stay private per owner. | `server/src/lib/roles.ts` `isSharedApp`; `server/src/routes/records.ts` `canAccess`, `canMutate`, and the list query that drops the owner filter for a shared app. |
| Does the network desk store Lane B? | The desk refuses lane values `LANE_B`, `FAMILY`, `CCRLT`, and House of Ransom labels on its own routes. That refusal does not apply to `apps/legacy-estate`. | `server/src/network/logic.ts` refused-lane set. |
| Are family records committed in this repo? | No seed database, workbook, or CSV of estate records is in `apps/legacy-estate`. Unit fixtures in `server/src/lib/digest-logic.test.ts` use synthetic labels, including “House of Ransom” and “Ransom”, to exercise digest text. Those fixtures are not accounts. | Directory listing of `apps/legacy-estate` and the digest test file. |
| Do live rows exist in the local database? | ⚪ UNKNOWN. `server/data` is gitignored. It was not opened. | Not inspected, on purpose. |

The digest route also selects every `legacy-estate` row when building a signed-in user’s digest (`server/src/routes/digest.ts`). That is the same shared-workspace rule, not a second store.

## Decision asked

Chaz decides whether this stays as it is:

1. `FAMILY_COUNCIL_MEMBER` remains the default invite role and keeps read/write on the shared `legacy-estate` workspace.
2. That workspace remains on the same Express server and SQLite file as the Lane A network desk, with sharing implemented only by `isSharedApp('legacy-estate')`.
3. No rows are moved or deleted unless a later instruction says so.

Until that decision, this file records the split. It does not authorize a data migration.
