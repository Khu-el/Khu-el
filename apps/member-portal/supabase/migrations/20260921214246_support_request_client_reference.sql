-- 20260921214246_support_request_client_reference.sql
-- Baseline: applied to the member-portal Supabase project on 2026-09-21, before this repository
-- tracked it. Copied verbatim from supabase_migrations.schema_migrations (read-only capture, 2026-10-03).

alter table public.support_requests
  add column if not exists external_ref text,
  add column if not exists requester_name text;

create unique index if not exists support_requests_external_ref_uidx
  on public.support_requests(external_ref)
  where external_ref is not null;
