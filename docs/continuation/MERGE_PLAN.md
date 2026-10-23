# Merge plan — network desk branch

**Branch:** `cursor/nte-network-desk-b973` **Base:** `main` **This file does not push, open a PR, or merge.**

The Lane B extraction branch is not part of this merge. See `LANE_B_EXTRACTION.md` on `cursor/lane-b-extraction`.

## Before anything is published

1. `git switch cursor/nte-network-desk-b973`
2. `git status` — the work tree should be clean.
3. `npm run gate` — required pre-merge check (`AGENTS.md`). It runs tests, typecheck, the network-desk build, ESLint, and the doctrine scan. Stop if it exits non-zero.
4. Read `REVIEW-2026-10-22.md`. Open items R4-04 through R4-09 stay open on purpose.

## Push and open a draft PR

Chaz runs these. This session does not.

```bash
git push -u origin cursor/nte-network-desk-b973
gh pr create --draft --base main --head cursor/nte-network-desk-b973 \
  --title "NTE network desk" \
  --body "Draft. Local gate is npm run gate. Do not merge until the review in docs/continuation/REVIEW-2026-10-22.md is accepted. Merging starts the Fly deploy, which fails while FLY_API_TOKEN is unset."
```

Leave the PR in draft. Do not enable auto-merge.

## What a merge to main starts

Merging the draft into `main` is a push to `main`.

| Workflow | Trigger from this branch | Effect |
|---|---|---|
| `.github/workflows/verify.yml` | The pull request, and again on the push to `main` | `npm test`, typecheck, build, bus checks, projects, tasks, inventory, connectors. It does not deploy. |
| `.github/workflows/deploy-pages.yml` | Push to `main` | Builds the static apps, including `apps/network-desk`, and publishes GitHub Pages. It does not build the removed estate app. |
| `.github/workflows/fly-deploy.yml` | Push to `main` that changes `server/**`, `fly.toml`, or that workflow | Deploys the Express server to Fly. This branch changes `server/**`, so the workflow runs. Its first step exits if the `FLY_API_TOKEN` Actions secret is empty. The message in the workflow names the missing secret. The health-check job does not run when that step fails. |

`workflow_dispatch` on the Fly workflow is also limited to `main`. Running it from this branch does not deploy this branch.

No file under `.github/workflows/` or `fly.toml` was edited for this plan.

## Recommended order

1. Finish the local gate and read the review.
2. `deploy-pages.yml` on `cursor/remove-lane-b-estate` no longer builds the removed estate app. Chaz approved that workflow edit on Oct 23, 2026. `fly.toml` and `fly-deploy.yml` stay unchanged.
3. Push this branch and open the draft PR. Wait for `verify.yml`.
4. Decide the Fly secret before merge. The deploy is currently failing on a missing `FLY_API_TOKEN` (see `docs/continuation/HUMAN_ACTION_REQUIRED.md`). Set that Actions secret if a deploy should succeed. If it is still unset, merging still starts the workflow, and the workflow fails closed at the token check. The Pages publish is a different workflow and does not need that token.
5. Set production `JWT_SECRET`, `INVITE_CODE`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_SECRET` using `ADMIN_BOOTSTRAP.md` when the Fly app is actually receiving secrets. Do not put those values in the PR.
6. Merge only after Chaz approves the draft. Pages publish and the Fly workflow then run on their own.

## Rollback after a merge

`git revert` the merge commit on `main`, or revert the individual commits from newest to oldest. Do not force-push `main`. A revert that touches `server/**` starts the Fly workflow again.
