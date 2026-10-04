-- 20260921214125_content_catalog_and_integration_registry.sql
-- Baseline: applied to the member-portal Supabase project on 2026-09-21, before this repository
-- tracked it. Copied verbatim from supabase_migrations.schema_migrations (read-only capture, 2026-10-03).

create table if not exists public.learning_tracks (
  id text primary key,
  title text not null,
  pillar text not null,
  summary text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_tracks enable row level security;

create policy "learning_tracks_public_read"
on public.learning_tracks for select
to anon, authenticated
using (is_published = true);

create policy "learning_tracks_staff_manage"
on public.learning_tracks for all
to authenticated
using (private.is_staff())
with check (private.is_staff());

grant select on public.learning_tracks to anon, authenticated;
grant insert, update, delete on public.learning_tracks to authenticated;

create trigger learning_tracks_set_updated_at
before update on public.learning_tracks
for each row execute procedure public.set_updated_at();

create table if not exists public.learning_modules (
  id text primary key,
  track_id text not null references public.learning_tracks(id) on delete cascade,
  title text not null,
  summary text,
  content_type text not null default 'lesson' check (content_type in ('lesson','video','document','exercise','assessment')),
  content_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_modules enable row level security;

create policy "learning_modules_public_read"
on public.learning_modules for select
to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.learning_tracks t
    where t.id = track_id and t.is_published = true
  )
);

create policy "learning_modules_staff_manage"
on public.learning_modules for all
to authenticated
using (private.is_staff())
with check (private.is_staff());

grant select on public.learning_modules to anon, authenticated;
grant insert, update, delete on public.learning_modules to authenticated;

create trigger learning_modules_set_updated_at
before update on public.learning_modules
for each row execute procedure public.set_updated_at();

create index if not exists learning_modules_track_idx on public.learning_modules(track_id, sort_order);

create table if not exists public.resources (
  id text primary key,
  title text not null,
  resource_type text not null check (resource_type in ('article','video','document','tool','template','course','link')),
  summary text,
  content_url text,
  track_id text references public.learning_tracks(id) on delete set null,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy "resources_public_read"
on public.resources for select
to anon, authenticated
using (is_published = true);

create policy "resources_staff_manage"
on public.resources for all
to authenticated
using (private.is_staff())
with check (private.is_staff());

grant select on public.resources to anon, authenticated;
grant insert, update, delete on public.resources to authenticated;

create trigger resources_set_updated_at
before update on public.resources
for each row execute procedure public.set_updated_at();

create index if not exists resources_track_idx on public.resources(track_id, sort_order);

create table if not exists public.opportunity_pathways (
  id text primary key,
  title text not null,
  summary text,
  keywords text[] not null default '{}',
  destination_type text not null check (destination_type in ('learning_track','resource','service','community','external')),
  destination_id text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_pathways enable row level security;

create policy "opportunity_pathways_public_read"
on public.opportunity_pathways for select
to anon, authenticated
using (is_active = true);

create policy "opportunity_pathways_staff_manage"
on public.opportunity_pathways for all
to authenticated
using (private.is_staff())
with check (private.is_staff());

grant select on public.opportunity_pathways to anon, authenticated;
grant insert, update, delete on public.opportunity_pathways to authenticated;

create trigger opportunity_pathways_set_updated_at
before update on public.opportunity_pathways
for each row execute procedure public.set_updated_at();

create table if not exists public.integration_status (
  integration_key text primary key,
  display_name text not null,
  state text not null check (state in ('connected','backend_ready','not_connected','planned')),
  public_note text,
  updated_at timestamptz not null default now()
);

alter table public.integration_status enable row level security;

create policy "integration_status_public_read"
on public.integration_status for select
to anon, authenticated
using (true);

create policy "integration_status_staff_manage"
on public.integration_status for all
to authenticated
using (private.is_staff())
with check (private.is_staff());

grant select on public.integration_status to anon, authenticated;
grant insert, update, delete on public.integration_status to authenticated;

insert into public.learning_tracks (id, title, pillar, summary, sort_order, is_published)
values
  ('money-credit-systems', 'Money & Credit Systems', 'Education Builds Freedom', 'Financial education and credit-system learning pathway.', 10, true),
  ('ai-automation', 'AI & Automation', 'Opportunity Creates Change', 'AI systems, automation, and practical technology pathway.', 20, true),
  ('business-systems', 'Business Systems', 'Community Multiplies Impact', 'Operational systems and business-building pathway.', 30, true),
  ('leadership-legacy', 'Leadership & Legacy', 'Excellence Leads Higher', 'Leadership, stewardship, family, and legacy pathway.', 40, true)
on conflict (id) do update
set title = excluded.title,
    pillar = excluded.pillar,
    summary = excluded.summary,
    sort_order = excluded.sort_order,
    is_published = excluded.is_published,
    updated_at = now();

insert into public.opportunity_pathways
(id, title, summary, keywords, destination_type, destination_id, sort_order, is_active)
values
  ('money-credit', 'Money & Credit Systems', 'Start with financial education and credit systems.', array['money','credit','debt','budget','finance','financial','income','capital'], 'learning_track', 'money-credit-systems', 10, true),
  ('ai-automation', 'AI & Automation', 'Build AI and automation capability for work or business.', array['ai','automation','agent','workflow','software','technology','tech','mcp'], 'learning_track', 'ai-automation', 20, true),
  ('business-systems', 'Business Systems', 'Strengthen operations, processes, and business execution.', array['business','operations','system','process','company','startup','entrepreneur','sales'], 'learning_track', 'business-systems', 30, true),
  ('leadership-legacy', 'Leadership & Legacy', 'Develop leadership, stewardship, and long-term legacy systems.', array['leadership','legacy','family','community','stewardship','purpose','growth'], 'learning_track', 'leadership-legacy', 40, true)
on conflict (id) do update
set title = excluded.title,
    summary = excluded.summary,
    keywords = excluded.keywords,
    destination_type = excluded.destination_type,
    destination_id = excluded.destination_id,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.integration_status (integration_key, display_name, state, public_note)
values
  ('supabase_database', 'Member Cloud Database', 'connected', 'Production database provisioned and secured with row-level policies.'),
  ('supabase_auth', 'Member Authentication', 'backend_ready', 'Authentication backend is provisioned; app-side activation is in progress.'),
  ('course_studio', 'Course Studio / Neterverse University', 'not_connected', 'Course synchronization is not connected yet.'),
  ('skool', 'Skool', 'not_connected', 'Community synchronization is not connected yet.'),
  ('discord', 'Discord', 'not_connected', 'Discord integration is not connected yet.'),
  ('telegram', 'Telegram', 'not_connected', 'Telegram integration is not connected yet.'),
  ('beehiiv', 'Beehiiv', 'not_connected', 'Newsletter integration is not connected yet.'),
  ('nte_virtual_solutions', 'NTE Virtual Solutions Routing', 'not_connected', 'Service-routing integration is not connected yet.'),
  ('push_notifications', 'Push Notifications', 'not_connected', 'Native push delivery is not connected yet.'),
  ('analytics', 'Product Analytics', 'not_connected', 'Analytics is not connected yet.'),
  ('payments', 'Payments', 'not_connected', 'Payments are not connected yet.')
on conflict (integration_key) do update
set display_name = excluded.display_name,
    state = excluded.state,
    public_note = excluded.public_note,
    updated_at = now();
