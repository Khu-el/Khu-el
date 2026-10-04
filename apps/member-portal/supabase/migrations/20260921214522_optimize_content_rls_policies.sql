-- 20260921214522_optimize_content_rls_policies.sql
-- Baseline: applied to the member-portal Supabase project on 2026-09-21, before this repository
-- tracked it. Copied verbatim from supabase_migrations.schema_migrations (read-only capture, 2026-10-03).

drop policy if exists "learning_tracks_public_read" on public.learning_tracks;
drop policy if exists "learning_tracks_staff_manage" on public.learning_tracks;
create policy "learning_tracks_anon_read"
on public.learning_tracks for select to anon
using (is_published = true);
create policy "learning_tracks_authenticated_read"
on public.learning_tracks for select to authenticated
using (is_published = true or private.is_staff());
create policy "learning_tracks_staff_insert"
on public.learning_tracks for insert to authenticated
with check (private.is_staff());
create policy "learning_tracks_staff_update"
on public.learning_tracks for update to authenticated
using (private.is_staff()) with check (private.is_staff());
create policy "learning_tracks_staff_delete"
on public.learning_tracks for delete to authenticated
using (private.is_staff());

-- learning_modules
drop policy if exists "learning_modules_public_read" on public.learning_modules;
drop policy if exists "learning_modules_staff_manage" on public.learning_modules;
create policy "learning_modules_anon_read"
on public.learning_modules for select to anon
using (
  is_published = true and exists (
    select 1 from public.learning_tracks t
    where t.id = track_id and t.is_published = true
  )
);
create policy "learning_modules_authenticated_read"
on public.learning_modules for select to authenticated
using (
  private.is_staff() or (
    is_published = true and exists (
      select 1 from public.learning_tracks t
      where t.id = track_id and t.is_published = true
    )
  )
);
create policy "learning_modules_staff_insert"
on public.learning_modules for insert to authenticated
with check (private.is_staff());
create policy "learning_modules_staff_update"
on public.learning_modules for update to authenticated
using (private.is_staff()) with check (private.is_staff());
create policy "learning_modules_staff_delete"
on public.learning_modules for delete to authenticated
using (private.is_staff());

-- resources
drop policy if exists "resources_public_read" on public.resources;
drop policy if exists "resources_staff_manage" on public.resources;
create policy "resources_anon_read"
on public.resources for select to anon
using (is_published = true);
create policy "resources_authenticated_read"
on public.resources for select to authenticated
using (is_published = true or private.is_staff());
create policy "resources_staff_insert"
on public.resources for insert to authenticated
with check (private.is_staff());
create policy "resources_staff_update"
on public.resources for update to authenticated
using (private.is_staff()) with check (private.is_staff());
create policy "resources_staff_delete"
on public.resources for delete to authenticated
using (private.is_staff());

-- opportunity_pathways
drop policy if exists "opportunity_pathways_public_read" on public.opportunity_pathways;
drop policy if exists "opportunity_pathways_staff_manage" on public.opportunity_pathways;
create policy "opportunity_pathways_anon_read"
on public.opportunity_pathways for select to anon
using (is_active = true);
create policy "opportunity_pathways_authenticated_read"
on public.opportunity_pathways for select to authenticated
using (is_active = true or private.is_staff());
create policy "opportunity_pathways_staff_insert"
on public.opportunity_pathways for insert to authenticated
with check (private.is_staff());
create policy "opportunity_pathways_staff_update"
on public.opportunity_pathways for update to authenticated
using (private.is_staff()) with check (private.is_staff());
create policy "opportunity_pathways_staff_delete"
on public.opportunity_pathways for delete to authenticated
using (private.is_staff());

-- integration_status
drop policy if exists "integration_status_public_read" on public.integration_status;
drop policy if exists "integration_status_staff_manage" on public.integration_status;
create policy "integration_status_public_read"
on public.integration_status for select to anon, authenticated
using (true);
create policy "integration_status_staff_insert"
on public.integration_status for insert to authenticated
with check (private.is_staff());
create policy "integration_status_staff_update"
on public.integration_status for update to authenticated
using (private.is_staff()) with check (private.is_staff());
create policy "integration_status_staff_delete"
on public.integration_status for delete to authenticated
using (private.is_staff());
