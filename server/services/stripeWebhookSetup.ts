/**
 * Decides how startup configures the managed Stripe webhook.
 *
 * Production (a Replit deployment) keeps the original behaviour: find the
 * managed webhook for the deployment domain or create it.
 *
 * Development never creates endpoints by default. Every workspace and task
 * environment gets its own dev domain, and the development Stripe connection
 * can hold a live key, so creating on every start used to add a new live
 * endpoint each time until the account hit Stripe's endpoint limit. In
 * development we only reuse an enabled managed webhook already registered for
 * the current domain. Creation can be opted into with
 * STRIPE_DEV_WEBHOOK_SETUP=true, and even then never with a live-mode key.
 */

export const DEV_WEBHOOK_OPT_IN_ENV = "STRIPE_DEV_WEBHOOK_SETUP";

export interface ManagedWebhookRecord {
  id: string;
  url: string;
  uuid: string;
}

export interface StripeWebhookEndpoint {
  id: string;
  url: string;
  status: string;
}

/** The subset of StripeSync used here, so tests can supply a fake. */
export interface ManagedWebhookSync {
  listManagedWebhooks(): Promise<ManagedWebhookRecord[]>;
  findOrCreateManagedWebhook(
    url: string,
    params: { enabled_events: string[]; description: string },
  ): Promise<{ webhook: StripeWebhookEndpoint; uuid: string }>;
  stripe: {
    webhookEndpoints: {
      retrieve(id: string): Promise<StripeWebhookEndpoint>;
    };
  };
}

export interface WebhookSetupEnv {
  isDeployment: boolean;
  domain: string | undefined;
  devCreationOptIn: boolean;
  liveModeKey: boolean;
}

export type WebhookSetupResult =
  | { action: "created-or-reused"; url: string; uuid: string }
  | { action: "reused"; url: string; uuid: string }
  | { action: "skipped"; reason: string };

export const MANAGED_WEBHOOK_PARAMS = {
  enabled_events: ["*"],
  description: "Managed webhook for Stripe sync",
};

export function isLiveModeKey(secretKey: string): boolean {
  return /^(sk|rk)_live_/.test(secretKey);
}

export function readWebhookSetupEnv(secretKey: string): WebhookSetupEnv {
  return {
    isDeployment: process.env.REPLIT_DEPLOYMENT === "1",
    domain: process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() || undefined,
    devCreationOptIn: process.env[DEV_WEBHOOK_OPT_IN_ENV] === "true",
    liveModeKey: isLiveModeKey(secretKey),
  };
}

/** Finds an enabled managed webhook already registered for this exact base URL. Never creates. */
async function findExistingManagedWebhook(
  sync: ManagedWebhookSync,
  baseUrl: string,
): Promise<{ webhook: StripeWebhookEndpoint; uuid: string } | null> {
  const records = await sync.listManagedWebhooks();
  for (const record of records) {
    if (record.url.replace(/\/[^/]+$/, "") !== baseUrl) continue;
    try {
      const webhook = await sync.stripe.webhookEndpoints.retrieve(record.id);
      if (webhook.status === "enabled") return { webhook, uuid: record.uuid };
    } catch {
      // Endpoint removed in Stripe or not reachable with this key; try the next record.
    }
  }
  return null;
}

export async function setUpManagedWebhookForEnvironment(
  sync: ManagedWebhookSync,
  env: WebhookSetupEnv,
): Promise<WebhookSetupResult> {
  if (!env.domain) {
    return { action: "skipped", reason: "REPLIT_DOMAINS is not set, so there is no public webhook URL" };
  }
  const baseUrl = `https://${env.domain}/api/stripe/webhook`;

  if (env.isDeployment) {
    const { webhook, uuid } = await sync.findOrCreateManagedWebhook(baseUrl, MANAGED_WEBHOOK_PARAMS);
    return { action: "created-or-reused", url: webhook.url, uuid };
  }

  const existing = await findExistingManagedWebhook(sync, baseUrl);
  if (existing) {
    return { action: "reused", url: existing.webhook.url, uuid: existing.uuid };
  }

  if (!env.devCreationOptIn) {
    return {
      action: "skipped",
      reason:
        `development never creates Stripe webhook endpoints unless ${DEV_WEBHOOK_OPT_IN_ENV}=true ` +
        `(each dev domain would add another endpoint to the Stripe account)`,
    };
  }
  if (env.liveModeKey) {
    return {
      action: "skipped",
      reason: `the development Stripe key is in live mode; ${DEV_WEBHOOK_OPT_IN_ENV} only creates test-mode endpoints`,
    };
  }

  const { webhook, uuid } = await sync.findOrCreateManagedWebhook(baseUrl, MANAGED_WEBHOOK_PARAMS);
  return { action: "created-or-reused", url: webhook.url, uuid };
}
