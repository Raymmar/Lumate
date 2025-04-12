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
      
      // Get active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price.product']
      });
      
      // Setup revenue tracking by price
      const revenueByPrice: Record<string, {
        id: string;
        nickname?: string;
        productName?: string;
        unitAmount: number;
        subscriptionCount: number;
        revenue: number;
      }> = {};
      
      let totalRevenue = 0;
      
      // Process each subscription to count and calculate recurring revenue
      for (const subscription of subscriptions.data) {
        for (const item of subscription.items.data) {
          const price = item.price;
          const priceId = price.id;
          
          // Skip if we're filtering by price IDs and this one doesn't match
          if (options.priceIds && options.priceIds.length > 0 && !options.priceIds.includes(priceId)) {
            continue;
          }
          
          // Get unit amount (convert cents to dollars)
          const unitAmount = price.unit_amount ? price.unit_amount / 100 : 0;
          
          // Initialize price in revenue tracking if not exists
          if (!revenueByPrice[priceId]) {
            revenueByPrice[priceId] = {
              id: priceId,
              nickname: price.nickname || '',
              productName: price.product && typeof price.product !== 'string' && 'name' in price.product
                ? price.product.name 
                : '',
              unitAmount,
              subscriptionCount: 0,
              revenue: 0
            };
          }
          
          // Increment subscription count
          revenueByPrice[priceId].subscriptionCount++;
          
          // Add to revenue (unit price * quantity)
          const itemRevenue = unitAmount * (item.quantity || 1);
          revenueByPrice[priceId].revenue += itemRevenue;
          totalRevenue += itemRevenue;
        }
      }
      
      // Return formatted results
      return {
        totalRevenue,
        revenueByPrice: Object.values(revenueByPrice)
      };
    } catch (error) {
      console.error("❌ Error fetching subscription revenue:", error);
      throw error;
    }
  }
}
