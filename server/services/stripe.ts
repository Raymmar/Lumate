import Stripe from 'stripe';
import { storage } from '../storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

export class StripeService {
  static async createCustomer(email: string, userId: number) {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId: userId.toString(),
        },
      });

      // Update user with Stripe customer ID
      await storage.updateUser(userId, {
        stripeCustomerId: customer.id,
      });

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

  static async createCheckoutSession(customerId: string, priceId: string, userId: number) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
}