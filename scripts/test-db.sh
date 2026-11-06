#!/usr/bin/env bash
# 在本機 Postgres 測試 migration、RLS 與評分
# 用法：PGHOST=... PGPORT=... PGUSER=postgres scripts/test-db.sh
# 需要先執行 node scripts/build-questions.mjs 產生 content-private/seed.private.sql
set -euo pipefail
cd "$(dirname "$0")/.."

DB=osh_test_$$
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT

run() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

run -f supabase/tests/supabase-shim.sql
run -f supabase/migrations/20261106000001_init.sql
run -f content-private/seed.private.sql
run -f supabase/tests/database.test.sql 2>&1 | sed -n 's/.*\(PASS: .*\)/\1/p; s/.*\(FAIL: .*\)/\1/p; /全部資料庫測試通過/p; /ERROR/p'
