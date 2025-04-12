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
    productIds?: string[];
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    try {
      console.log("🔍 Fetching subscription revenue data", options);
      
      // Always default to Jan 1, 2025 if no startDate is provided
      const defaultStartDate = new Date('2025-01-01T00:00:00Z');
      
      // Always ensure the product ID prod_RXzIPHBkm0MCM7 is included in the productIds filter
      const productIdsFilter = options.productIds || [];
      const targetProductId = 'prod_RXzIPHBkm0MCM7';
      
      if (!productIdsFilter.includes(targetProductId)) {
        productIdsFilter.push(targetProductId);
      }
      
      console.log(`🎯 Filtering for product ID: ${targetProductId}`);
      
      // Prepare date filters for the query
      const dateFilter: any = {};
      
      // Always use at least the default start date
      dateFilter.created = { 
        gte: Math.floor(options.startDate ? 
          Math.max(options.startDate.getTime(), defaultStartDate.getTime()) / 1000 : 
          defaultStartDate.getTime() / 1000) 
      };
      
      if (options.endDate) {
        dateFilter.created.lte = Math.floor(options.endDate.getTime() / 1000);
      }
      
      console.log(`📅 Using date filter: From ${new Date(dateFilter.created.gte * 1000).toISOString()}${
        dateFilter.created.lte ? ` to ${new Date(dateFilter.created.lte * 1000).toISOString()}` : ''
      }`);
      
      // Get all invoices that are paid
      const invoices = await stripe.invoices.list({
        limit: 100,
        status: 'paid',
        ...dateFilter
      });
      
      console.log(`📊 Found ${invoices.data.length} paid invoices within date range`);
      
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
          if (!priceId) continue;
          
          // Skip if we're filtering by price IDs and this one doesn't match
          if (options.priceIds && options.priceIds.length > 0 && !options.priceIds.includes(priceId)) {
            continue;
          }
          
          // For each price, retrieve its product to check if it matches our product filter
          try {
            const price = await stripe.prices.retrieve(priceId, {
              expand: ['product']
            });
            
            const productId = (price.product as Stripe.Product).id;
            
            // Skip if the product doesn't match our filter
            if (productIdsFilter.length > 0 && !productIdsFilter.includes(productId)) {
              console.log(`⏭️ Skipping price ${priceId} with product ${productId} (not in filter)`);
              continue;
            }
            
            // Calculate amount (Stripe amounts are in cents, convert to dollars)
            const amount = lineItem.amount / 100;
            
            console.log(`💰 Adding revenue: $${amount} from price ${priceId} (${price.nickname || 'Unnamed Price'}) for product ${productId}`);
            
            // Add to totals
            if (!revenueByPrice[priceId]) {
              revenueByPrice[priceId] = 0;
            }
            revenueByPrice[priceId] += amount;
            totalRevenue += amount;
            
          } catch (error) {
            console.error(`❌ Error processing price ${priceId}:`, error);
            // If we can't verify the product, skip this line item
            continue;
          }
        }
      }
      
      console.log(`💲 Total revenue calculated: $${totalRevenue}`);
      
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
              productId: (price.product as Stripe.Product).id,
            };
          } catch (error) {
            console.error(`❌ Error fetching price details for ${priceId}:`, error);
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
          
          try {
            // Check if this subscription's price belongs to our target product
            const price = await stripe.prices.retrieve(priceId, {
              expand: ['product']
            });
            const productId = (price.product as Stripe.Product).id;
            
            // Skip if not in our product filter
            if (productIdsFilter.length > 0 && !productIdsFilter.includes(productId)) {
              continue;
            }
            
            if (!activeSubscriptionsByPrice[priceId]) {
              activeSubscriptionsByPrice[priceId] = 0;
            }
            activeSubscriptionsByPrice[priceId]++;
            
          } catch (error) {
            console.error(`❌ Error checking product for subscription price ${priceId}:`, error);
            continue;
          }
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
