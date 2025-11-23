import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";

export class StripeService {
  static async createCustomer(email: string, userId: number) {
    try {
      console.log("Creating Stripe customer for:", email);
      const stripe = await getUncachableStripeClient();
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

      const stripe = await getUncachableStripeClient();
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
      const stripe = await getUncachableStripeClient();
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

      const stripe = await getUncachableStripeClient();
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

      const stripe = await getUncachableStripeClient();
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

      const stripe = await getUncachableStripeClient();
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
      
      // Count active subscriptions by price and calculate current MRR
      const activeSubscriptionsByPrice: Record<string, number> = {};
      let calculatedTotalRevenue = 0;
      
      // Get all active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price.product']
      });
      
      console.log(`Found ${subscriptions.data.length} active subscriptions`);
      
      // Process each subscription
      for (const subscription of subscriptions.data) {
        for (const item of subscription.items.data) {
          const priceId = item.price.id;
          const unitAmount = item.price.unit_amount ? item.price.unit_amount / 100 : 0;
          const quantity = item.quantity || 1;
          
          // Skip if we're filtering by price IDs and this one doesn't match
          if (options.priceIds && options.priceIds.length > 0 && !options.priceIds.includes(priceId)) {
            continue;
          }
          
          // Count active subscriptions by price
          if (!activeSubscriptionsByPrice[priceId]) {
            activeSubscriptionsByPrice[priceId] = 0;
          }
          activeSubscriptionsByPrice[priceId] += quantity;
          
          // Add to monthly recurring revenue
          calculatedTotalRevenue += unitAmount * quantity;
        }
      }
      
      // Get price details to include names
      const priceIds = Object.keys(activeSubscriptionsByPrice);
      const priceDetails: Record<string, any> = {};
      const revenueByPrice: Record<string, number> = {};
      
      if (priceIds.length > 0) {
        // Fetch details for each price to get their names
        for (const priceId of priceIds) {
          try {
            const price = await stripe.prices.retrieve(priceId, {
              expand: ['product']
            });
            
            const unitAmount = price.unit_amount ? price.unit_amount / 100 : 0;
            const subscriptionCount = activeSubscriptionsByPrice[priceId] || 0;
            
            // Calculate revenue for this price as unit amount * number of active subscriptions
            const priceRevenue = unitAmount * subscriptionCount;
            revenueByPrice[priceId] = priceRevenue;
            
            priceDetails[priceId] = {
              id: price.id,
              nickname: price.nickname,
              productName: (price.product as Stripe.Product).name,
              unitAmount: unitAmount,
            };
            
            console.log(`Price ${priceId}: ${subscriptionCount} active subscriptions at $${unitAmount} = $${priceRevenue}`);
          } catch (error) {
            console.error(`Error fetching price details for ${priceId}:`, error);
            priceDetails[priceId] = { id: priceId, nickname: 'Unknown' };
            revenueByPrice[priceId] = 0;
          }
        }
      }
      
      console.log(`Total calculated revenue from active subscriptions: $${calculatedTotalRevenue}`);
      
      // Return formatted results
      return {
        totalRevenue: calculatedTotalRevenue,
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
