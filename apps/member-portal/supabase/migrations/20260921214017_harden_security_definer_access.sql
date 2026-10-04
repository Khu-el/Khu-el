-- 20260921214017_harden_security_definer_access.sql
-- Baseline: applied to the member-portal Supabase project on 2026-09-21, before this repository
-- tracked it. Copied verbatim from supabase_migrations.schema_migrations (read-only capture, 2026-10-03).

revoke all on function public.handle_new_user() from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
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

grant execute on function private.is_staff() to authenticated;

drop policy if exists "support_requests_owner_select" on public.support_requests;
drop policy if exists "support_requests_staff_update" on public.support_requests;

create policy "support_requests_owner_select"
on public.support_requests for select
to authenticated
using ((select auth.uid()) = user_id or private.is_staff());

create policy "support_requests_staff_update"
on public.support_requests for update
to authenticated
using (private.is_staff())
with check (private.is_staff());

revoke all on function public.is_staff() from public, anon, authenticated;
drop function if exists public.is_staff();

create policy "staff_members_deny_client_access"
on public.staff_members for all
to authenticated
using (false)
with check (false);
