# 🏛️ The Excellence District — Member Portal

An invite-only portal for community members. It offers:

- **Learning tracks** with lessons, and **resources** members can save.
- **Opportunity pathways**: a member names a goal and gets matched to a pathway.
- **30-day action plans** built from that goal.
- **Support requests** and **in-app notifications**.

Staff have a console for invites, support triage and content.

It runs on Supabase ("The Excellence District Production"). It does **not** use `server/`, and
`server/` does not use it. Why it is built this way, and what it never becomes, is in
[`ADR-0004`](../../.neterverse/decisions/ADR-0004-member-portal-on-supabase.md).

```
src/
  App.tsx            Session → onboarding → pages; hash routes (#/learn, #/plans/<id>, …)
  data/api.ts        Every database call. Nothing else talks to Supabase.
  logic/             Pure, tested: pathway matching, plan dates, progress, invites, errors,
                     lesson-body parsing, routes
  pages/             Member pages
  staff/             Staff console: invites · support triage · content studio
supabase/
  migrations/        The baseline schema (2026-09-21) + hardening + draft starter lessons
  functions/         delete-account (corrected source)
test/                node --test, type-stripped, over src/logic and src/config
```

## ⚙️ Running it

```bash
npm run dev:member-portal                  # from the repo root
npm test --workspace=apps/member-portal
```

For local development, put `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in
`apps/member-portal/.env.local`. That file is gitignored. Without them, the app renders a "not
connected" page instead of guessing a project.

## 🛡️ Boundaries

These are the same rules as the repo `CLAUDE.md`, applied here.

- **Row-level security is the only gate.** The browser holds a publishable key, so every rule a
  member must not bypass lives in the database, never only in the UI. The UI's role checks are
  courtesy; the policies and functions are enforcement.
- **Registration is invite-only and fails closed.** A trigger on `auth.users` refuses any sign-up
  that does not have a valid invite. A valid invite is pending, unexpired and unrevoked, for that
  exact email, with the matching code. There is no bypass, including for the owner.
- **Roles are assigned by the deployment.** Roles come only from `private.staff_seed`, which the
  principal writes in SQL. No form, RPC or profile field sets one.
- **Nothing sends.** The portal never sends email, SMS, push or posts, and never contacts anyone.
  Two things look like sending and are not:
  - Supabase Auth's confirmation and reset mail goes only to the address the member typed.
  - Invite codes are shown once to the staff admin, who passes them on themselves.
  - Staff updates on a support request become an *in-app* notification.
- **Lesson bodies are text.** `logic/text.ts` parses headings, paragraphs and lists. No HTML is
  ever interpreted (`dangerouslySetInnerHTML` is not used anywhere). Links open only if they are
  `http(s)`.
- **Educational content only.** Lessons give no financial, legal, tax or investment advice, and
  make no income claims.

### ⛔ Do not build

- Bulk email, newsletters, SMS, or any feature that sends a message from the portal.
- Payments, subscriptions, or anything that holds account, card or identity-document data.
- Self-service role changes, or an "admin" toggle on a client form.
- A sign-up path that skips the invite, including "just for testing".
- Reading or writing `server/`'s database, or importing members into the Financial Services CRM.
  The two record a reference at most, never a merge.

## 🧾 Launch runbook — HUMAN_ACTION_REQUIRED

Claude Code wrote everything below but **could not run any of it**. The production project is
outside what a session may change. Do the steps in order, and **do not share the portal link
before step 1**. Until the hardening migration runs, the live project has no sign-up gate.

1. **Apply the hardening migration.** Open the project in Supabase, then **SQL Editor**.
   - Paste and run `supabase/migrations/20261003030000_member_portal_hardening.sql`.
   - The SQL editor sends it as one multi-statement query, which Postgres runs as a single
     transaction, so a failure part-way should apply nothing. That is 🟠 inferred from how Postgres
     treats such a query, not tested here. Read any error before re-running.
   - It moves the twenty `neterverse_*` tables into `legacy_neterverse` and deletes no rows.
   - Read `20261003031000_starter_lessons.sql` too. It adds twelve **unpublished** draft lessons.
     Run it if you want them as a starting point.
2. **Deploy the corrected `delete-account` function.**
   - Go to **Edge Functions → delete-account**, replace its source with
     `supabase/functions/delete-account/index.ts`, and deploy.
   - Keep **Verify JWT** off; the function checks the caller itself.
   - The deployed version reads a claim that does not exist, so it returns 401 to everyone.
3. **Configure Auth.**
   - **Authentication → Emails → SMTP Settings:** turn on custom SMTP. Supabase's built-in sender
     only delivers to members of your Supabase team.
   - **Authentication → URL Configuration:**
     - Site URL: `https://khu-el.github.io/Khu-el/member-portal/`
     - Redirect URLs: `https://khu-el.github.io/Khu-el/**`, plus `http://localhost:5173/**` for
       local development.
   - **Authentication → Sign In / Providers:** leave **Allow new users to sign up** on. The invite
     trigger is the gate, and turning sign-ups off would block invited members too.
4. **Seed the first staff member and invite them.** Run this in the SQL editor with your own
   address. It prints the invite code once.

   ```sql
   insert into private.staff_seed (email, role) values ('you@example.org', 'owner')
     on conflict (email) do update set role = excluded.role;

   with c as (select encode(extensions.gen_random_bytes(9), 'hex') as code),
   ins as (
     insert into private.signup_invites (email, code_hash, expires_at)
     select 'you@example.org', extensions.crypt(code, extensions.gen_salt('bf')), now() + interval '14 days' from c
     on conflict (email) do update
       set code_hash = excluded.code_hash, expires_at = excluded.expires_at,
           created_at = now(), revoked_at = null
       where private.signup_invites.consumed_at is null
     returning email
   )
   select ins.email, c.code from ins, c;
   ```

   Sign up in the portal with that email and code. Your account becomes `owner`, and every later
   invite comes from **Staff → Invites**.
5. **Point the build at the project.** In GitHub, go to **Settings → Secrets and variables →
   Actions → Variables** and set:
   - `ED_SUPABASE_URL`: the project URL, `https://<ref>.supabase.co`.
   - `ED_SUPABASE_PUBLISHABLE_KEY`: the `sb_publishable_…` key from **Project Settings → API Keys**.

   Both are public by design. Then re-run **Deploy web apps to GitHub Pages**.
6. **Watch the free plan.** An idle free project is paused automatically, and a paused project
   means the portal is down. It already happened once, on 2026-09-29.

## 🧪 What is tested, and what is not

- ✅ `npm test` covers `src/logic/*` and `src/config.ts`: pathway matching and stemming, plan dates
  and progress, invite-code and email rules, error messages, lesson-body parsing, URL safety,
  routes and configuration.
- ❌ **Nothing covers the components or the database.** The RLS policies, the invite trigger and the
  hardening migration have **not** been executed anywhere, not in production and not in a local
  Postgres. Treat them as reviewed source, not verified behaviour, until step 1 runs and a real
  sign-up is attempted both with and without an invite.
