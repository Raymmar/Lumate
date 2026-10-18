import { eq } from "drizzle-orm";
import { db } from "../db";
import { cacheMetadata } from "@shared/schema";
import { getStripeSecretKey, getStripeSync } from "../stripeClient";
import { readWebhookSetupEnv, setUpManagedWebhookForEnvironment } from "./stripeWebhookSetup";
import { shouldStartAutomaticSync } from "./automaticSyncPolicy";

/**
 * Stripe background work that used to block startup: the managed webhook setup
 * and the full data backfill. It now runs after the server is listening.
 *
 * The webhook keeps Stripe data current between backfills, so the backfill only
 * runs when the last successful one is older than BACKFILL_MAX_AGE (recorded in
 * cache_metadata so it survives restarts). A periodic check keeps it running on
 * that schedule while the server stays up.
 */

const LAST_BACKFILL_KEY = "last_stripe_backfill";
const BACKFILL_MAX_AGE = 24 * 60 * 60 * 1000;
const BACKFILL_CHECK_INTERVAL = 60 * 60 * 1000;

let backfillInProgress = false;
let backfillCheckInterval: NodeJS.Timeout | null = null;

async function getLastBackfill(): Promise<Date | null> {
  const rows = await db
    .select()
    .from(cacheMetadata)
    .where(eq(cacheMetadata.key, LAST_BACKFILL_KEY))
    .limit(1);
  if (rows.length === 0) return null;
  const parsed = new Date(rows[0].value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

async function setLastBackfill(date: Date): Promise<void> {
  await db
    .insert(cacheMetadata)
    .values({ key: LAST_BACKFILL_KEY, value: date.toISOString() })
    .onConflictDoUpdate({
      target: cacheMetadata.key,
      set: { value: date.toISOString(), updatedAt: new Date().toISOString() },
    });
}

/** Runs the full Stripe backfill (and subscription reconciliation) if the last one is stale. */
async function runBackfillIfDue(reason: "startup" | "scheduled"): Promise<void> {
  if (backfillInProgress) return;

  let lastBackfill: Date | null = null;
  try {
    lastBackfill = await getLastBackfill();
  } catch (error) {
    console.error("[Stripe] Could not read last backfill time, running backfill:", error);
  }

  const age = lastBackfill ? Date.now() - lastBackfill.getTime() : Infinity;
  if (lastBackfill && age >= 0 && age < BACKFILL_MAX_AGE) {
    if (reason === "startup") {
      const nextDue = new Date(lastBackfill.getTime() + BACKFILL_MAX_AGE);
      console.log(
        `[Stripe] Skipping startup backfill: last successful backfill was ${Math.round(age / 60000)} min ago ` +
        `(${lastBackfill.toISOString()}); webhooks keep data current. Next backfill due after ${nextDue.toISOString()}.`,
      );
    }
    return;
  }

  backfillInProgress = true;
  const startedAt = new Date();
  try {
    console.log(
      `[Stripe] Starting background sync of Stripe data (${reason}; last backfill: ${lastBackfill ? lastBackfill.toISOString() : "never"})...`,
    );
    const stripeSync = await getStripeSync();
    await stripeSync.syncBackfill();
    await setLastBackfill(startedAt);
    console.log("[Stripe] Stripe data synced successfully");

    // Run subscription reconciliation after sync completes
    try {
      const { StripeService } = await import("./stripe");
      await StripeService.reconcileAllSubscriptions();
    } catch (reconcileError) {
      console.error("[Stripe] Error during subscription reconciliation:", reconcileError);
    }
  } catch (error) {
    console.error("[Stripe] Error syncing Stripe data:", error);
  } finally {
    backfillInProgress = false;
  }
}

async function setUpManagedWebhook(): Promise<void> {
  const stripeSync = await getStripeSync();
  const env = readWebhookSetupEnv(await getStripeSecretKey());
  console.log("[Stripe] Setting up managed webhook...");
  const result = await setUpManagedWebhookForEnvironment(stripeSync, env);
  if (result.action === "skipped") {
    console.log(`[Stripe] Skipping managed webhook setup: ${result.reason}`);
  } else {
    console.log(`[Stripe] Webhook configured (${result.action}): ${result.url} (UUID: ${result.uuid})`);
  }
}

/** Starts webhook setup and the backfill schedule. Never throws; call after the server is listening. */
export function startStripeBackgroundSync(): void {
  if (!shouldStartAutomaticSync("Stripe")) return;

  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not found, skipping Stripe background sync");
    return;
  }

  (async () => {
    try {
      await setUpManagedWebhook();
    } catch (error) {
      console.error("[Stripe] Failed to set up managed webhook:", error);
    }

    await runBackfillIfDue("startup");

    if (!backfillCheckInterval) {
      backfillCheckInterval = setInterval(() => {
        runBackfillIfDue("scheduled").catch((error) => {
          console.error("[Stripe] Scheduled backfill check failed:", error);
        });
      }, BACKFILL_CHECK_INTERVAL);
    }
  })().catch((error) => {
    console.error("[Stripe] Background sync failed to start:", error);
  });
}

export function stopStripeBackgroundSync(): void {
  if (backfillCheckInterval) {
    clearInterval(backfillCheckInterval);
    backfillCheckInterval = null;
  }
}
