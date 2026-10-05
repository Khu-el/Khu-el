# ADR-0004 — The Excellence District member portal runs on Supabase, beside `server/`, not instead of it

> **Status:** 🔄 ACCEPTED · **Date:** 2026-10-03
> **Lane:** `LANE_A` · **Entity:** The Excellence District · **Capacity:** Minister / Authorized Representative
> **Risk tier:** R2 for this decision. It adds a new member-facing surface whose launch is a human step.
> **Builds on:** ADR-0003, which it corrects in one place.
> **Decided by:** the principal, 2026-10-03. They chose option B, "build it out completely" (`USER-REPORTED`).
> The design and the wording below are Claude Code's.

---

## 🎯 Context

ADR-0003 left one question open. A second Supabase project, "The Excellence District Production",
was active, and its relationship to the SQLite backend in `server/` was ⚪ UNKNOWN. ADR-0003
framed the risk as "two backends for the same apps". Reading the project answered the question:

- **What it is (`SYSTEM-RECORDED`, read 2026-10-03 through the Supabase connector).** A
  member-portal schema: profiles, learning progress, saved resources, opportunity blueprints,
  30-day action plans, support requests and notifications. It also has a content catalog (four
  learning tracks and four opportunity pathways, no lessons yet) and an `integration_status`
  registry. Six migrations from 2026-09-21 built it.
- **Who uses it.** There are zero users and no client in any repository. It is a scaffold.
- **What else it contains.** Twenty `neterverse_*` tables, a dormant third control plane.
  ADR-0003 already chose one job store, and it is not this project.
- **One defect.** Its one edge function, `delete-account`, reads a claim the library does not
  set, so it would return 401 to every caller.

So the project does not serve the five planning apps. It is a different product with different
users. The real question was whether to build that product, and the principal decided to build it.

---

## 🧭 Decisions

### 1. Two backends, two audiences, no overlap

| | `server/` (Express + SQLite) | The Excellence District Production (Supabase) |
|---|---|---|
| Serves | The four planning tools and the Financial Services CRM | `apps/member-portal` only |
| Users | The principal and invited operators | Invited community members, plus staff |
| Auth | Invite code + JWT issued by `server/` | Supabase Auth, invite-gated by a database trigger |
| Gate | Route middleware (`requireAuth`) | Row-level security on every table |

**This corrects ADR-0003's framing.** It is not "two backends for the same apps", and it never
becomes that: no planning app or CRM reads Supabase, and the portal never calls `server/`. A
member is never a CRM contact by being a member. Any future bridge between the two records a
*reference*, never a merge. This is the same rule as Lane A and Lane B.

### 2. The repository holds the schema, never the project

The baseline migrations and the hardening migration live in `apps/member-portal/supabase/`.
Their headers carry no project ref, URL or key. The client reads the URL and the publishable key
from build-time variables (`ED_SUPABASE_URL`, `ED_SUPABASE_PUBLISHABLE_KEY`, set as GitHub
repository Variables). Both are public by design: the publishable key is meant for browsers, and
RLS is the gate. With neither set, the build still succeeds and the portal shows "not connected".
It never falls back to a guessed project.

### 3. Registration is invite-only and fails closed at the database

This follows the same rule as `server/` in `CLAUDE.md`.

- A `BEFORE INSERT` trigger on `auth.users` refuses any sign-up without a valid invite. Valid
  means a pending, unexpired, unrevoked invite for that exact email, plus the matching code.
- The code is 18 hex characters, single-use, and expires after 14 days. Only a bcrypt hash is
  stored, and the code is stripped from the user's metadata before the row is written.
- A staff admin issues invites with `create_signup_invite(email)`. It returns the code **once**
  and sends nothing. The admin passes it on themselves.
- There is no bypass, including for the owner. The first staff member is seeded by SQL that the
  principal runs (HUMAN_ACTION_REQUIRED).

Why a code and not just an allow-list of emails: an email-only allow-list lets anyone who knows
an invited address register it first. That is a pre-account takeover.

**Accepted residual risk: sign-up shows an anonymous caller whether an address is registered.**
Supabase Auth looks an address up before it inserts a user. A sign-up for an address that already
has an account never reaches the trigger and gets an ordinary response (200 when email
confirmation is on), and for a confirmed member nothing is emailed. A sign-up for an address with
no account and no valid invite is refused by the trigger, which Supabase reports as a 500. Before
the trigger, both returned 200. So anyone holding the public key can test whether an address
belongs to a portal member. The bcrypt comparison also runs only when an invite exists for the
address, a smaller timing signal for a pending invite. The generic 500 hides only *which* invite
condition failed; it is not anti-enumeration. What leaks is membership of the portal, not account
access or record content, and Supabase Auth's rate limits slow bulk probing. This is 🟠 `INFERRED`
from how Supabase Auth handles an existing address; it has not been tested here.

