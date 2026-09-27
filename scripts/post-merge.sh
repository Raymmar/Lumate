#!/usr/bin/env bash
set -euo pipefail

# Restore the exact dependencies from the committed lockfile after task merges.
npm ci --no-audit --no-fund

# Apply the idempotent, hand-written schema files to the development database.
# drizzle-kit push is interactive and would try to drop tables that live outside
# the Drizzle schema (e.g. `session`), so it must not run here. Publishing copies
# these development schema changes to production automatically.
for sql_file in server/migrations/*.sql; do
  [ -e "$sql_file" ] || continue
  echo "Applying $sql_file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$sql_file"
done
