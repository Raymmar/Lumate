import Stripe from 'stripe';
import { storage } from '../storage';
import type { User } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be defined');
}

// Initialize Stripe with production configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  // Ensure we're using production URL
  host: 'api.stripe.com'
});

export class StripeService {
  static async getOrCreateCustomer(user: User): Promise<string> {
    try {
      if (user.stripeCustomerId && user.stripeCustomerId !== 'NULL') {
        // Verify the customer exists
        try {
          await stripe.customers.retrieve(user.stripeCustomerId);
          return user.stripeCustomerId;
        } catch (error) {
          console.log('Invalid customer ID, creating new customer');
        }
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString(),
        },
      });

      await storage.setStripeCustomerId(user.id, customer.id);
      return customer.id;
    } catch (error) {
      console.error('Error in getOrCreateCustomer:', error);
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
      console.log('Fetching subscription status for:', subscriptionId);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('Retrieved subscription status:', subscription.status);
      return subscription.status;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }

  static async createCheckoutSession(customerId: string, priceId: string, userId: number) {
    try {
      if (!customerId || customerId === 'NULL') {
        throw new Error('Invalid customer ID');
      }

      console.log('Creating checkout session with:', { customerId, priceId, userId });

      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://lumate.replit.app'
        : (process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000');

      console.log('Using base URL:', baseUrl);

      const session = await stripe.checkout.sessions.create({
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
        allow_promotion_codes: true,
      });

      console.log('Successfully created checkout session:', {
        sessionId: session.id,
        url: session.url,
        customerId,
        successUrl: session.success_url,
        cancelUrl: session.cancel_url
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
}