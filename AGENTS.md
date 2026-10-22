# NTE Network Desk

This file is the operating guide for the ministry network desk. The rest of the monorepo is governed by `CLAUDE.md`. Where they differ on a safety boundary, the stricter reading wins.

The desk is `apps/network-desk` plus `/api/network` on the shared Express server. It is a local prototype. It does not publish, send, spend, or call a provider.

## Lane and authority

Records are stored in lane `NTE_MINISTRY`. The internal model names Equity of the Divine Ministries as trustee for NTE affairs and Chaz Khu El as Minister / authorized representative. No tax classification is asserted for NTE; working position held pending written counsel confirmation. That model is `CURRENT_INTERNAL_MODEL` and is not marked legally verified by this software.

House of Ransom, the Living Trust, and private family records are refused. Sample rows are labeled `SAMPLE` and use `@example.test` addresses.

## Roles

Registration assigns a role from deployment configuration. A `role` field on `POST /api/auth/register` is ignored. `PATCH /api/auth/me` returns 403 when a role is present.

| Setting | Role |
|---|---|
| Unset | `FAMILY_COUNCIL_MEMBER` |
| `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_SECRET` | `SYSTEM_ADMIN` for that one address, once |
| `MINISTRY_OPERATOR_EMAILS` | `NTE_SYSTEMS_OPERATOR` for each listed address |

The invite code alone cannot create `SYSTEM_ADMIN`. A missing or wrong `BOOTSTRAP_ADMIN_SECRET` returns 403 and inserts no row. A second admin returns 409. An unset secret fails closed. Registration rejects an untrimmed email and stores the trimmed lowercase form. `GET /api/auth/users` includes `role` only for `SYSTEM_ADMIN`.

Production boot throws if `JWT_SECRET` or `INVITE_CODE` is missing. The process does not log the invite value.

`NTE_SYSTEMS_OPERATOR` does not read another account's network rows. `SYSTEM_ADMIN` can read them and cannot write into another account. `READ_ONLY_AUDITOR` cannot write.

## Evidence labels

A person may record `USER_REPORTED`, `DOCUMENT_STATED`, `INFERRED`, or `UNKNOWN`. `VERIFIED` and `SYSTEM_RECORDED` are rejected. At risk means an open dependency, no evidence, or `UNKNOWN` evidence. It is not a score.

## Release boundary

Pipeline stages are `brief`, `artifact`, `qa`, `release_review`, `content_handoff`, `marketing_handoff`. Leaving release review requires an approval whose hash matches the artifact. The proposer cannot approve their own proposal. A different signed-in account can. The labeled sample approver (`SAMPLE · Approver (prototype)`) can approve only a sample item, through `POST /api/network/pipeline/:id/approve-sample`. Approval sets `published: false`. Handoff packets stay `draft` with `sent: false`. Campaigns stay drafts. Finance, insurance, legal, and debt queue items stay drafts; `POST /api/network/queues/:id/act` returns 403.

Integration states `verified` and `error` are reachable only after a probe that contacted the provider. This server does not mount that probe. A check leaves the state unchanged and reports `contacted: false`.

## Routes

All `/api/network` routes require an `Authorization` bearer header. `?token=` is rejected.

`POST /api/attachments/:id/grant` returns a 60-second token scoped to that attachment. `GET /api/attachments/:id/download` accepts that grant in `?token=` or the session bearer header. A session JWT in the query is refused.

- `GET /health`
- `GET /repository-status`
- `GET /rollups`
- `GET /export?format=json` and `GET /export?format=csv`
- `GET` and `POST /projects`, `PATCH /projects/:id`
- `GET` and `POST /projects/:id/tasks`, `PATCH /tasks/:id`
- `GET` and `POST /pipeline`
- `POST /pipeline/:id/advance`, `/propose-release`, `/approve`, `/approve-sample`
- `GET` and `POST /leads`, `/assets`, `/campaigns`
- `GET /integrations`, `POST /integrations/:provider/configure`, `POST /integrations/:provider/check`
- `GET` and `POST /queues`, `POST /queues/:id/act`
- `GET /events`
- `POST /ledger/checkpoint`, `GET /ledger/verify`
- `POST /samples`

The page is Home, Command, Pipeline, Leads, Brand, Integrations, and Ledger. The eight-branch shell, Document Factory, and doctrine records are not in this repository and are not invented here.

## Ledger anchor

Each account write appends one JSON line to `network-ledger-checkpoints.jsonl` under `NTE_DATA_DIR` (by default `server/data`, which is gitignored). The line stores the chain head hash, the event count, and a timestamp. It does not copy record bodies.

`GET /api/network/ledger/verify` compares that file with the caller's chain. After `npm run build --workspace=server`, `npm run ledger:verify --workspace=server` checks every local chain. A tampered event hash fails both.

## Demo

1. Export `INVITE_CODE` in the environment. Do not commit it. `npm run dev:server` and `npm run dev:network-desk`. Open `http://127.0.0.1:5179/`.
2. Register. Load labeled sample records.
3. On Command, read the dependency graph and the at-risk list. Export JSON or CSV for this account only.
4. On the sample pipeline, move to release review and propose. "Approve as this account" is refused. "Approve as SAMPLE actor" records the other local account and does not publish.
5. For a non-sample item, sign in as a second registered account and approve with the proposal id and hash. That account's project list stays empty.
6. Home lists `@nte/nvs-agent-desk` and the apps as present in the repo. Runtime is not checked.

`.cursor/environment.json` installs with `npm ci` and starts the API and the desk. It forwards `INVITE_CODE` only when the environment already has it.
