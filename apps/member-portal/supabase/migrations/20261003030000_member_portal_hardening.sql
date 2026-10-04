-- 20261003030000_member_portal_hardening.sql
--
-- Makes the member-portal backend safe to open to real members (ADR-0004).
--
--   1. Archives the dormant neterverse_* control-plane tables out of the Data API
--      (moved, not dropped -- reversible with ALTER TABLE ... SET SCHEMA public).
--   2. Narrows client grants: RLS stays the gate, but anon/authenticated lose the
--      privileges no policy ever needed (TRUNCATE, REFERENCES, TRIGGER, and anon
--      writes on member tables).
--   3. Fixes two policy gaps: a member could set status/staff_note on their own
--      support request, and could rewrite a notification's title/body.
--   4. Invite-only, fail-closed sign-up: a BEFORE INSERT trigger on auth.users
--      refuses any account without a matching, unexpired, unused invite code.
--      Staff issue codes through an RPC that returns the code once and sends
--      nothing. There is no bypass, including for the owner.
--   5. Staff roles are assigned by the deployment, never chosen by the user.
--      A private.staff_seed row (written only with SQL by the project owner)
--      is applied once, when that email's account is created. Afterwards
--      public.staff_members holds the live role, and a later change, removal
--      or grant is made there with SQL (README, "Changing staff roles later").
--   6. In-app notifications when staff update a member's support request.
--   7. Lessons can carry their own body text, so content can live in the portal.
--   8. Missing updated_at triggers on member_state and integration_status.
--
-- Roles: support  = triage support requests
--        editor   = + edit the content catalog
--        admin    = + issue and revoke invites
--        owner    = same as admin
--
-- Every function is SECURITY DEFINER only where it must read a private table,
-- with search_path = '' and fully-qualified names.

-- ---------------------------------------------------------------------------
-- 1. Archive the dormant control plane (ADR-0003: one job store; this one
--    never ran a job). Moved out of the exposed `public` schema, data kept.
-- ---------------------------------------------------------------------------
create schema if not exists legacy_neterverse;
revoke all on schema legacy_neterverse from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname like 'neterverse\_%'
  loop
    execute format('alter table public.%I set schema legacy_neterverse', t.relname);
    execute format('revoke all on table legacy_neterverse.%I from public, anon, authenticated', t.relname);
  end loop;

  -- A sequence owned by a column moved with its table above. A standalone one
  -- (e.g. a fencing counter) did not, and still carries the default anon /
  -- authenticated grants, so it follows explicitly.
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'S'
       and c.relname like 'neterverse\_%'
  loop
    execute format('alter sequence public.%I set schema legacy_neterverse', t.relname);
  end loop;

  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'legacy_neterverse'
       and c.relkind = 'S'
  loop
    execute format('revoke all on sequence legacy_neterverse.%I from public, anon, authenticated', t.relname);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Narrow client grants. RLS remains the gate; these privileges were only
--    ever present through Supabase's default privileges.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  member_tables text[] := array[
    'profiles','member_preferences','member_state','learning_progress',
    'saved_resources','opportunity_blueprints','action_plans',
    'action_plan_weeks','support_requests','notifications','staff_members'];
  content_tables text[] := array[
    'learning_tracks','learning_modules','resources','opportunity_pathways',
    'integration_status'];
begin
  foreach t in array member_tables || content_tables loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated', t);
  end loop;
  -- anon has no policy on any member table; remove the dormant privileges.
  foreach t in array member_tables loop
    execute format('revoke all on table public.%I from anon', t);
  end loop;
  -- anon may only read the public catalog.
  foreach t in array content_tables loop
    execute format('revoke insert, update, delete on table public.%I from anon', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3a. A member files a support request; only staff set its status or note.
-- ---------------------------------------------------------------------------
drop policy if exists support_requests_owner_insert on public.support_requests;
create policy support_requests_owner_insert on public.support_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'submitted'
    and staff_note is null
  );

-- 3b. A member may only mark a notification read. Column privilege, so a
--     PATCH touching title/body is refused before RLS is consulted.
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Staff roles
-- ---------------------------------------------------------------------------
create or replace function private.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.role
    from public.staff_members s
   where s.user_id = (select auth.uid());
