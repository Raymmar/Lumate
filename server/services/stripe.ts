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

      console.log('Successfully created Stripe customer:', customer.id);
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  static async verifySession(sessionId: string) {
    try {
      console.log('Verifying Stripe session:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      });

      // Get subscription details if available
      const subscription = session.subscription as Stripe.Subscription;

      let subscriptionDetails = null;
      if (subscription) {
        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          customerId: session.customer as string,
        };

        // Update user subscription in database if customer exists
        const user = await storage.getUserByStripeCustomerId(session.customer as string);
        if (user) {
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
          console.log('Updated subscription details for user:', user.id);
        }
      }

      return {
        isValid: true,
        status: session.status,
        customerId: session.customer as string,
        subscriptionId: session.subscription as string,
        paymentStatus: session.payment_status,
        subscriptionDetails
      };
    } catch (error) {
      console.error('Error verifying session:', error);
      throw error;
    }
  }

  static async createCheckoutSession(customerId: string, priceId: string, userId: number, couponId?: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log('Creating checkout session with:', { customerId, priceId, userId, couponId });

      // Always use the production URL
      const baseUrl = 'https://lumate.replit.app';
      console.log('Using base URL:', baseUrl);

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
        allow_promotion_codes: true,
        expand: ['subscription']
      };

      if (couponId) {
        sessionConfig.discounts = [{
          coupon: couponId,
        }];
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('Successfully created checkout session:', {
        sessionId: session.id,
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

  static async getSubscriptionStatus(subscriptionId: string) {
    try {
      if (!subscriptionId || subscriptionId === 'NULL') {
        throw new Error('Invalid subscription ID');
      }

      console.log('Fetching subscription status for:', subscriptionId);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('Retrieved subscription status:', subscription.status);
      return subscription.status;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
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
}
