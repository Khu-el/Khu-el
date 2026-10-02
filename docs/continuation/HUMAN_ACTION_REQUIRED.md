# 🙋 Human Action Required

**As of:** 2026-09-21 · **Contributor:** Claude Opus 5 (Claude Code)

Each item is blocked on something an automated session cannot do: a credential, a console
setting, a decision, or an action behind the §10 approval boundary. Everything that *could* be
completed without the human step has been.

---

## 1. ~~Enable GitHub Pages~~ — done 2026-09-23

> **Update 2026-09-23.** Pages is enabled with source GitHub Actions: the deploy run for the #18
> merge (`ed79826`) went green and published to **`https://khu-el.github.io/Khu-el/`** — not the
> account root this entry predicted; see the corrected note below. That first deploy served the hub
> but four blank apps, because they were built for `/deal-architect/` etc. and every asset 404'd
> under `/Khu-el/`. The workflow now takes the base path from `actions/configure-pages`.
>
> The original record follows, unchanged except where marked.

### Original record

| | |
|---|---|
| **Project** | Four NTE planning apps + hub |
| **Service** | GitHub Pages, `Khu-el/Khu-el` |
| **Exact blocker** | Every "Deploy web apps to GitHub Pages" run on `main` **since 2026-08-19** fails at `actions/configure-pages` with `Get Pages site failed … Not Found`. Pages has never been enabled for the repository. The four app builds themselves **succeed** — the failure is the publish step only. |
| **Exact action** | Open **Settings → Pages** on `Khu-el/Khu-el` and set **Source** to **GitHub Actions** (not "Deploy from a branch"). |
| **Where** | `https://github.com/Khu-el/Khu-el/settings/pages` |
| **Afterwards** | The next push to `main` publishes to `https://khu-el.github.io/`. *(Corrected 2026-09-23: `Khu-el/Khu-el` is a project site and publishes to `https://khu-el.github.io/Khu-el/`.)* |
| **Verify** | The "Deploy web apps to GitHub Pages" run goes green and the run summary shows a `page_url`. Load the URL and check all four apps and the hub render. |

⚠️ *(Corrected 2026-09-23.)* A `CNAME` file has no effect: GitHub ignores it when Pages publishes
from an Actions workflow. A custom domain is attached in **Settings → Pages → Custom domain** after
DNS resolves — see `docs/DOMAIN_NETWORK.md`. CI still refuses a committed `CNAME`, because one would
suggest a domain is attached when it is not.

---

## 2. ~~Decide PR #9~~ — superseded: the change is ported onto a current branch

> **Update 2026-09-22.** The principal asked for every workflow needing correction to be fixed.
> PR #9's six-line change (`actions: read`, and the Node 24 majors of checkout, setup-node,
> configure-pages, upload-pages-artifact and deploy-pages) is now carried by the
> `claude/github-repos-code-audit-dfdr4i` pull request, with each action's major verified to
> exist upstream and `actions: read` verified against `deploy-pages`' own use of the artifacts
> API. What remains is a human decision: **close PR #9 as superseded** once that pull request
> merges. Blocker #1 (enabling Pages in Settings) is unchanged and still gates any deploy.
>
> The original record follows, unchanged.

### Original record