Two ways to narrow it, neither done yet:

- **CAPTCHA on sign-up** (Authentication → Attack Protection). The app does not yet render a
  CAPTCHA widget or send a token, so turning it on before that work would block sign-up, and
  likely sign-in and password reset too. It is a follow-up, not a launch step.
- **Sign-up behind an Edge Function** that checks the invite, creates the user with the admin
  API, and returns one identical response whatever the outcome, with the trigger kept as the
  fail-closed backstop. Worth doing if membership itself has to stay private.

### 4. Roles are assigned by the deployment

The four roles are support (triage), editor (adds content), admin (adds invites) and owner. The
principal sets them in SQL. No client form or RPC sets a role, which is the same rule as
`server/`.

- A `private.staff_seed` row seeds a role. A trigger applies it **once**, when that email's
  account is created.
- After that, the live role is the `public.staff_members` row, which every role check reads.
  Nothing syncs the seed afterwards: editing or deleting a seed row changes no one's role, and a
  seed row added for an email that already has an account grants nothing.
- So a later change, removal or grant for an existing account is made directly in
  `public.staff_members` with SQL. The README has the exact statements, under "Changing staff
  roles later".

No sync trigger on `private.staff_seed` was added. If one ever is, it must key on a stored user
id, never on the current `auth.users.email`, because a member can change their email to a seeded
address.

### 5. Nothing sends

The portal sends no email, SMS or push, and does not post or contact anyone. Two cases:

- **Supabase Auth** sends sign-up confirmation and password-reset mail, only to the address the
  member typed, and only when they ask.
- **Staff updates.** When staff change a support request's status or note, a trigger writes an
  **in-app** notification. Nothing leaves the portal.

The preference toggles say plainly that nothing is connected to them yet.

### 6. The `neterverse_*` tables are archived, not dropped

The hardening migration moves all twenty tables to a `legacy_neterverse` schema and revokes
every client grant. It deletes no rows. ADR-0003 already chose the job store, so this is
housekeeping, not a second decision.

### 7. Content is educational, staff-reviewed, and unpublished until reviewed

Lessons are plain-text bodies. A small parser renders them as headings, paragraphs and lists, and
no HTML is ever interpreted. Twelve starter lessons ship as `is_published = false` drafts that
Claude Code wrote for staff review. They give no advice and make no income claims.

---

## ⚖️ Consequences

- ✅ The open question in ADR-0003 is closed. Its text is left as written and this ADR supersedes
  that one bullet.
- ✅ The portal reuses `@nte/governance-core` UI primitives and the workspace's build, test and
  deploy wiring.
- ⚠️ **Live state has drifted from the repository until the principal applies the hardening
  migration.** The project currently grants `anon` and `authenticated` broad table privileges and
  has no sign-up gate. Until the migration runs, **nobody should be given the portal link**,
  because sign-up would be open. Claude Code could not apply or dry-run it: both were refused as
  production changes, and it was not tested against a local Postgres either. The migration is
  written, not verified (🟠 `INFERRED`).
- ⚠️ The Supabase free plan auto-pauses an idle project. It already happened once, 2026-09-29.
  A paused project means the portal is down.
- ⚠️ Auth email needs custom SMTP. Supabase's default sender only mails members of the org team.
- ⚪ Whether this portal is the community's intended front door, or one of several, is the
  principal's call. This ADR records what was built, not a launch.

## 🧾 HUMAN_ACTION_REQUIRED (in order)

1. Apply `20261003030000_member_portal_hardening.sql`. Then, after review and if wanted,
   `20261003031000_starter_lessons.sql`.
2. Deploy the corrected `delete-account` function.
3. Configure custom SMTP, and set Auth → URL Configuration: the Site URL is the portal's Pages
   path, and the redirect URLs cover `https://khu-el.github.io/Khu-el/**`.
4. Set the two repository Variables and redeploy Pages.
5. Seed the first staff member, and invite that email, by SQL. Then sign up in the deployed
   portal with that email and code.
6. Only then share the link with anyone.

The exact steps are in `apps/member-portal/README.md`.
