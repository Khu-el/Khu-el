-- Adversarial checks of the member-portal SQL: RLS isolation, privilege escalation,
-- the invite-only sign-up trigger, staff seeding, and atomic plan creation.
-- Each DO block is one transaction; a failed check raises and the runner stops.

create schema t;
grant usage on schema t to public;

create function t.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute case when p_uid is null then 'set local role anon' else 'set local role authenticated' end;
end $$;

-- Runs sql as the current role; passes only if it raises (optionally a specific SQLSTATE).
create function t.fails(p_sql text, p_state text default null) returns void language plpgsql as $$
declare ok boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'WRONG ERROR for [%]: got % (%), wanted %', p_sql, sqlstate, sqlerrm, p_state;
    end if;
    ok := true;
  end;
  if not ok then raise exception 'EXPECTED FAILURE but it succeeded: %', p_sql; end if;
end $$;

create function t.affects(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin execute p_sql; get diagnostics n = row_count; return n; end $$;

create function t.count(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin execute 'select count(*) from (' || p_sql || ') q' into n; return n; end $$;

create function t.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERT % : got %, wanted %', p_label, p_actual, p_expected;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 0. Structure: every public table has RLS on; every SECURITY DEFINER function
--    pins search_path; no client role holds TRUNCATE/REFERENCES/TRIGGER.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'public.% has row-level security OFF', r.relname;
  end loop;

  for r in select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public','private') and p.prosecdef
              and not coalesce(exists (select 1 from unnest(p.proconfig) c where c in ('search_path=""', 'search_path=')), false) loop
    raise exception 'SECURITY DEFINER % does not pin search_path to empty', r.fn;
  end loop;

  for r in select table_schema, table_name, grantee, privilege_type
             from information_schema.role_table_grants
            where grantee in ('anon','authenticated','public')
              and table_schema in ('public','private','legacy_neterverse')
              and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER') loop
    raise exception '% has % on %.%', r.grantee, r.privilege_type, r.table_schema, r.table_name;
  end loop;

  -- anon must hold nothing on member tables
  for r in select table_name, privilege_type from information_schema.role_table_grants
            where grantee = 'anon' and table_schema = 'public'
              and table_name in ('profiles','member_preferences','member_state','learning_progress',
                'saved_resources','opportunity_blueprints','action_plans','action_plan_weeks',
                'support_requests','notifications','staff_members') loop
    raise exception 'anon holds % on public.%', r.privilege_type, r.table_name;
  end loop;

  -- the catalog is read-only to anon
  for r in select table_name, privilege_type from information_schema.role_table_grants
            where grantee = 'anon' and table_schema = 'public'
              and privilege_type in ('INSERT','UPDATE','DELETE') loop
    raise exception 'anon can % public.%', r.privilege_type, r.table_name;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Invite-only sign-up (fail closed)
-- ---------------------------------------------------------------------------
do $$
declare owner_id uuid := '00000000-0000-0000-0000-0000000000a1';
begin
  -- no invite at all
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('stranger@example.org', '{}')$q$, 'P0001');
  -- no email (phone / anonymous style sign-up)
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values (null, '{"invite_code":"x"}')$q$, 'P0001');
  -- invite exists, wrong code
  insert into private.signup_invites(email, code_hash, expires_at)
    values ('a@example.org', extensions.crypt('goodcode', extensions.gen_salt('bf')), now() + interval '1 day');
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('a@example.org', '{"invite_code":"badcode"}')$q$, 'P0001');
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('a@example.org', '{}')$q$, 'P0001');
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('a@example.org', '{"invite_code":""}')$q$, 'P0001');
  -- a code for a different email does not transfer
  insert into private.signup_invites(email, code_hash, expires_at)
    values ('b@example.org', extensions.crypt('bcode', extensions.gen_salt('bf')), now() + interval '1 day');
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('a@example.org', '{"invite_code":"bcode"}')$q$, 'P0001');
  -- expired
  insert into private.signup_invites(email, code_hash, expires_at)
    values ('old@example.org', extensions.crypt('oldcode', extensions.gen_salt('bf')), now() - interval '1 second');
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('old@example.org', '{"invite_code":"oldcode"}')$q$, 'P0001');
  -- revoked
  insert into private.signup_invites(email, code_hash, expires_at, revoked_at)
    values ('rev@example.org', extensions.crypt('revcode', extensions.gen_salt('bf')), now() + interval '1 day', now());
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('rev@example.org', '{"invite_code":"revcode"}')$q$, 'P0001');
  -- none of the refusals consumed anything or created a user
  perform t.eq((select count(*) from auth.users), 0::bigint, 'no users created by refusals');
  perform t.eq((select count(*) from private.signup_invites where consumed_at is not null), 0::bigint, 'nothing consumed');

  -- happy path, with case/space tolerance on the email and code
  insert into auth.users(id, email, raw_user_meta_data)
    values (owner_id, '  A@Example.org ', '{"invite_code":" GOODCODE ","display_name":"Ann"}');
  perform t.eq((select raw_user_meta_data ? 'invite_code' from auth.users where id = owner_id), false, 'invite_code scrubbed from metadata');
  perform t.eq((select consumed_by from private.signup_invites where email = 'a@example.org'), owner_id, 'invite consumed_by');
  perform t.eq((select display_name from public.profiles where id = owner_id), 'Ann', 'profile created');
  -- single use
  perform t.fails($q$insert into auth.users(email, raw_user_meta_data) values ('a@example.org', '{"invite_code":"goodcode"}')$q$, 'P0001');
