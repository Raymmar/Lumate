/**
 * Re-runs the idempotent summit backfill (2025/2026 summit records, agenda,
 * speakers, sponsors and summit-tagged posts). Safe to run multiple times.
 *
 * Usage: npx tsx scripts/backfill-summits.ts
 */
import { backfillSummits } from "../server/services/summitBackfill";
import { pool } from "../server/db";

backfillSummits({ force: true })
  .then((result) => {
    console.log("Summit backfill complete:", JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Summit backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
