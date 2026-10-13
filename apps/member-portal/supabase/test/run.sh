#!/usr/bin/env bash
# Applies every member-portal migration, in filename order, to a throwaway local
# PostgreSQL behind a Supabase stub, then runs the assertions in 10_*.sql.
# Needs PostgreSQL server binaries (initdb, pg_ctl, psql). Touches no remote project.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mig="${MIGRATIONS_DIR:-$here/../migrations}"
bin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$bin" ] || bin="$(dirname "$(command -v initdb)")"
[ -x "$bin/initdb" ] || { echo "PostgreSQL server binaries not found" >&2; exit 2; }

work="$(mktemp -d)"
port="${PGTESTPORT:-54329}"
run_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$work"
trap 'run_pg "$bin/pg_ctl -D $work/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

run_pg "$bin/initdb -D $work/data -A trust -U postgres >/dev/null"
run_pg "$bin/pg_ctl -D $work/data -o '-p $port -k $work -c listen_addresses=' -w -l $work/log start >/dev/null"
psql_() { psql -X -q -v ON_ERROR_STOP=1 -h "$work" -p "$port" -U postgres -d portal_test "$@"; }
psql -X -q -h "$work" -p "$port" -U postgres -d postgres -c 'create database portal_test' 

psql_ -f "$here/00_supabase_stub.sql"
for f in "$mig"/*.sql; do
  echo "migration: $(basename "$f")"
  psql_ -1 -f "$f"
done
# Re-applying the idempotent ones must not fail (the owner may re-run a migration).
echo "re-run: starter_lessons"; psql_ -1 -f "$mig/20261003031000_starter_lessons.sql"
for f in "$here"/10_*.sql; do
  echo "assertions: $(basename "$f")"
  psql_ -f "$f"
done
echo "OK: all migrations applied and all assertions passed"
