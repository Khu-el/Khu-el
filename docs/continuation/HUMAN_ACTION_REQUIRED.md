# 🙋 Human Action Required

**As of:** 2026-09-21 · **Contributor:** Claude Opus 5 (Claude Code)

Each item is blocked on something an automated session cannot do: a credential, a console
setting, a decision, or an action behind the §10 approval boundary. Everything that *could* be
completed without the human step has been.

---

## 1. Enable GitHub Pages — unblocks the entire frontend deployment

| | |
|---|---|
| **Project** | Four NTE planning apps + hub |
| **Service** | GitHub Pages, `Khu-el/Khu-el` |
| **Exact blocker** | Every "Deploy web apps to GitHub Pages" run on `main` **since 2026-08-19** fails at `actions/configure-pages` with `Get Pages site failed … Not Found`. Pages has never been enabled for the repository. The four app builds themselves **succeed** — the failure is the publish step only. |
| **Exact action** | Open **Settings → Pages** on `Khu-el/Khu-el` and set **Source** to **GitHub Actions** (not "Deploy from a branch"). |
| **Where** | `https://github.com/Khu-el/Khu-el/settings/pages` |
| **Afterwards** | The next push to `main` publishes to `https://khu-el.github.io/`. |
| **Verify** | The "Deploy web apps to GitHub Pages" run goes green and the run summary shows a `page_url`. Load the URL and check all four apps and the hub render. |

⚠️ **Do not add a `CNAME` file to the repository to speed this up.** It takes effect on merge and
takes the site offline if the DNS record does not resolve yet. The workflow writes `_site/CNAME`
from the `PAGES_CUSTOM_DOMAIN` repository variable instead. CI fails the moment a `CNAME` is
committed.

---

## 2. Decide PR #9 — it carries the rest of the Pages fix and is conflicted

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
