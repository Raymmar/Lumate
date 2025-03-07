import Stripe from 'stripe';
import { storage } from '../storage';

// Test mode configuration
const isTestMode = process.env.STRIPE_TEST_MODE === 'true';
if (isTestMode) {
  console.log('⚠️ Stripe running in TEST mode');
  if (!process.env.STRIPE_TEST_PRICE_ID) {
    throw new Error('STRIPE_TEST_PRICE_ID must be defined in test mode');
  }
}

// Initialize Stripe with the appropriate secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Price IDs for different environments
const TEST_PRICE_ID = process.env.STRIPE_TEST_PRICE_ID!;
const PROD_PRICE_ID = 'price_1Qs63DCM3nBpAbtwkRVcXEmS';

export class StripeService {
  static async createCustomer(email: string, userId: number) {
    try {
      console.log('Creating Stripe customer for:', email);
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId: userId.toString(),
        },
      });

      // Update user with Stripe customer ID
      await storage.setStripeCustomerId(userId, customer.id);

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  static async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  static async createCheckoutSession(customerId: string, userId: number) {
    try {
      console.log('Creating checkout session with:', { customerId, userId });

      // Use environment variables with fallbacks for success/cancel URLs
      const baseUrl = process.env.APP_URL || process.env.REPL_SLUG
        ? `https://${process.env.REPL_SLUG}.repl.co`
        : 'http://localhost:3000';

      console.log('Creating session with base URL:', baseUrl);

      // Determine which price ID to use based on environment
      const isTestMode = process.env.STRIPE_TEST_MODE === 'true';
      const actualPriceId = isTestMode ? TEST_PRICE_ID : PROD_PRICE_ID;

      console.log(`Operating in ${isTestMode ? 'TEST' : 'PRODUCTION'} mode with price ID:`, actualPriceId);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: actualPriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
        },
      });

      console.log('Successfully created checkout session:', session.id);
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  static async getSubscriptionStatus(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription.status;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }
}