# 🗂️ Claude Project Definition — `CP-CCRLT-001`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-CCRLT-001` |
| 🏷️ Name           | Legacy & Estate — CCRLT (Lane B) |
| 🧑‍💼 Capacity      | `CCRLT` 🔵 PROPOSED — see CAPACITY below |
| 🛣️ Lane           | `LANE_B` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `DRAFT` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `CONFIDENTIAL` |

## 🎯 MISSION

Maintain the **Legacy & Estate** app — the CCRLT / House of Ransom family-estate coordination tool
— and hold the Lane B context that work on it needs: assets, beneficiaries, distributions,
documents, insurance, the continuity archive, and the Business Interests bridge that references
Lane A without merging into it.

This project exists primarily to be a **container with a wall around it**. Lane B work needs
somewhere to happen that is not the Lane A commercial workspace, and a Claude Project is the only
place in this account where that separation can be made structural rather than remembered.

## 🧑‍💼 CAPACITY

`CCRLT` — 🔵 **PROPOSED**, not settled.

The capacity table offers two plausible codes, and SPEC v2 forbids blending them:

- **`CCRLT`** — the Christopher Chaz Ransom-El Living Trust: the revocable living trust whose
  estate this app administers.
- **`HOR`** — House of Ransom / Family Church: the trustee of that trust, and the Lane B code.

`CCRLT` is proposed because the app's subject matter is the *estate being administered* — assets,
beneficiaries, distributions, insurance — rather than the trustee's own ministry operations. If
the principal intends this workspace to cover House of Ransom activity generally rather than the
trust's estate specifically, the correct code is `HOR` and this project should be reissued under a
new ID with this row marked `REPLACED`.

🔵 PROPOSED marks a design choice awaiting a decision. Per `AI_COUNCIL.md` §9 it takes no
confidence icon and must not be rendered as though it were a finding about the world.

**What is not in doubt:** the lane. This is `LANE_B`, and nothing below may be loaded into a Lane A
project regardless of how the capacity question resolves.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **The three Lane A apps and their deal, entity or note records.** `CP-NTE-002` holds those. The
  Business Interests tab records a *reference* to a Lane A interest; it is not an import channel,
  and this project is not one either.
- **Commercial release-gate material.** `CP-DIGP-001`, Lane A.
- **Control-plane governance work.** `CP-NTE-001`. The estate app consumes the governance
  vocabulary; it does not shape it.

## 📝 DESCRIPTION

Lane B family-estate coordination: the Legacy & Estate app for CCRLT and House of Ransom. Private
by design — assets, beneficiaries, distributions, documents, insurance and continuity, kept
structurally separate from every Lane A workspace.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are working in Lane B, on the CCRLT / House of Ransom family estate. Treat everything here
as CONFIDENTIAL.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md, docs/AI_COUNCIL.md, and the repo layer in
CLAUDE.md. Where they appear to disagree, the stricter reading wins. A task-specific instruction
from the principal overrides all of them.

THE LANE BOUNDARY IS THE FIRST RULE. Lane A and Lane B never auto-connect. Do not pull Lane A
deal, entity, note or commercial material into this project, and do not carry anything from here
into a Lane A conversation. The Business Interests registry records a REFERENCE to a Lane A
interest — never a merge, and never a copy of the Lane A record. If a request would cross the
lane, say so and stop. Sharing a monorepo, a backend and a component library with the Lane A apps
is a hosting fact, not a data relationship.

SCOPE. apps/legacy-estate and the parts of packages/governance-core and server/ it depends on.
The other three apps are Lane A and are not edited from here.

EVIDENCE, AND THE REASON IT MATTERS MOST HERE. An internal document asserting something is a
DOCUMENT_CLAIM, not an EXTERNALLY_VERIFIED fact. Never let a family record, a trust instrument or
a schedule of assets render as verified because it exists. Where something needs an estate
attorney, a CPA or another licensed professional, mark it PROFESSIONAL_REVIEW_REQUIRED and say so
plainly — that status exists precisely because a scheduled-task vocabulary has no equivalent for
it and the gap must stay visible. Never claim that an internal document by itself establishes
verified legal status, tax treatment or creditor protection.

APPROVAL BOUNDARY — READ THIS ONE LITERALLY. These stay human-controlled unless expressly
authorized for that exact action: amending a trust, retitling an asset, changing a beneficiary,
filing or recording anything, signing, transferring money, contacting any third party, or
representing the principal externally. The app has no code path for automatic trust amendment,
asset retitling or beneficiary change, and none may be added. The backend can email only the
signed-in user at their own address, and only when a human clicks. Consensus among contributors
is never authorization.

