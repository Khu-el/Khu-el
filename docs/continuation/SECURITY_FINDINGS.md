# 🔐 Security Findings

**As of:** 2026-09-21 · **Contributor:** Claude Opus 5 (Claude Code) · **Scope:** `Khu-el/Khu-el`
`server/` and `packages/governance-core`. The four Vite apps, `Neterverse_DAO` and
`Mental-Alchemy` were reviewed but produced no finding.

Both findings below are **fixed, tested, and pushed** on
`claude/neterverse-continuation-audit-k0meuw`. Each was confirmed by probing the built server
*before* any change, and re-probed after.

**No secret was found committed in any of the three repositories.** `npm run bus -- audit` — which
scans committed control-plane state for emails, tokens, key material and record identifiers —
passes, and `.gitignore` covers `data/`, `dist/` and `.neterverse/live/`. No credential appears
in this document.

---

## SF-01 — 🔴 High — Bearer token accepted from the query string on every route

**Status:** ✅ Fixed in `e87367d` · **Regression cover:** 11 tests + `npm run check:query-token`

### What was wrong

`requireAuth` read the token from `?token=` on **every** route it guarded. Its own comment said
*"Everything else must use the header"*, and the client helper that builds such a URL said the
server accepts it *"for this one route."* Both descriptions were right about the intent and
wrong about the code.

### Evidence — probed before the fix

With **no `Authorization` header at all**, a bare URL carrying `?token=` returned:

| Route | Pre-fix | Post-fix |
|---|---|---|
| `GET /api/attachments/:id/download` | `200` | `200` ✅ intended |
| `GET /api/records` | `200` 🔴 | `401` |
| `GET /api/records/:id/attachments` | `200` 🔴 | `401` |
| `GET /api/auth/me` | `200` 🔴 | `401` |
| `POST /api/memo/pdf` | `200` 🔴 | `401` |
| `POST /api/digest/send` | `200` 🔴 | `401` |
| `DELETE /api/attachments/:id` | `200` 🔴 | `401` |
| `DELETE /api/records/:id` | `200` 🔴 | `401` |

### Why it mattered

A JWT in a URL is not equivalent to one in a header. It is copied into **access and proxy logs,
browser history, and the `Referer` of any outward link**. These tokens last **30 days**, so one
leaked log line was a month of access — and before this fix, access to *everything*, not to one
file. On a state-changing route it also meant a bare cross-origin `<img>` or link could carry
it, which a header never can.

### The fix

`requireAuth` now reads the header only. `requireAuthAllowingQueryToken` is the exception, mounted
on the single route that cannot do without it — `GET /api/attachments/:id/download`, which a
plain `<a href>` hits. The blanket `attachmentsRouter.use(requireAuth)` was replaced with
per-route middleware, so adding a route no longer inherits someone else's auth decision.

`scripts/check-query-token.mjs` keeps the exception at one route. It was verified to fail on all
four shapes the regression takes: the exception added to another route, mounted on a whole
router, a route reading `req.query.token` directly, and the allow-list going stale.

---

## SF-02 — 🔴 Critical — Anyone with the invite code could register as `SYSTEM_ADMIN`

**Status:** ✅ Fixed in `71670bb` · **Regression cover:** 12 tests

### What was wrong

Registration read `role` **straight from the request body**, and `PATCH /api/auth/me` let any
signed-in user set their own. Either reached `SYSTEM_ADMIN`, which `canAccess` treats as access
to every record in every app **regardless of owner, across both lanes**.

The registration form in `AuthGate.tsx` offered `SYSTEM_ADMIN` in a dropdown, so this was the
**documented path, not an obscure one**.

### Evidence — probed before the fix

```
POST /api/auth/register  {"role":"SYSTEM_ADMIN", …, "inviteCode":"<the invite code>"}
  → 201, user.role = SYSTEM_ADMIN

With that token, against a *second* user's private deal-architect record:
  GET    /api/records?appId=deal-architect → 200, record listed with its contents
  DELETE /api/records/:id                  → 204   🔴 deleted
```

### Why it was critical rather than merely wrong

**The invite code is the *shareable* credential.** It gates registration and is meant to be
handed out — `env.ts` generates one short enough *"to read out loud"* and prints the value itself
to the logs. It was also, in effect, the admin credential. Anyone invited to use one planning
tool could read and delete every other user's records in all four, including the Lane B estate
records.

### The fix

Roles come from `assignRoleAtRegistration`: everyone is a `FAMILY_COUNCIL_MEMBER` except the
single address named by `BOOTSTRAP_ADMIN_EMAIL`, **set on the deployment platform beside
`JWT_SECRET`**. Unset — the default — means no registration can produce an admin at all, which is
the fail-closed reading the rest of this server takes. Promotion beyond that is a database change
by whoever operates the deployment, deliberately **not** an API operation.

`PATCH /me` refuses a `role` with `403` rather than ignoring it, so a caller that believes it
changed one is told otherwise. The client no longer sends a role it cannot set, and the role
picker is gone from the registration form — leaving it would have shown a control that silently
did nothing.

### Verified after

Registration asking for `SYSTEM_ADMIN` returns `FAMILY_COUNCIL_MEMBER`; self-promotion returns
`403` and leaves the role unchanged; display name still updates; and with `BOOTSTRAP_ADMIN_EMAIL`
set, the named address registers as admin while lookalikes
(`owner@example.test.attacker.example`, `xowner@example.test`) do not. Matching is
case-insensitive and whole-string.

➡️ **`BOOTSTRAP_ADMIN_EMAIL` must be set before the backend is deployed**, or no admin account
can be created. See `HUMAN_ACTION_REQUIRED.md` #5.

---

## Not findings — reviewed and accepted

Recorded so the next reviewer does not re-open them.

| Observation | Why it is not a finding |
|---|---|
| Any invited user can read **and overwrite** every `legacy-estate` record | Deliberate: `legacy-estate` is a documented shared family workspace (`roles.ts`, `CLAUDE.md`). Verified by probe; Lane A apps stay private per owner. Recorded as `SOURCE_CONFLICTS.md` SC-06 for **awareness**, since one invite code admits someone to all estate records. |
| `JWT_SECRET` and `INVITE_CODE` auto-generate and persist to disk when unset | Guarded, documented, and warned about on stdout. `.env.example` is explicit that both must be set for any real deployment. Files are written `0o600` under a gitignored `data/`. |
| The invite-code comparison uses `timingSafeEqual` but returns early on length mismatch | Standard and acceptable: the length of an invite code is not the secret, and the constant-time compare covers the value. |
| Uploaded files are stored under a random UUID with the extension truncated to 20 chars | Prevents path traversal and collision; the original name is kept in the database for display only. |
| `bus -- status` shows `6 LIVE_VERIFIED` beside `6 never observed` | Not contradictory. `verification_state` records a past read; live health is computed from the gitignored `.neterverse/live/`. The registry says so itself. |
