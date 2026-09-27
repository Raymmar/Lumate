#!/usr/bin/env bash
set -euo pipefail

# Restore the exact dependencies from the committed lockfile after task merges.
# Schema changes are managed separately; drizzle-kit push is interactive and
# should not run unattended against the project's existing database.
npm ci --no-audit --no-fund