ONE ROLE CROSSES THE LANES, AND IT IS NOT A BRIDGE. A SYSTEM_ADMIN on the shared backend reads
and deletes every user's records in every app, across both lanes. That is why a role is assigned
by the deployment and never self-chosen: registration ignores a role in the body, PATCH
/api/auth/me refuses one with 403, and the only path to SYSTEM_ADMIN is BOOTSTRAP_ADMIN_EMAIL
set on the platform. Do not add a role field to a client form or an API promotion route. The
lane separation above is a data rule; this is the operational hole that would defeat it.

THIS REPOSITORY IS PUBLIC. apps/legacy-estate lives in a public repository. Never commit a
beneficiary name, an asset detail, a document title, an account identifier or any record content
into it. The app is the mechanism; the records belong in the running app's own storage, not in
source control. Screenshots and examples use obviously synthetic data.

VERIFICATION. Per-app build runs tsc -b --noEmit && vite build. There is no test runner for this
app and no linter. State what you actually ran.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Khu-el | CLAUDE.md | Repo layer, including the Lane A / Lane B non-connection rule | `PUBLIC` |
| Khu-el/Khu-el | docs/EXECUTIVE_OS.md | Controlling standard — §6 binding effect and §10 approval boundary both bite here | `PUBLIC` |
| Khu-el/Khu-el | docs/AI_COUNCIL.md | Controlling standard for collaboration and the evidence map | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/types.ts | Lane, AuthorityContext and AssertionStatus — where the lane boundary is expressed as a type | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/components/ | Shared UI primitives, including the badges that render assertion status | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/api/ | Backend client, auth and record sync | `PUBLIC` |
| Khu-el/Khu-el | apps/legacy-estate/src/ | The app itself — assets, beneficiaries, distributions, documents, insurance, continuity, business-interests bridge | `PUBLIC` |
| Khu-el/Khu-el | server/src/ | The shared backend, where the self-send-only and role boundaries are enforced in code | `PUBLIC` |
| Khu-el/Khu-el | server/test/ | The tests covering the two authorization boundaries, including role assignment | `PUBLIC` |
| Khu-el/Neterverse_DAO | docs/EXECUTIVE_OS.md | The same standard as held in the DAO repo — relevant because trust and estate concepts are modeled in both and terminology must stay consistent | `PUBLIC` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| Google Drive | The Lane B estate document set | System of record for trust instruments and estate documents. Reading is permitted; sharing a file is a publish action under §10 | `CONFIDENTIAL` |
| The running Legacy and Estate app | Its own stored records | The actual estate data lives in the app, not in the repository and not in this knowledge base | `CONFIDENTIAL` |
| claude.ai artifacts | The Legacy and Estate snapshot listed in CONNECTORS.md | A static snapshot of a past build. Private, like the workspace | `CONFIDENTIAL` |

### 🚫 Deliberately excluded

- **The three Lane A apps** — `apps/deal-architect`, `apps/capital-readiness`,
  `apps/notes-underwriting`. The defining exclusion of this project.
- **Actual estate records** — beneficiary names, asset schedules, document contents, account
  numbers. They are `CONFIDENTIAL` and belong in the app and in Drive. A knowledge base is a copy,
  and a copy of an estate record is a second place it can leak from. Load a specific document into
  a conversation when a specific task needs it; do not make it ambient.
- **`.neterverse/`, the kernel, and the scheduled-task registry** — control-plane material,
  `CP-NTE-001`.
- **`Public_Notice_Template.txt` from the DAO repo** — that is public-facing Lane A material. Its
  presence here would invite exactly the Lane A/B blend this project exists to prevent.

## 🔄 REBUILD TRIGGERS

- Any change to `apps/legacy-estate/src/`.
- Any change to `packages/governance-core/src/types.ts`, especially the `Lane` or
  `AssertionStatus` vocabularies.
- Any change to `server/src/` touching auth, email or role assignment.
- Any change to the controlling standards.
- **Resolution of the capacity question above.** That does not rebuild this project — it replaces
  it.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — and the capacity choice specifically needs the principal's decision |
| Evidence for the source list | Direct file listing and read of `Khu-el/Khu-el` at commit `5848e75`, this session. The Lane B designation is stated in `CLAUDE.md`, `README.md` and `.neterverse/state/ecosystem-state.json` — `EXTERNALLY_VERIFIED` as to the repository's own text. The `CCRLT` vs `HOR` capacity choice is 🔵 PROPOSED and rests on no evidence beyond the app's subject matter |
