-- 20260921213950_initial_member_cloud_schema.sql
-- Baseline: applied to the member-portal Supabase project on 2026-09-21, before this repository
-- tracked it. Copied verbatim from supabase_migrations.schema_migrations (read-only capture, 2026-10-03).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant select, update on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  module_id text not null,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, track_id, module_id)
);

alter table public.learning_progress enable row level security;

create policy "learning_progress_owner_all"
on public.learning_progress for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.learning_progress to authenticated;

create trigger learning_progress_set_updated_at
before update on public.learning_progress
for each row execute procedure public.set_updated_at();

create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, resource_id)
);

alter table public.saved_resources enable row level security;

create policy "saved_resources_owner_all"
on public.saved_resources for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.saved_resources to authenticated;

create table if not exists public.opportunity_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  pathway_key text,
  pathway_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_blueprints enable row level security;

create policy "opportunity_blueprints_owner_all"
on public.opportunity_blueprints for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.opportunity_blueprints to authenticated;

create trigger opportunity_blueprints_set_updated_at
before update on public.opportunity_blueprints
for each row execute procedure public.set_updated_at();

create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  title text not null default '30-Day District Action Plan',
  pathway_key text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.action_plans enable row level security;

create policy "action_plans_owner_all"
on public.action_plans for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.action_plans to authenticated;

create trigger action_plans_set_updated_at
before update on public.action_plans
for each row execute procedure public.set_updated_at();

create table if not exists public.action_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.action_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 4),
  title text not null,
  action_text text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, week_number)
);

alter table public.action_plan_weeks enable row level security;

create policy "action_plan_weeks_owner_all"
on public.action_plan_weeks for all
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.action_plans p
    where p.id = plan_id
      and p.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.action_plan_weeks to authenticated;

create trigger action_plan_weeks_set_updated_at
before update on public.action_plan_weeks
for each row execute procedure public.set_updated_at();

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  subject text not null,
  message text not null,
  contact_email text,
  status text not null default 'submitted' check (status in ('submitted','in_review','in_progress','resolved','closed')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_requests enable row level security;

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('support','editor','admin','owner')),
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members s
    where s.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create policy "support_requests_owner_select"
on public.support_requests for select
to authenticated
using ((select auth.uid()) = user_id or public.is_staff());

create policy "support_requests_owner_insert"
on public.support_requests for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "support_requests_staff_update"
on public.support_requests for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

grant select, insert, update on public.support_requests to authenticated;

create trigger support_requests_set_updated_at
before update on public.support_requests
for each row execute procedure public.set_updated_at();

create table if not exists public.member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_updates boolean not null default true,
  push_updates boolean not null default true,
  product_updates boolean not null default true,
  analytics_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_preferences enable row level security;

create policy "member_preferences_owner_all"
on public.member_preferences for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.member_preferences to authenticated;

create trigger member_preferences_set_updated_at
before update on public.member_preferences
for each row execute procedure public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'general',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_owner_select"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notifications_owner_mark_read"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, update on public.notifications to authenticated;

create index if not exists learning_progress_user_idx on public.learning_progress(user_id);
create index if not exists saved_resources_user_idx on public.saved_resources(user_id);
create index if not exists opportunity_blueprints_user_idx on public.opportunity_blueprints(user_id);
create index if not exists action_plans_user_idx on public.action_plans(user_id);
create index if not exists action_plan_weeks_user_idx on public.action_plan_weeks(user_id);
create index if not exists support_requests_user_idx on public.support_requests(user_id);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