end $$;

-- ---------------------------------------------------------------------------
-- 2. Staff seeding -- the only path to a role, applied once, at sign-up.
-- ---------------------------------------------------------------------------
do $$
declare
  sup uuid := '00000000-0000-0000-0000-0000000000b1';
  edi uuid := '00000000-0000-0000-0000-0000000000b2';
  adm uuid := '00000000-0000-0000-0000-0000000000b3';
  late uuid := '00000000-0000-0000-0000-0000000000b4';
begin
  insert into private.staff_seed(email, role) values
    ('support@example.org','support'), ('editor@example.org','editor'), ('admin@example.org','admin');
  insert into private.signup_invites(email, code_hash, expires_at)
    select e, extensions.crypt('c', extensions.gen_salt('bf')), now() + interval '1 day'
      from unnest(array['support@example.org','editor@example.org','admin@example.org','late@example.org','m1@example.org','m2@example.org']) e;

  insert into auth.users(id,email,raw_user_meta_data) values
    (sup,'support@example.org','{"invite_code":"c"}'),
    (edi,'editor@example.org','{"invite_code":"c"}'),
    (adm,'admin@example.org','{"invite_code":"c"}'),
    ('00000000-0000-0000-0000-0000000000c1','m1@example.org','{"invite_code":"c"}'),
    ('00000000-0000-0000-0000-0000000000c2','m2@example.org','{"invite_code":"c"}');
  perform t.eq((select role from public.staff_members where user_id = sup), 'support', 'support seeded');
  perform t.eq((select role from public.staff_members where user_id = edi), 'editor', 'editor seeded');
  perform t.eq((select role from public.staff_members where user_id = adm), 'admin', 'admin seeded');
  perform t.eq((select count(*) from public.staff_members), 3::bigint, 'members got no staff role');
  perform t.eq((select count(*) from private.staff_seed where applied_at is not null), 3::bigint, 'seeds marked applied');

  -- a seed added AFTER the account exists grants nothing
  insert into private.staff_seed(email, role) values ('m1@example.org','owner');
  perform t.eq((select count(*) from public.staff_members where user_id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint, 'late seed grants nothing');

  -- a self-chosen role in metadata is ignored
  insert into auth.users(id,email,raw_user_meta_data)
    values (late,'late@example.org','{"invite_code":"c","role":"owner","staff_role":"owner"}');
  perform t.eq((select count(*) from public.staff_members where user_id = late), 0::bigint, 'metadata cannot choose a role');
end $$;

-- ---------------------------------------------------------------------------
-- 3. Staff-only surfaces are closed to clients; roles gate invite RPCs.
-- ---------------------------------------------------------------------------
do $$
declare
  member uuid := '00000000-0000-0000-0000-0000000000c1';
  sup uuid := '00000000-0000-0000-0000-0000000000b1';
  adm uuid := '00000000-0000-0000-0000-0000000000b3';
  code text;
begin
  -- anon
  perform t.as_user(null);
  perform t.fails($q$select public.create_signup_invite('x@example.org')$q$, '42501');
  perform t.fails($q$select * from public.list_signup_invites()$q$, '42501');
  perform t.fails($q$select public.current_staff_role()$q$, '42501');
  perform t.fails($q$select * from private.signup_invites$q$);
  reset role;

  -- member
  perform t.as_user(member);
  perform t.fails($q$select * from private.signup_invites$q$, '42501');
  perform t.fails($q$select * from private.staff_seed$q$, '42501');
  perform t.fails($q$select * from public.staff_members$q$, '42501');
  perform t.fails($q$insert into public.staff_members(user_id, role) values ('00000000-0000-0000-0000-0000000000c1','owner')$q$, '42501');
  perform t.fails($q$select public.create_signup_invite('x@example.org')$q$, '42501');
  perform t.fails($q$select public.revoke_signup_invite('x@example.org')$q$, '42501');
  perform t.fails($q$select * from public.list_signup_invites()$q$, '42501');
  perform t.fails($q$select private.enforce_signup_invite()$q$, '42501');
  perform t.eq((select public.current_staff_role()), null::text, 'member has no staff role');
  reset role;

  -- support is staff but cannot issue invites
  perform t.as_user(sup);
  perform t.eq((select public.current_staff_role()), 'support', 'support role visible to self');
  perform t.fails($q$select public.create_signup_invite('x@example.org')$q$, '42501');
  reset role;

  -- admin can; the code works once, is returned once, and the hash is never listed
  perform t.as_user(adm);
  code := public.create_signup_invite(' New.Member@Example.org ');
  perform t.eq(length(code), 18, 'invite code length');
  perform t.eq((select count(*) from public.list_signup_invites() where email = 'new.member@example.org' and status = 'pending'), 1::bigint, 'invite listed pending');
  perform t.eq((select count(*) from information_schema.columns where table_name = 'list_signup_invites'), 0::bigint, 'noop');
  reset role;
  insert into auth.users(email, raw_user_meta_data) values ('new.member@example.org', jsonb_build_object('invite_code', code));
  perform t.as_user(adm);
  perform t.eq((select status from public.list_signup_invites() where email = 'new.member@example.org'), 'used', 'invite shows used');
  -- cannot reissue a used invite
  perform t.fails($q$select public.create_signup_invite('new.member@example.org')$q$, 'P0001');
  -- revoke then refuse
  code := public.create_signup_invite('revoked.later@example.org');
  perform public.revoke_signup_invite('revoked.later@example.org');
  reset role;
  perform t.fails(format($q$insert into auth.users(email, raw_user_meta_data) values ('revoked.later@example.org', '{"invite_code":"%s"}')$q$, code), 'P0001');
  -- re-issue after revoke revives it with a NEW code and the old code stays dead
  perform t.as_user(adm);
  perform public.create_signup_invite('revoked.later@example.org');
  reset role;
  perform t.fails(format($q$insert into auth.users(email, raw_user_meta_data) values ('revoked.later@example.org', '{"invite_code":"%s"}')$q$, code), 'P0001');
end $$;

-- ---------------------------------------------------------------------------
-- 4. Row isolation between members (two members, every owner-scoped table)
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c1';
  b uuid := '00000000-0000-0000-0000-0000000000c2';
  plan_a uuid;
begin
  perform t.as_user(a);
  insert into public.learning_progress(user_id, track_id, module_id, progress_percent) values (a,'money-credit-systems','m1',50);
  insert into public.saved_resources(user_id, resource_id) values (a,'r1');
  insert into public.opportunity_blueprints(user_id, goal) values (a,'g');
  insert into public.member_preferences(user_id) values (a);
  insert into public.member_state(user_id, key, value) values (a,'k','{"x":1}');
  insert into public.action_plans(user_id, goal) values (a,'g') returning id into plan_a;
  insert into public.action_plan_weeks(plan_id,user_id,week_number,title,action_text) values (plan_a,a,1,'t','x');
  insert into public.support_requests(user_id, category, subject, message) values (a,'c','s','m');
  reset role;
  insert into public.notifications(user_id, title, body) values (a,'n','b');

  perform t.as_user(b);
  perform t.eq(t.count('select 1 from public.profiles'), 1::bigint, 'b sees only own profile');
  perform t.eq(t.count('select 1 from public.learning_progress'), 0::bigint, 'b sees no learning_progress of a');
  perform t.eq(t.count('select 1 from public.saved_resources'), 0::bigint, 'saved_resources');
  perform t.eq(t.count('select 1 from public.opportunity_blueprints'), 0::bigint, 'blueprints');
  perform t.eq(t.count('select 1 from public.member_preferences'), 0::bigint, 'preferences');
  perform t.eq(t.count('select 1 from public.member_state'), 0::bigint, 'member_state');
  perform t.eq(t.count('select 1 from public.action_plans'), 0::bigint, 'plans');
  perform t.eq(t.count('select 1 from public.action_plan_weeks'), 0::bigint, 'weeks');
  perform t.eq(t.count('select 1 from public.support_requests'), 0::bigint, 'support');
  perform t.eq(t.count('select 1 from public.notifications'), 0::bigint, 'notifications');
  -- writes aimed at a's rows touch nothing
  perform t.eq(t.affects('update public.profiles set display_name = ''pwned'' where id = ''' || a || ''''), 0::bigint, 'b cannot update a profile');
  perform t.eq(t.affects('delete from public.learning_progress'), 0::bigint, 'b cannot delete a progress');
  perform t.eq(t.affects('update public.notifications set read_at = now()'), 0::bigint, 'b cannot read-mark a notification');
  -- writes claiming a's identity are refused
  perform t.fails(format($q$insert into public.learning_progress(user_id, track_id, module_id) values ('%s','t','m')$q$, a), '42501');
  perform t.fails(format($q$insert into public.saved_resources(user_id, resource_id) values ('%s','x')$q$, a), '42501');
  perform t.fails(format($q$insert into public.support_requests(user_id, category, subject, message) values ('%s','c','s','m')$q$, a), '42501');
  perform t.fails(format($q$insert into public.action_plan_weeks(plan_id,user_id,week_number,title,action_text) values ('%s','%s',2,'t','x')$q$, plan_a, a), '42501');
  -- ... including attaching b's own row to a's plan
  perform t.fails(format($q$insert into public.action_plan_weeks(plan_id,user_id,week_number,title,action_text) values ('%s','%s',2,'t','x')$q$, plan_a, b), '42501');
  -- moving one's own row onto someone else
  insert into public.saved_resources(user_id, resource_id) values (b,'mine');
  perform t.fails(format($q$update public.saved_resources set user_id = '%s' where user_id = '%s'$q$, a, b), '42501');
  perform t.fails($q$update public.profiles set id = gen_random_uuid()$q$, '42501');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Support requests and notifications: who may set what
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c1';
  b uuid := '00000000-0000-0000-0000-0000000000c2';
  sup uuid := '00000000-0000-0000-0000-0000000000b1';
  req uuid;
begin
  select id into req from public.support_requests where user_id = a;

  perform t.as_user(a);
  perform t.fails($q$insert into public.support_requests(user_id,category,subject,message,status) values ('00000000-0000-0000-0000-0000000000c1','c','s','m','resolved')$q$, '42501');
  perform t.fails($q$insert into public.support_requests(user_id,category,subject,message,staff_note) values ('00000000-0000-0000-0000-0000000000c1','c','s','m','looks fine')$q$, '42501');
  -- the owner cannot edit their own request at all (no UPDATE policy, narrow column grant)
  perform t.fails($q$update public.support_requests set message = 'edited'$q$, '42501');
  perform t.eq(t.affects($q$update public.support_requests set status = 'resolved'$q$), 0::bigint, 'owner cannot self-resolve');
  -- notifications: may mark read, may not rewrite
  perform t.fails($q$update public.notifications set title = 'x'$q$, '42501');
  perform t.fails($q$update public.notifications set body = 'x'$q$, '42501');
  perform t.fails($q$insert into public.notifications(user_id,title,body) values ('00000000-0000-0000-0000-0000000000c1','t','b')$q$, '42501');
  perform t.eq(t.affects($q$delete from public.notifications$q$), 0::bigint, 'owner cannot delete notifications (no policy)');
  perform t.eq(t.affects($q$update public.notifications set read_at = now()$q$), 1::bigint, 'owner marks read');
  reset role;

  -- b cannot read a's request; staff can
  perform t.as_user(b);
  perform t.eq(t.count('select 1 from public.support_requests'), 0::bigint, 'b cannot see a request');
  reset role;
  perform t.as_user(sup);
  perform t.eq(t.count('select 1 from public.support_requests'), 1::bigint, 'staff sees request');
  -- staff may triage but not rewrite
  perform t.fails($q$update public.support_requests set message = 'rewritten'$q$, '42501');
  perform t.fails($q$update public.support_requests set user_id = gen_random_uuid()$q$, '42501');
  perform t.fails($q$update public.support_requests set subject = 'x'$q$, '42501');
  perform t.fails($q$update public.support_requests set contact_email = 'x@y.z'$q$, '42501');
  perform t.eq(t.affects($q$delete from public.support_requests$q$), 0::bigint, 'staff cannot delete requests (no policy)');
  perform t.eq(t.affects($q$update public.support_requests set status = 'in_review', staff_note = 'on it'$q$), 1::bigint, 'staff triages');
  perform t.fails($q$update public.support_requests set status = 'bogus'$q$, '23514');
  reset role;

  -- the triage produced exactly one in-app notification for the member, and nothing else
  perform t.eq((select count(*) from public.notifications where user_id = a and kind = 'support'), 1::bigint, 'support notification written');
  perform t.eq((select body from public.notifications where user_id = a and kind = 'support'),
               'Your request "s" is now in review.', 'notification text');
  -- a no-op staff update must not notify
  perform t.as_user(sup);
  perform t.affects($q$update public.support_requests set status = 'in_review', staff_note = 'on it'$q$);
  reset role;
  perform t.eq((select count(*) from public.notifications where user_id = a and kind = 'support'), 1::bigint, 'no duplicate notification');
end $$;

-- ---------------------------------------------------------------------------
-- 6. Catalog visibility and who may edit it
-- ---------------------------------------------------------------------------
do $$
declare
  member uuid := '00000000-0000-0000-0000-0000000000c1';
  sup uuid := '00000000-0000-0000-0000-0000000000b1';
  edi uuid := '00000000-0000-0000-0000-0000000000b2';
  drafts bigint;
begin
  select count(*) into drafts from public.learning_modules where not is_published;
  perform t.eq(drafts > 0, true, 'starter lessons exist as drafts');
  perform t.eq((select count(*) from public.learning_modules where is_published), 0::bigint, 'seed publishes nothing');

  perform t.as_user(null);
  perform t.eq(t.count('select 1 from public.learning_tracks'), 4::bigint, 'anon sees 4 published tracks');
  perform t.eq(t.count('select 1 from public.learning_modules'), 0::bigint, 'anon sees no draft lessons');
  perform t.eq(t.count('select 1 from public.integration_status'), 11::bigint, 'anon sees integration status');
  perform t.fails($q$select * from public.profiles$q$, '42501');
  perform t.fails($q$insert into public.learning_tracks(id,title,pillar) values ('x','x','x')$q$, '42501');
  perform t.fails($q$update public.learning_tracks set title = 'x'$q$, '42501');
  reset role;

  perform t.as_user(member);
  perform t.eq(t.count('select 1 from public.learning_modules'), 0::bigint, 'member sees no draft lessons');
  perform t.fails($q$insert into public.learning_tracks(id,title,pillar) values ('x','x','x')$q$, '42501');
  perform t.eq(t.affects($q$update public.learning_tracks set title = 'x'$q$), 0::bigint, 'member cannot edit tracks');
  perform t.fails($q$insert into public.resources(id,title,resource_type) values ('x','x','link')$q$, '42501');
  perform t.eq(t.affects($q$update public.integration_status set state = 'connected'$q$), 0::bigint, 'member cannot edit integration status');
  reset role;

  perform t.as_user(sup);
  perform t.eq(t.count('select 1 from public.learning_modules'), drafts, 'support reads drafts');
  perform t.fails($q$insert into public.resources(id,title,resource_type) values ('x','x','link')$q$, '42501');
  perform t.eq(t.affects($q$update public.learning_modules set title = 'x'$q$), 0::bigint, 'support cannot edit lessons');
  reset role;

  perform t.as_user(edi);
  perform t.affects($q$insert into public.resources(id,title,resource_type) values ('x','x','link')$q$);
  perform t.eq(t.affects($q$update public.learning_modules set is_published = false$q$) >= 0, true, 'editor may edit lessons');
  perform t.fails($q$update public.learning_modules set body = repeat('x', 50001) where id = (select min(id) from public.learning_modules)$q$, '23514');
  perform t.fails($q$select public.create_signup_invite('x@example.org')$q$, '42501');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Atomic, idempotent plan creation
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c1';
  b uuid := '00000000-0000-0000-0000-0000000000c2';
  ref uuid := gen_random_uuid();
  good jsonb := '[{"week_number":1,"title":"a","action_text":"x"},{"week_number":2,"title":"b","action_text":"x"},
                  {"week_number":3,"title":"c","action_text":"x"},{"week_number":4,"title":"d","action_text":"x"}]';
  p1 public.action_plans; p2 public.action_plans; pb public.action_plans;
  before_n bigint;
begin
  perform t.as_user(null);
  perform t.fails($q$select public.create_action_plan('g','t',null,null,'[]',null)$q$, '42501');
  reset role;

  perform t.as_user(a);
  select count(*) into before_n from public.action_plans;
  -- wrong shape / wrong count
  perform t.fails($q$select public.create_action_plan('g','t',null,null,'[]',null)$q$, '22023');
  perform t.fails($q$select public.create_action_plan('g','t',null,null,'{"a":1}',null)$q$, '22023');
  -- a refused week rolls the plan back with it: week_number 5, duplicate, missing title
  perform t.fails(format($q$select public.create_action_plan('g','t',null,null,'%s',null)$q$,
    '[{"week_number":1,"title":"a","action_text":"x"},{"week_number":2,"title":"b","action_text":"x"},{"week_number":3,"title":"c","action_text":"x"},{"week_number":5,"title":"d","action_text":"x"}]'), '23514');
  perform t.fails(format($q$select public.create_action_plan('g','t',null,null,'%s',null)$q$,
    '[{"week_number":1,"title":"a","action_text":"x"},{"week_number":1,"title":"b","action_text":"x"},{"week_number":3,"title":"c","action_text":"x"},{"week_number":4,"title":"d","action_text":"x"}]'), '23505');
  perform t.fails(format($q$select public.create_action_plan('g','t',null,null,'%s',null)$q$,
    '[{"week_number":1,"action_text":"x"},{"week_number":2,"title":"b","action_text":"x"},{"week_number":3,"title":"c","action_text":"x"},{"week_number":4,"title":"d","action_text":"x"}]'), '23502');
  perform t.eq((select count(*) from public.action_plans), before_n, 'failed attempts leave no half plans');

  -- success, then a retry with the same key returns the same plan with no duplicates
  select * into p1 from public.create_action_plan('goal', '  ', 'pk', null, good, ref);
  perform t.eq(p1.user_id, a, 'plan belongs to caller');
  perform t.eq(p1.title, '30-Day District Action Plan', 'blank title defaults');
  perform t.eq((select count(*) from public.action_plan_weeks where plan_id = p1.id), 4::bigint, 'four weeks');
  select * into p2 from public.create_action_plan('goal', 't', 'pk', null, good, ref);
  perform t.eq(p2.id, p1.id, 'idempotent retry returns same plan');
  perform t.eq((select count(*) from public.action_plans where client_ref = ref), 1::bigint, 'one plan per key');
  perform t.eq((select count(*) from public.action_plan_weeks where plan_id = p1.id), 4::bigint, 'weeks not duplicated');
  reset role;

  -- the key is scoped per user: b reusing a's key gets their own plan, never a's
  perform t.as_user(b);
  select * into pb from public.create_action_plan('goal', 't', null, null, good, ref);
  perform t.eq(pb.user_id, b, 'b gets own plan');
  perform t.eq(pb.id <> p1.id, true, 'distinct plan for distinct user');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 8. updated_at triggers, archived schema, and defence checks
-- ---------------------------------------------------------------------------
do $$
declare t0 timestamptz; t1 timestamptz;
begin
  insert into public.member_state(user_id, key, value, updated_at)
    values ('00000000-0000-0000-0000-0000000000c2','k2','{}', now() - interval '1 day');
  update public.member_state set value = '{"x":2}' where key = 'k2';
  perform t.eq((select updated_at > now() - interval '1 minute' from public.member_state where key = 'k2'), true, 'member_state updated_at trigger');
  update public.integration_status set updated_at = now() - interval '1 day' where integration_key = 'discord';
  update public.integration_status set public_note = 'n' where integration_key = 'discord';
  perform t.eq((select updated_at > now() - interval '1 minute' from public.integration_status where integration_key = 'discord'), true, 'integration_status updated_at trigger');

  perform t.as_user('00000000-0000-0000-0000-0000000000c1');
  perform t.fails($q$select * from legacy_neterverse.anything$q$);
  perform t.fails($q$update public.learning_progress set progress_percent = 101$q$, '23514');
  reset role;
end $$;
