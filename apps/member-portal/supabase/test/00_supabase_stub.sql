-- Minimal stand-in for the parts of a Supabase project the migrations rely on.
-- LOCAL TEST ONLY. Never run this against a real project: it creates auth.users.
--
-- Mirrors what Supabase provisions before any migration runs:
--   * roles anon / authenticated / service_role
--   * the `extensions` schema with pgcrypto in it (crypt, gen_salt, gen_random_bytes)
--   * auth.users and auth.uid() (reads the request.jwt.claim.sub setting, as GoTrue/PostgREST do)
--   * DEFAULT PRIVILEGES granting anon/authenticated everything on new public tables
--     and functions -- the reason the hardening migration narrows grants at all.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema public, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Supabase lets the API roles resolve auth.uid(). A SECURITY INVOKER function that calls it
-- (public.create_action_plan) parses the name at call time as the member and needs this;
-- RLS policy expressions are stored pre-parsed and do not.
grant usage on schema auth to anon, authenticated, service_role;
