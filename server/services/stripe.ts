import Stripe from "stripe";
import { storage } from "../storage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be defined");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

export class StripeService {
  static async createCustomer(email: string, userId: number) {
    try {
      console.log("Creating Stripe customer for:", email);
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId: userId.toString(),
        },
      });

      console.log("Successfully created Stripe customer:", customer.id);
      return customer;
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      throw error;
    }
  }

  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    userId: number,
  ) {
    try {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      console.log("Creating checkout session:", {
        customerId,
        priceId,
        userId,
      });

      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
        },
        allow_promotion_codes: true,
      });

      console.log("✅ Checkout session created:", {
        sessionId: session.id,
        customerId,
      });

      return session;
    } catch (error) {
      console.error("❌ Error creating checkout session:", error);
      throw error;
    }
  }

  static async verifySession(sessionId: string) {
    try {
      console.log("🔍 Verifying session:", sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      console.log("📦 Session details:", {
        id: session.id,
        status: session.status,
        customerId: session.customer,
        subscriptionId: session.subscription,
      });

      if (session.subscription && typeof session.subscription === "object") {
        const subscription = session.subscription;

        if (typeof session.customer === "string") {
          const user = await storage.getUserByStripeCustomerId(
            session.customer,
          );
          if (user) {
            await storage.updateUserSubscription(
              user.id,
              subscription.id,
              subscription.status,
            );
          }
        }

        return {
          isValid: true,
          status: session.status,
          paymentStatus: session.payment_status,
          subscriptionDetails: {
            id: subscription.id,
            status: subscription.status,
            customerId:
              typeof session.customer === "string" ? session.customer : null,
          },
        };
      }

      return {
        isValid: true,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionDetails: null,
      };
    } catch (error) {
      console.error("❌ Error verifying session:", error);
      throw error;
    }
  }
  static async createCustomerPortalSession(customerId: string) {
    try {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      console.log("Creating customer portal session for:", customerId);

      // Use production URL, fallback to environment URL only in development
      const returnUrl = process.env.APP_URL
        ? `${process.env.APP_URL}/settings`
        : "http://localhost:3000/settings";

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      console.log("✅ Customer portal session created:", {
        sessionId: session.id,
        url: session.url,
      });

      return session;
    } catch (error) {
      console.error("❌ Error creating customer portal session:", error);
      throw error;
    }
  }
  static async getSubscriptionStatus(customerId: string) {
    try {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      console.log("🔍 Checking subscription status for customer:", customerId);

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: "active",
      });

      if (subscriptions.data.length === 0) {
        console.log(
          "❌ No active subscription found for customer:",
          customerId,
        );
        return { status: "inactive" };
      }

      const subscription = subscriptions.data[0];
      console.log("✅ Found subscription:", {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      });

      return {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      console.error("❌ Error checking subscription status:", error);
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      if (!subscriptionId) {
        throw new Error("Subscription ID is required");
      }

      console.log("🔄 Cancelling subscription:", subscriptionId);

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      console.log("✅ Subscription cancelled:", {
        id: subscription.id,
        status: subscription.status,
        cancelAt: subscription.cancel_at,
      });

      return subscription;
    } catch (error) {
      console.error("❌ Error cancelling subscription:", error);
      throw error;
    }
  }

  static async getSubscriptionRevenue(options: {
    priceIds?: string[];
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    try {
      console.log("🔍 Fetching subscription revenue data", options);
      
      // Prepare date filters for the query
      const dateFilter: any = {};
      if (options.startDate) {
        dateFilter.created = { gte: Math.floor(options.startDate.getTime() / 1000) };
      }
      if (options.endDate) {
        if (dateFilter.created) {
          dateFilter.created.lte = Math.floor(options.endDate.getTime() / 1000);
        } else {
          dateFilter.created = { lte: Math.floor(options.endDate.getTime() / 1000) };
        }
      }
      
      // Get all invoices that are paid
      const invoices = await stripe.invoices.list({
        limit: 100,
        status: 'paid',
        ...dateFilter
      });
      
      // Setup revenue tracking by price
      const revenueByPrice: Record<string, number> = {};
      let totalRevenue = 0;
      
      // Process each invoice
      for (const invoice of invoices.data) {
        // Skip if not a subscription invoice
        if (!invoice.subscription) continue;
        
        // Get line items from invoice
        for (const lineItem of invoice.lines.data) {
          const priceId = lineItem.price?.id;
          
          // Skip if we're filtering by price IDs and this one doesn't match
          if (options.priceIds && options.priceIds.length > 0 && !options.priceIds.includes(priceId)) {
            continue;
          }
          
          // Calculate amount (Stripe amounts are in cents, convert to dollars)
          const amount = lineItem.amount / 100;
          
          // Add to totals
          if (priceId) {
            if (!revenueByPrice[priceId]) {
              revenueByPrice[priceId] = 0;
            }
            revenueByPrice[priceId] += amount;
          }
          totalRevenue += amount;
        }
      }
      
      // Get price details to include names
      const priceIds = Object.keys(revenueByPrice);
      const priceDetails: Record<string, any> = {};
      
      if (priceIds.length > 0) {
        // Fetch details for each price to get their names
        for (const priceId of priceIds) {
          try {
            const price = await stripe.prices.retrieve(priceId, {
              expand: ['product']
            });
            priceDetails[priceId] = {
              id: price.id,
              nickname: price.nickname,
              productName: (price.product as Stripe.Product).name,
              unitAmount: price.unit_amount ? price.unit_amount / 100 : 0,
            };
          } catch (error) {
            console.error(`Error fetching price details for ${priceId}:`, error);
            priceDetails[priceId] = { id: priceId, nickname: 'Unknown' };
          }
        }
      }
      
      // Count active subscriptions by price
      const activeSubscriptionsByPrice: Record<string, number> = {};
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100
      });
      
      for (const subscription of subscriptions.data) {
        for (const item of subscription.items.data) {
          const priceId = item.price.id;
          if (!activeSubscriptionsByPrice[priceId]) {
            activeSubscriptionsByPrice[priceId] = 0;
          }
          activeSubscriptionsByPrice[priceId]++;
        }
      }
      
      // Return formatted results
      return {
        totalRevenue,
        revenueByPrice: Object.keys(revenueByPrice).map(priceId => ({
          ...priceDetails[priceId],
          revenue: revenueByPrice[priceId],
          subscriptionCount: activeSubscriptionsByPrice[priceId] || 0
        }))
      };
    } catch (error) {
      console.error("❌ Error fetching subscription revenue:", error);
      throw error;
    }
  }
}