| | |
|---|---|
| **Project** | Pages deploy workflow |
| **Exact blocker** | [PR #9](https://github.com/Khu-el/Khu-el/pull/9) reports `mergeable_state: dirty` — a **merge conflict** against current `main`. |
| **Why it matters** | Enabling Pages (#1) is necessary but **not sufficient**. Two further problems remain in `deploy-pages.yml` on `main`, and PR #9 is where they are fixed: `actions/deploy-pages@v4+` requires an `actions: read` permission the workflow does not grant, and checkout/setup-node/configure-pages/deploy-pages are on Node 20 majors GitHub is retiring. |
| **Exact action** | Either merge the base branch into `claude/fix-pages-deploy` and resolve the conflict, or authorize a session to redo the six-line change on a current branch. |
| **Why not done here** | This session's branch instruction confines commits to `claude/neterverse-continuation-audit-k0meuw`. Pushing to PR #9's branch was not authorized, and duplicating its change on another branch would create the competing change the continuity rule forbids. |
| **Verify** | PR #9 shows no conflict, and after #1 the deploy run reaches `deploy-pages` without a permission error. |

---

## 3. Resolve the two NTE Command Centers — PR #4 has now merged

| | |
|---|---|
| **Project** | NTE Command Center |
| **Exact blocker** | **PR #4 merged on 2026-09-21**, so `nte-command-center/` is now on `main` — while the separate private repository `Khu-el/NTE-Command-Center` also still exists. Their relationship is **⚪ UNKNOWN**; the repository has never been opened. |
| **Exact action** | Open `Khu-el/NTE-Command-Center`, compare it against `nte-command-center/` on `main`, then either archive the repository with a pointer to the directory, or record what the merged directory is missing if the repository turns out to be authoritative. |
| **Where** | `github.com/Khu-el/NTE-Command-Center` vs `nte-command-center/` on `main`. |
| **Afterwards** | One location is authoritative and the other says so, instead of two copies existing silently. |
| **Verify** | `docs/DOMAIN_NETWORK.md` names which holds the Command Center, and the non-canonical one is archived or annotated. |

⚠️ **This was recorded as something to settle before #4 merged, and it was not.** The duplication
is now realized rather than preventable. Anyone who finds the standalone repository has no way to
know whether it is superseded — which is the entire cost of a duplicate source of truth.

📌 **Push dates suggest, but do not establish, that the merged directory is the newer of the two.**
See `SOURCE_CONFLICTS.md` SC-03.

📎 **A side effect worth knowing:** `nte-command-center/` is deliberately **not** an npm workspace.
Root `npm test` and `npm run typecheck` do not reach it — its suite runs from `command-center.yml`
instead. `inventory.json` now records it under `non_workspace_projects` so the omission is visible
rather than silent.

---

## 4. Locate the five canonical registries

| | |
|---|---|
| **Exact blocker** | `MASTER-REGISTRY.md`, `NETWORK_BRAIN_MASTER_SOURCE.md`, `NETERVERSE_COMPLETE_NETWORK_MASTER_SOURCE.md`, `Neterverse_Network_Problem_Solution_Registry.xlsx` and `NTE_Financial_Project_Completion_Register_2026.xlsx` **exist in no attached repository.** They are presumed to live in Notion or Google Drive, neither of which was read. |
| **Exact action** | Say where each lives — a Notion page, a Drive folder, or a repository — or confirm it does not exist. |
| **Afterwards** | The portfolio can be reconciled *against the canonical registries*, which is what the directive asks for and what this audit could not do. |
| **Verify** | Each of the five resolves to a real location, or is recorded as ⚪ non-existent. |

📌 Until then, **no claim that the portfolio agrees with the master registry can be made
honestly.** See `SOURCE_CONFLICTS.md` SC-02.

---

## 5. Set `BOOTSTRAP_ADMIN_EMAIL` before deploying the backend

| | |
|---|---|
| **Project** | Shared Express/SQLite backend |
| **Service** | Fly.io (or any Docker host) |
| **Exact blocker** | Commit `71670bb` removed the ability to register as `SYSTEM_ADMIN`. The **only** remaining path is the single address in `BOOTSTRAP_ADMIN_EMAIL`, set on the platform. **Unset — the default — means no registration can ever produce an admin.** |
| **Address designated** | ✅ `khuel@excellencedistrict.org` — chosen by the principal, 2026-09-21. `USER-REPORTED`: a decision about intent, so no external verification applies. |
| **Exact action** | `fly secrets set BOOTSTRAP_ADMIN_EMAIL=khuel@excellencedistrict.org`, alongside `JWT_SECRET`, **then** register with that address. |
| **Where** | The deployment platform's secrets, **never a committed file.** Recording the address here is not setting it — `server/src/lib/env.ts` reads `process.env` at boot and nothing else. |
| **Afterwards** | That one account registers as `SYSTEM_ADMIN`; everyone else is a `FAMILY_COUNCIL_MEMBER`. |
| **Verify** | `GET /api/auth/me` returns `"role": "SYSTEM_ADMIN"` for that account and `FAMILY_COUNCIL_MEMBER` for a second test registration. |

⏳ **Cannot be done yet, and not for want of the value.** The backend has never been deployed —
`fly.toml` still carries its placeholder app name, and `docs/DOMAIN_NETWORK.md` records
`api.excellencedistrict.org` as *"Planned — backend not yet deployed"*. **There is no platform to
set a secret on.** This becomes a one-line step the moment blocker 6 is done, and until then it is
waiting on that, not on a decision.

✅ **Verified against this exact address**, by probe on the built server: registering
`khuel@excellencedistrict.org` returns `SYSTEM_ADMIN`, and matching is case-insensitive on both
sides — the address was supplied as `Khuel@…` and resolves identically. Four near misses all
return `FAMILY_COUNCIL_MEMBER`: `khuel@excellencedistrict.org.attacker.example`,
`xkhuel@excellencedistrict.org`, `khuel@excellencedistrict.com` and
`someone.else@excellencedistrict.org`.

📌 **On recording it in a public repository:** `khuel@excellencedistrict.org` is already committed
here in `docs/DOMAIN_NETWORK.md` and `docs/CONNECTORS.md`, so naming it again adds no disclosure.
It is also not a credential — knowing the address grants nothing without `INVITE_CODE` *and* the
ability to register. Say the word if you would rather this row read `<the designated address>` and
the value live only on the platform.

🟢 **This is not a regression** — it is the fix. Previously anyone holding the invite code could
register as an admin and read and delete every user's records. See `SECURITY_FINDINGS.md` SF-02.

---

## 6. Deploying the backend and attaching the domains

| | |
|---|---|
| **Exact blocker** | No Fly.io (or other host) credential is available to this session, and no DNS provider access. The `apps.` and `api.` records do not exist. |
| **Exact action** | The ordered walkthrough is already written — **follow `docs/DOMAIN_NETWORK.md`**, which has the record rows, the order, and the warning about leaving the Squarespace apex and Google Workspace MX alone. |
| **Afterwards** | `apps.excellencedistrict.org` and `api.excellencedistrict.org` resolve; `CORS_ORIGINS` then needs the real app origin. |
| **Verify** | `https://api.excellencedistrict.org/api/health` returns `{"ok":true,…}`, and the apps load over HTTPS from the `apps.` host. |

---

## 7. Publishing the DAO portal is a §10 decision

| | |
|---|---|
| **Project** | Neterverse Administration Trust DAO portal |
| **Exact blocker** | **Not technical.** `python3 scripts/check_page.py` passes, and the page is ready to serve. `Neterverse_DAO/CLAUDE.md` is explicit: *"Committing a draft ≠ authorization to publish it,"* and the page carries jurisdictional and ecclesiastical-standing claims. |
| **Exact action** | A human decision to publish, after the §7 red-team pass: *what would a regulator, court, bank, county recorder, or opposing attorney say about this sentence?* |
| **Afterwards** | Only then does hosting become a technical question. |
| **Verify** | A recorded release decision — **a green check is not a §10 release gate.** |

📌 Several links on the portal are honest `#` placeholders marked "coming soon". **Leave them
that way** until a real destination exists; pointing them somewhere plausible would turn a ❓ into
a ✅ (§1).

---

## 8. Re-create the ST-NTE-001 Routine with connectors attached

| | |
|---|---|
| **Project** | Scheduled task `ST-NTE-001` — Continuation Audit Drift Watch |
| **Service** | Claude Routines |
| **Exact blocker** | The Routine (`trig_012vVNu9cbBucVpWHAxYnQAe`) was created from a session with no passable connector grants, so **the sessions it fires run with no `mcp__*` tools at all**. The create call said so explicitly. |
| **What still works** | Fetching all three repositories, running every documented check, both registry validators, the inventory drift guard, and correcting the continuation documents. That is most of the task. |
| **What does not** | PROCESS step 5 — reconciling Routines against `REGISTRY.md` — needs the Routines API and **cannot run at all**. Step 7's PR and CI re-checks are partial: git still sees commits and branches, but PR state, review threads and workflow conclusions are unreachable. |
| **Exact action** | Re-create the Routine from a session holding the GitHub and Claude Code Remote connectors, or create it in the Routines UI on `claude.ai` with those connectors attached. Then delete `trig_012vVNu9cbBucVpWHAxYnQAe` and update the Routine ID in `docs/scheduled-tasks/REGISTRY.md` and in the task definition's header. |
| **Where** | `claude.ai` → Routines |
| **Afterwards** | Step 5 runs, and SC-07's orphan-Routine reconciliation becomes automatic instead of a standing ⚪ UNKNOWN. |
| **Verify** | A run reports a Routine count and names the unregistered ones, rather than recording ⚪ UNKNOWN for step 5. |

🟢 **Not urgent.** The task is genuinely scheduled and its first run on 2026-09-28 will do real
work. This raises its ceiling; it does not unblock it. **The run must report the connector-dependent
steps as ⚪ UNKNOWN rather than as passing** — that rule is written into the definition.

## 9. ~~Attach connectors to the ST-OTHER-001 Routine~~ — worked around 2026-10-02; optional hardening remains

| | |
|---|---|
| **Project** | Scheduled task `ST-OTHER-001` — Executive OS Network Integrity Watch |
| **Service** | Claude Routines |
| **What happened** | The first Routine (`trig_01BD3YpYapyhpN1pLMuv8rT1`) was created with no connectors, because `create_trigger` refused a `connectors` argument for this organization. It was disabled, then deleted. |
| **Workaround in place** | `trig_01QcstfQGZxqqARauciMntX8` is **session-bound**: it fires into the defining session, which holds Notion + ClickUp. It is live, with its first run on 2026-10-04 at 19:46 UTC. |
| **Remaining risk** | If that session is archived or its connectors are revoked, runs end 🧱 BLOCKED BY. |
| **Optional action** | In `claude.ai` → Routines, create a fresh-session Routine with Notion + ClickUp attached, using the same cron (`46 19 * * 0`) and the definition's PROCESS. Then delete `trig_01QcstfQGZxqqARauciMntX8` and update the ID in the definition and `REGISTRY.md`. |
| **Authority already given** | Notion + ClickUp grant, additive link edits, and the Sunday 15:46 ET cadence, all approved by the principal on 2026-10-02. |
| **Verify** | A `Network Integrity Watch — <date>` row appears in the Executive OS Knowledge Registry after each Sunday run. |

🟢 **Not urgent.** The automation is running. This only removes its dependence on one session.
---

## 10. Archive `Khu-el/NTE-Command-Center`

| | |
|---|---|
| **Project** | NTE Command Center — SC-03 |
| **Service** | GitHub |
| **Exact blocker** | Archiving a repository is an account action behind §10. The comparison SC-03 asked for is **done**: the repository was opened 2026-09-18 and is a superseded 2026-03-13 generation, holding nothing `nte-command-center/` on `main` lacks. |
| **Exact action** | Settings → General → Danger Zone → **Archive this repository**. Put a line in its README first: *"Superseded by `nte-command-center/` in `Khu-el/Khu-el`. Retained for history."* |
| **Where** | `https://github.com/Khu-el/NTE-Command-Center/settings` |
| **Afterwards** | SC-03 closes. Until then a reader who finds it has no way to know it is stale — which is the whole cost SC-03 names. |
| **Verify** | The repository shows the **Public archive** / **Archived** banner. |

🟢 **Low urgency, low cost, and it ends a standing conflict.** Consider `Khu-el/StructureGen`
(last commit 2025-12-21) at the same time — it is unrelated to both command centers and nothing
in the account references it.

---

## 11. ~~Populate the Notion entity and capacity registries~~ — premise invalid; reopened as SC-10

| | |
|---|---|
| **Project** | Entity governance — SC-08 |
| **Service** | Notion → `04.01 Entities Registry — NTE/CCRLT`, `04.02 Roles & Capacities Registry` |
| **Exact blocker** | Two things. **(a)** `docs/CONNECTORS.md` records Notion as `write_authorized: false` — reads are authorized, writes are not. **(b)** Four of the nine entity names are not settled (item 12), so a row written today would record a provisional name as though it were a decision. |
| **Why it matters most** | Both databases have complete, well-designed schemas and **zero rows.** That is the root cause of SC-08: four generations of entity names exist because the canonical list was never filled in, so every document re-typed one from memory. `04.01` even carries a `Source Basis` field whose options already encode this account's evidence discipline. |
| **Exact action** | Grant write authorization for these two databases specifically — not a blanket Notion write — and settle item 12. Then a session can populate `04.01` from `nte-command-center/seed/governance.json`, carrying each entity's `nameStatus` into `Source Basis` (`CONFIRMED` → `Documented`, `PROVISIONAL` → `Requires verification`). |
| **Afterwards** | A fifth naming generation becomes impossible: every downstream copy cites one row. |
| **Verify** | `04.01` returns nine rows; each `PROVISIONAL` name carries `Source Basis: Requires verification` rather than `Documented`. |

> ### ⛔️ Update 2026-10-02 — do not action items 11 and 12 as written
>
> The principal authorized the scoped write and confirmed all four names on 2026-10-02. **Neither was
> carried out.** Both rest on a premise that checking the live workspace disproved: the registry they
> name (`04.01`) no longer exists, and the registry that does exist is **already populated and
> maintained**, not empty. It also disagrees with two of the four confirmed names on what the entity
> *does* — `VEI` is a digital-services company there, not advisory; `NPE` is a private-equity
> company, not a publisher.
>
> `nte-command-center/CLAUDE.md` makes the direction of correction explicit: Notion is the system of
> record for registers, and *"the console is corrected from it, never the other way round."* So the
> seed is corrected from the registry, not the registry from the seed.
>
> **`SOURCE_CONFLICTS.md` SC-10 carries the full comparison and the four questions that must settle
> first.** The write authorization stands and is recorded in `connector-registry.json`; it is on hold,
> not withdrawn.

⚠️ **Do not let this be done as a bulk paste of the April 2026 Notion names.** Those are the third
of four generations — see SC-08's table. `seed/governance.json` is the controlling source.

📎 **Related but not the same task — do not merge them.** `ST-OTHER-001` (Executive OS Network
Integrity Watch) already runs weekly against Notion and already holds the connectors. It maintains
the **navigation layer** — which index page links to which command center — and its definition is
explicit that it reads registry *metadata* only and never reasons over record contents. Populating
`04.01` with entity rows **is** record content, so it belongs to a capacity that may write them,
not to `OTHER:SYSTEMS`. The overlap worth using is narrower: that task is already looking at these
registries weekly, so it is the cheapest place to **notice** `04.01` is still empty and say so.

📌 **One authorization fact to confirm rather than assume.** `ST-OTHER-001` writes additive
navigation links to Notion, while the connector registry records Notion as `write_authorized:
false`. Either the flag is stale or that task's writes are a scoped exception. Whichever it is,
it is the principal's to state — a session must not infer a broader write grant from the existence
of a narrower one.

---

## 12. ~~Confirm or reject four provisional entity names~~ — two of the four are contradicted by the system of record

| | |
|---|---|
| **Project** | Entity governance — SC-08 |
| **Service** | — a decision, not a system |
| **Exact blocker** | `nte-command-center/seed/governance.json` marks four of nine entity names `PROVISIONAL`, each with a stated reason. Only the principal can confirm a name. |
| **Exact action** | For each, confirm the recommendation or supply the correct name: |

| Code | Recommended name | Why it is unsettled, per the source |
|---|---|---|
| `VEI` | **Advisory Inc.** | *"The prior name reads as an investment vehicle to lenders and regulators."* |
| `OPS` | **Operations & Systems Inc.** | *"Recommended, not confirmed. The determination was a hybrid across two naming sets."* |
| `NPE` | **Publishing & Education Inc.**, with a digital and AI division | *"Recommended as one entity with a division, not split into a second entity."* |
| `QVI` | **Quantum Vault Inc.** | *"The enforcement reading of this entity collides with an excluded line and was rejected."* |

| | |
|---|---|
| **Afterwards** | Item 11 unblocks, and `seed/governance.json` can flip those four to `CONFIRMED`. |
| **Verify** | No entity in `seed/governance.json` carries `nameStatus: PROVISIONAL`. |

📎 **A second, smaller naming question rides along.** Sources disagree on whether the Lane B trust
is the *Christopher Chaz Ransom **Living Trust*** or the *Christopher Chaz Ransom-**El** Living
Trust*. Only the trust instrument settles it, and no session has read one. On an instrument naming
the trust as a party this is not cosmetic.

---

## 13. Decide whether `Neterverse.tech` comes under this repository's boundary

| | |
|---|---|
| **Project** | Network governance — SC-09 |
| **Service** | — a decision |
| **Exact blocker** | Notion records `Neterverse.tech` as **Live**, on its own hostname, with its own Postgres, object storage and card payments. `docs/DOMAIN_NETWORK.md` and `docs/CONNECTORS.md` both claimed completeness and neither mentioned it. |
| **Why it matters** | The boundary enforced here — invite-only, self-send-only, no money movement — lives in `server/` and `packages/neterverse-kernel/src/risk.ts`. A separate platform inherits none of it. `move_money`, `transact` and `purchase` are `HUMAN_ONLY_ACTIONS` here; there, card payments are the product. |
| **Exact action** | Choose one: **(a)** bring it onto the map and under the boundary, which means a lane, a risk tier, an owning automation engine and a connector row each for its data store, object storage and payment processor; or **(b)** record it as a deliberately separate network with its own governance, and narrow both files' scope sentences to say so. |
| **Afterwards** | SC-09 closes. Both files now carry a flagged section, so the gap is visible either way — but a flag is a description of a problem, not a decision. |
| **Verify** | Neither file claims to cover "every property" while a live property sits outside it. |

🟡 **Both options are defensible. The current state — unmapped and unmentioned — is the one that
is not.** No change was made to `Neterverse.tech` and none is proposed; this is about what these
two files claim.
