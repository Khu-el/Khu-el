# Admin bootstrap runbook

No value is generated, printed, or stored in this file. Names only.

The code reads process environment variables at boot (`server/src/lib/env.ts`). It does not read a secret from the request except the one registration field below. Unit tests set their own fixtures in `server/test/helpers.ts` and do not use a real secret.

## What the code reads

| Name | Required for production boot | Effect |
|---|---|---|
| `JWT_SECRET` | Yes, when `NODE_ENV` is `production` | Signs session tokens (30 days) and attachment download grants (60 seconds). Missing in production throws and the process does not listen. Missing in development writes a generated file under the data directory and logs the path, not the value. |
| `INVITE_CODE` | Yes, when `NODE_ENV` is `production` | Shared registration code. Missing in production throws. Missing in development writes `data/.invite-code` and logs the path, not the value. |
| `BOOTSTRAP_ADMIN_EMAIL` | No | Trimmed and lowercased. The one address that may register as `SYSTEM_ADMIN`. Unset means no registration can produce an admin. |
| `BOOTSTRAP_ADMIN_SECRET` | No | Second check for that admin registration. Unset, empty, or wrong fails closed. The process still boots. |

`BOOTSTRAP_ADMIN_SECRET` has no minimum length and no character class in code. Any non-empty string is compared as raw bytes. Leading or trailing spaces are part of the value; the code does not trim it. An empty string is treated as unset. `isValidBootstrapSecret` returns false before the constant-time compare when the submitted length differs from the stored length.

`BOOTSTRAP_ADMIN_EMAIL` is trimmed and lowercased. The submitted email must already be free of leading and trailing spaces (`canonicalEmail` returns 400 otherwise) and must equal that address after lowercasing.

## Registration request

`POST /api/auth/register` with a JSON body.

| Field | Rule |
|---|---|
| `email` | String containing `@`. No leading or trailing spaces. Stored trimmed and lowercase. |
| `password` | String, at least 8 characters. |
| `displayName` | Non-empty string. Stored trimmed. |
| `inviteCode` | Must match `INVITE_CODE`. Otherwise 403. |
| `bootstrapAdminSecret` | Exact field name. Required only when the email is the bootstrap admin address. Not a header. |

There is no `role` field that works. A role in the body is ignored on register. `PATCH /api/auth/me` returns 403 if `role` is present.

Outcomes when the email matches `BOOTSTRAP_ADMIN_EMAIL`:

- Secret missing, empty, or wrong: **403** `Bootstrap admin secret is missing or wrong`. No user row is inserted.
- Secret matches and no `SYSTEM_ADMIN` row exists: **201**. The new row's role is `SYSTEM_ADMIN`.
- A `SYSTEM_ADMIN` row already exists: **409** `A system admin already exists`. No second admin is inserted.
- The same email already has an account: **409** `An account with that email already exists`.

Any other email, even with a correct admin secret, registers as the default role. The secret is not consulted for that address.

## Generate and store

1. On a machine you control, run `openssl rand -base64 32`. That is one strong value. Put it in a password manager. Clear the shell scrollback. Do not commit it, do not paste it into this repository, and do not put it in `.cursor/environment.json` or `server/.env.example`.
2. Generate distinct values the same way for `JWT_SECRET` and `INVITE_CODE` if they are not already stored. The invite code is the one you are willing to share with people who may register. The admin secret and the JWT secret are not.
3. Cursor Secrets, for a cloud agent or a dev session that should see them: add environment secrets whose names are exactly `BOOTSTRAP_ADMIN_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `JWT_SECRET`, and `INVITE_CODE`. The process reads those names from the environment. The unit suite overwrites them with fixtures, so it does not need the real values. A local shell that is not the unit suite can `export` the same names for that shell only.
4. Fly, later, when you choose to deploy: from a logged-in Fly client, set the same four names with `fly secrets set`. Do not run that from an untrusted log. This repository does not contain the command with a value filled in. The Actions secret `FLY_API_TOKEN` is a different name and is not an admin password. See `MERGE_PLAN.md`.

The address that should be `BOOTSTRAP_ADMIN_EMAIL` is the one already chosen in `HUMAN_ACTION_REQUIRED.md`. This runbook does not repeat a new address.

## Register once

After the four names are present in the environment that is actually serving:

1. Start the server so it reads the new environment. A running process does not see a secret that was set after it booted.
2. `POST /api/auth/register` as above, using the bootstrap email and `bootstrapAdminSecret`.
3. Confirm `GET /api/auth/me` with the returned bearer token shows `SYSTEM_ADMIN`.
4. Register a second, non-admin address and confirm it is not `SYSTEM_ADMIN`.
5. Repeat the admin registration and confirm **409**.

## Rotate

1. Generate a new `BOOTSTRAP_ADMIN_SECRET` the same way. Replace it in the password manager, in Cursor Secrets, and in Fly secrets. Restart or redeploy so the process loads it.
2. The existing admin row stays. The old secret can no longer create an admin. The code has no route to change that account's password or to appoint a second admin.
3. Replacing `JWT_SECRET` invalidates session tokens and download grants. People sign in again.
4. Replacing `INVITE_CODE` blocks new registrations that use the old code. Existing accounts remain.
5. Do not write the old or the new value into a commit, a review comment, or a log line you paste back into the repo.
