import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
});

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

  static async createCheckoutSession(customerId: string, priceId: string, userId: number, couponId?: string) {
    try {
      console.log('Creating checkout session with:', { customerId, priceId, userId, couponId });

      // Get the base URL with production URL as default
      const isProd = process.env.NODE_ENV === 'production';
      const baseUrl = isProd 
        ? 'https://lumate.replit.app'
        : (process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000');

      console.log('Using base URL for Stripe redirects:', baseUrl);

      if (!priceId || !priceId.startsWith('price_')) {
        throw new Error(`Invalid price ID format: ${priceId}. Price ID should start with 'price_'`);
      }

      // Create session configuration
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
        },
      };

      // Add coupon if provided
      if (couponId) {
        sessionConfig.discounts = [{
          coupon: couponId,
        }];
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('Successfully created checkout session:', {
        sessionId: session.id,
        url: session.url,
        successUrl: session.success_url,
        cancelUrl: session.cancel_url,
        hasCoupon: !!couponId
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
}