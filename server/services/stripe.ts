import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";
import Stripe from "stripe";

export class StripeService {
  static async getPriceDetails(priceId: string) {
    try {
      console.log("🔍 Fetching price details for:", priceId);
      const stripe = await getUncachableStripeClient();
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product']
      });
      
      const product = price.product as Stripe.Product;
      
      return {
        id: price.id,
        unitAmount: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        interval: price.recurring?.interval || null,
        productName: product.name,
        productDescription: product.description,
      };
    } catch (error) {
      console.error("❌ Error fetching price details:", error);
      throw error;
    }
  }
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
  static async getSubscriptionStatus(customerId: string, userEmail?: string) {
    try {
      console.log("🔍 Checking subscription status for customer:", customerId, userEmail ? `(email: ${userEmail})` : '');

      // First, try to find subscription in synced Stripe data by customer ID
      if (customerId) {
        const syncedSubscription = await storage.getActiveSubscriptionByCustomerId(customerId);
        if (syncedSubscription) {
          console.log("✅ Found subscription in synced data by customer ID:", {
            id: syncedSubscription.subscriptionId,
            status: syncedSubscription.status,
            currentPeriodEnd: syncedSubscription.currentPeriodEnd,
          });
          return {
            status: syncedSubscription.status,
            currentPeriodEnd: syncedSubscription.currentPeriodEnd,
            subscriptionId: syncedSubscription.subscriptionId,
          };
        }
      }

      // Fallback: Try to find subscription by email in synced data
      if (userEmail) {
        const subscriptionByEmail = await storage.getActiveSubscriptionByEmail(userEmail);
        if (subscriptionByEmail) {
          console.log("✅ Found subscription in synced data via email fallback:", {
            id: subscriptionByEmail.subscriptionId,
            status: subscriptionByEmail.status,
            customerId: subscriptionByEmail.customerId,
            currentPeriodEnd: subscriptionByEmail.currentPeriodEnd,
          });
          
          // Auto-reconcile: Update user's stripe customer ID if it differs
          if (subscriptionByEmail.customerId && subscriptionByEmail.customerId !== customerId) {
            console.log(`🔧 Auto-reconciling customer ID: ${customerId} -> ${subscriptionByEmail.customerId}`);
            const user = await storage.getUserByEmail(userEmail);
            if (user) {
              await storage.setStripeCustomerId(user.id, subscriptionByEmail.customerId);
              await storage.updateUserSubscription(user.id, subscriptionByEmail.subscriptionId, subscriptionByEmail.status);
            }
          }
          
          return {
            status: subscriptionByEmail.status,
            currentPeriodEnd: subscriptionByEmail.currentPeriodEnd,
            subscriptionId: subscriptionByEmail.subscriptionId,
          };
        }
      }

      console.log("❌ No active subscription found in synced data for customer:", customerId);
      return { status: "inactive" };
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
      const stripe = await getUncachableStripeClient();
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

  static async reconcileAllSubscriptions() {
    console.log("🔄 [Startup Reconciliation] Starting subscription reconciliation for all users...");
    
    try {
      const activeSubscriptions = await storage.getActiveStripeSubscriptionsWithCustomers();
      
      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        console.log("✅ [Startup Reconciliation] No active subscriptions found in synced data");
        return { reconciled: 0, errors: 0 };
      }
      
      console.log(`📊 [Startup Reconciliation] Found ${activeSubscriptions.length} active subscriptions to check`);
      
      let reconciledCount = 0;
      let errorCount = 0;
      
      for (const sub of activeSubscriptions) {
        try {
          const { customerId, email, subscriptionId, status } = sub;
          
          if (!email) {
            continue;
          }
          
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            continue;
          }
          
          const needsCustomerIdFix = 
            !user.stripeCustomerId || 
            user.stripeCustomerId === "NULL" || 
            user.stripeCustomerId !== customerId;
          
          const needsStatusFix = 
            status === 'active' && user.subscriptionStatus !== 'active';
          
          if (needsCustomerIdFix || needsStatusFix) {
            console.log(`🔧 [Startup Reconciliation] Fixing user ${user.id} (${email}):`, {
              oldCustomerId: user.stripeCustomerId,
              newCustomerId: customerId,
              oldStatus: user.subscriptionStatus,
              newStatus: status,
              subscriptionId,
              fixingCustomerId: needsCustomerIdFix,
              fixingStatus: needsStatusFix
            });
            
            if (needsCustomerIdFix) {
              await storage.setStripeCustomerId(user.id, customerId);
            }
            
            if (needsStatusFix && status === 'active') {
              await storage.updateUserSubscription(user.id, subscriptionId, 'active');
            }
            
            reconciledCount++;
          }
        } catch (error) {
          console.error(`❌ [Startup Reconciliation] Error processing subscription:`, error);
          errorCount++;
        }
      }
      
      console.log(`✅ [Startup Reconciliation] Complete: ${reconciledCount} users reconciled, ${errorCount} errors`);
      
      return { reconciled: reconciledCount, errors: errorCount };
    } catch (error) {
      console.error("❌ [Startup Reconciliation] Failed:", error);
      throw error;
    }
  }
}
