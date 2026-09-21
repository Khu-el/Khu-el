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

## SF-03 — 🟠 Medium–High — One browser, one record cache, shared by every account

**Status:** ✅ Fixed in this branch · **Regression cover:** 17 tests

### What was wrong

`useSyncedRecords` mirrors the server's records into `localStorage` so the apps still render
offline. The key was a **fixed string per app** — `nte-deal-architect:deals`,
`ccrlt-legacy-estate:estates` — shared by everyone who signed in on that browser. All four apps
passed a literal constant.

`logout()` clears the token and the user. **It does not clear the cache.**

### The sequence

1. User A signs in, works in Deal Architect. Their records are cached.
2. A signs out. `AuthGate` unmounts the app; the cache stays on disk.
3. User B signs in on the same browser. `AuthGate` mounts the app, which reads the same key and
   **renders A's records immediately**, before any request completes.
4. If the server is unreachable, B keeps seeing them — under the caption *"showing your last
   saved copy."*

### Why it matters

`deal-architect`, `capital-readiness` and `notes-underwriting` are **private per owner** — the
server will not serve one user another's records, which is exactly what makes the local copy a
leak. `legacy-estate` is a shared workspace, so much of it B may legitimately see; the other
three are a straight cross-account exposure of private deal terms, cap tables and obligor
records.

📌 This needs no attacker — two family members sharing a laptop is the whole scenario.

### The fix

The cache key is now scoped to the signed-in account, and `userId` is a **required** parameter,
so a new call site cannot omit it without a type error. Opening a cache also purges any other
account's copy of it — including the old unscoped key, which is precisely the shared cache this
retires — so a shared machine does not keep records at rest that its current user cannot see.

The helpers are plain functions over a `Storage`-shaped object (`src/api/cacheKey.ts`), so they
are tested without a DOM: key scoping and separation, the old shared key being treated as
foreign, other apps and unrelated keys left alone, near-miss keys (`…:dealsX`) not matched,
storage that throws on read or refuses writes, and the full A-signs-out-B-signs-in sequence.

⚠️ **Scope, stated honestly:** this fixes the cache. It does not add a general logout-time purge
of every app's storage, and a signed-out user's own cache still sits on the disk until someone
else signs in. Both are reasonable next steps and neither is done here.

---

## SF-04 — 🟠 Medium — An unreadable verification date read as *verified*

**Status:** ✅ Fixed in this branch · **Regression cover:** 46 tests across both copies

### What was wrong

The estate app flags a beneficiary designation not verified in two years, and the server's
"Needs Attention" digest emails the same finding. **Both** implemented the rule as:

```js
Date.now() - new Date(dateStr).getTime() > twoYearsMs
```

An unparseable date gives `NaN`, and **every comparison against `NaN` is false** — so the
designation reported as *current*. The empty string was handled; nothing else that is not a date
was.

### Evidence — probed before the fix

| Stored value | Old result | Meaning |
|---|---|---|
| `""` | stale ✅ | handled |
| `"2020-01-01"` | stale ✅ | correct |
| `"31/12/2019"` | **not stale** 🔴 | a plausible thing to type — reads as verified |
| `"TBD"` | **not stale** 🔴 | reads as verified |
| `"unknown"` | **not stale** 🔴 | reads as verified |
| `"2019-13-45"` | **not stale** 🔴 | reads as verified |

### Why it matters

This is a **fail-open on the one safety check the feature exists for**, on estate data. A
designation last checked in 2019 but written `31/12/2019` showed as current in the UI **and** was
omitted from the digest — the two places a person would otherwise have caught it. That is an
UNKNOWN presenting as a ✅, which §1 rules out.

📌 The server reads these straight from stored JSON, so the value is whatever a client sent — not
necessarily what a `<input type="date">` produced.

### The fix

`stalenessReason()` resolves to stale on every branch unless a real instant says otherwise, and
names *which* problem: `missing`, `unparseable`, `in-the-future`, `expired`. The wording follows —
an unreadable date no longer claims to be "2+ years old", which would be inventing a fact.

A date slightly ahead of now is tolerated as timezone skew (a date input records a calendar day
with no timezone); well beyond that it is a typo like the year 20250, and a verification that has
not happened cannot evidence that it has.

⚠️ **The rule is duplicated** — `packages/governance-core/src/verification.ts` and
`server/src/lib/staleness.ts` — because `server/` has no dependency on the React-facing
`governance-core`. That duplication is what let one bug live in two places. **A test now asserts
the two copies agree on 14 inputs**, so changing one without the other fails rather than
silently diverging.

Verified that the suites catch the original: reinstating the old comparison fails **10 of 20** in
`governance-core` and **5 of 26** in the server.

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
