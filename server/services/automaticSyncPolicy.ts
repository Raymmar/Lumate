/** Development credentials can target live Stripe and Luma accounts. */
export function automaticSyncsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === "production" || env.ENABLE_DEV_EXTERNAL_SYNCS === "true";
}

/** Log once at each service entry point, before any reads, calls or timers. */
export function shouldStartAutomaticSync(service: string): boolean {
  const enabled = automaticSyncsEnabled();
  if (!enabled) {
    console.log(`[${service}] Automatic sync disabled outside production; no startup or recurring jobs scheduled. Set ENABLE_DEV_EXTERNAL_SYNCS=true to opt in to real Stripe/Luma access and data changes.`);
  } else if (process.env.NODE_ENV !== "production") {
    console.warn(`[${service}] Automatic sync enabled by ENABLE_DEV_EXTERNAL_SYNCS=true. This uses real Stripe/Luma access and can change data; this is not a dry run.`);
  } else {
    console.log(`[${service}] Automatic sync enabled in production.`);
  }
  return enabled;
}