$$;
revoke all on function private.staff_role() from public, anon;
grant execute on function private.staff_role() to authenticated;

create or replace function private.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.staff_role() in ('editor', 'admin', 'owner'), false);
$$;
revoke all on function private.is_content_editor() from public, anon;
grant execute on function private.is_content_editor() to authenticated;

create or replace function private.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.staff_role() in ('admin', 'owner'), false);
$$;
revoke all on function private.is_staff_admin() from public, anon;
grant execute on function private.is_staff_admin() to authenticated;

-- What the signed-in user is allowed to see in the staff console. Null for a
-- member. Read-only; there is no RPC that changes a role.
create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.staff_role();
$$;
revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;

-- Content writes: editors and above. Support-only staff can no longer edit
-- the public catalog.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['learning_tracks','learning_modules','resources',
                           'opportunity_pathways','integration_status'] loop
    for p in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
         and cmd in ('INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_content_editor())', t || '_editor_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_content_editor()) with check (private.is_content_editor())', t || '_editor_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_content_editor())', t || '_editor_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Invite-only, fail-closed sign-up
-- ---------------------------------------------------------------------------
create table if not exists private.signup_invites (
  email       text primary key
              check (email = lower(btrim(email))
                     and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  code_hash   text not null,          -- extensions.crypt(code, gen_salt('bf')); the code is never stored
  invited_by  uuid,                   -- staff auth.uid(); null when written by the owner with SQL
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid,                   -- no FK, so the record survives account deletion
  revoked_at  timestamptz
);
alter table private.signup_invites enable row level security;  -- no policies: no client role reads it
revoke all on table private.signup_invites from public, anon, authenticated;

create or replace function private.enforce_signup_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_code  text := btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', ''));
  v_inv   private.signup_invites%rowtype;
begin
  -- The code never persists in user metadata or the JWT.
  if new.raw_user_meta_data is not null then
    new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  end if;

  select * into v_inv
    from private.signup_invites i
   where i.email = v_email
     for update;

  if not found
     or v_inv.consumed_at is not null
     or v_inv.revoked_at is not null
     or v_inv.expires_at <= now()
     or v_code = ''
     or extensions.crypt(lower(v_code), v_inv.code_hash) <> v_inv.code_hash
  then
    -- GoTrue returns a generic 500 "Database error saving new user", so the
    -- caller is not told WHICH invite condition failed. This is not
    -- anti-enumeration: a sign-up for an address that already has an account
    -- never reaches this INSERT and gets an ordinary response, so 500 versus
    -- not-500 tells an anonymous caller whether an address is registered.
    -- Accepted residual risk; see ADR-0004 section 3.
    raise exception 'signup_not_invited' using errcode = 'P0001';
  end if;

  update private.signup_invites
     set consumed_at = now(), consumed_by = new.id
   where email = v_email;

  return new;
end;
$$;
revoke all on function private.enforce_signup_invite() from public, anon, authenticated;

drop trigger if exists enforce_signup_invite on auth.users;
create trigger enforce_signup_invite
  before insert on auth.users
  for each row execute function private.enforce_signup_invite();

-- Staff (admin/owner): create or refresh an invite and return the code ONCE.
-- Sends nothing: the staff member hands the code to the invitee themselves.
create or replace function public.create_signup_invite(p_email text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_code  text := encode(extensions.gen_random_bytes(9), 'hex');  -- 18 hex chars, 72 bits
begin
  if not private.is_staff_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into private.signup_invites as i (email, code_hash, invited_by, expires_at)
  values (v_email,
          extensions.crypt(v_code, extensions.gen_salt('bf')),
          (select auth.uid()),
          now() + interval '14 days')
  on conflict (email) do update
     set code_hash  = excluded.code_hash,
         invited_by = excluded.invited_by,
         created_at = now(),
         expires_at = excluded.expires_at,
         revoked_at = null
   where i.consumed_at is null;           -- never resurrect a used invite

  if not found then
    raise exception 'invite already used' using errcode = 'P0001';
  end if;

  return v_code;
end;
$$;
revoke all on function public.create_signup_invite(text) from public, anon;
grant execute on function public.create_signup_invite(text) to authenticated;

create or replace function public.revoke_signup_invite(p_email text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_staff_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update private.signup_invites
     set revoked_at = now()
   where email = lower(btrim(coalesce(p_email, '')))
     and consumed_at is null;
end;
$$;
revoke all on function public.revoke_signup_invite(text) from public, anon;
grant execute on function public.revoke_signup_invite(text) to authenticated;

-- Status only; never the code hash.
create or replace function public.list_signup_invites()
returns table (email text, created_at timestamptz, expires_at timestamptz,
               consumed_at timestamptz, revoked_at timestamptz, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select i.email, i.created_at, i.expires_at, i.consumed_at, i.revoked_at,
           case
             when i.consumed_at is not null then 'used'
             when i.revoked_at  is not null then 'revoked'
             when i.expires_at <= now()     then 'expired'
             else 'pending'
           end
      from private.signup_invites i
     order by i.created_at desc;
end;
$$;
revoke all on function public.list_signup_invites() from public, anon;
grant execute on function public.list_signup_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Staff roles are assigned by the deployment. The owner writes
--    private.staff_seed with SQL; nothing a client can call touches it.
--    The trigger below applies a seed row ONCE, when that email's account is
--    created, and nothing syncs it afterwards: editing or deleting a seed row
--    later changes no one's role, and a seed row added for an email that
--    already has an account grants nothing. From sign-up on, the live role is
--    the public.staff_members row, which every role check reads; change,
--    remove or grant a role there with SQL (README, "Changing staff roles
--    later").
-- ---------------------------------------------------------------------------
create table if not exists private.staff_seed (
  email      text primary key check (email = lower(btrim(email))),
  role       text not null check (role in ('support', 'editor', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
alter table private.staff_seed enable row level security;
revoke all on table private.staff_seed from public, anon, authenticated;

create or replace function private.apply_staff_seed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select s.role into v_role
    from private.staff_seed s
   where s.email = lower(btrim(coalesce(new.email, '')))
     and s.applied_at is null
     for update;
  if found then
    insert into public.staff_members (user_id, role)
    values (new.id, v_role)
    on conflict do nothing;
    update private.staff_seed
       set applied_at = now()
     where email = lower(btrim(coalesce(new.email, '')));
  end if;
  return new;
end;
$$;
revoke all on function private.apply_staff_seed() from public, anon, authenticated;

drop trigger if exists apply_staff_seed on auth.users;
create trigger apply_staff_seed
  after insert on auth.users
  for each row execute function private.apply_staff_seed();

-- ---------------------------------------------------------------------------
-- 6. In-app notifications for support updates. Nothing is emailed.
-- ---------------------------------------------------------------------------
create or replace function private.notify_support_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.staff_note is distinct from old.staff_note then
    insert into public.notifications (user_id, title, body, kind, action_url)
    values (
      new.user_id,
      'Support request updated',
      format('Your request "%s" is now %s.', left(new.subject, 120),
             replace(new.status, '_', ' ')),
      'support',
      '#/support'
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_support_update() from public, anon, authenticated;

drop trigger if exists support_requests_notify_update on public.support_requests;
create trigger support_requests_notify_update
  after update on public.support_requests
  for each row execute function private.notify_support_update();

-- ---------------------------------------------------------------------------
-- 7. Lesson bodies (plain text / light Markdown, rendered as text by the app).
-- ---------------------------------------------------------------------------
alter table public.learning_modules
  add column if not exists body text
  check (body is null or char_length(body) <= 50000);

-- ---------------------------------------------------------------------------
-- 8. updated_at triggers that were missing.
-- ---------------------------------------------------------------------------
drop trigger if exists member_state_set_updated_at on public.member_state;
create trigger member_state_set_updated_at
  before update on public.member_state
  for each row execute function public.set_updated_at();

drop trigger if exists integration_status_set_updated_at on public.integration_status;
create trigger integration_status_set_updated_at
  before update on public.integration_status
  for each row execute function public.set_updated_at();
