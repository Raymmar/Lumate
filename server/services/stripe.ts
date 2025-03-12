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
      console.log('🔍 Verifying session:', sessionId);

      // Retrieve session with expanded subscription data
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription']
      });

      console.log('📦 Session details:', {
        id: session.id,
        status: session.status,
        customerId: session.customer,
        subscriptionId: session.subscription?.id || null
      });

      // Get the full subscription object if it exists
      let subscriptionDetails = null;
      if (session.subscription) {
        const subscription = session.subscription as Stripe.Subscription;

        console.log('💳 Subscription details:', {
          id: subscription.id,
          status: subscription.status,
          customerId: session.customer
        });

        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          customerId: session.customer as string
        };

        // Update user subscription in database
        const user = await storage.getUserByStripeCustomerId(session.customer as string);
        if (user) {
          console.log('✏️ Updating user subscription:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });

          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
        }
      }

      return {
        isValid: true,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionDetails
      };
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      throw error;
    }
  }

  static async createCheckoutSession(customerId: string, priceId: string, userId: number) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log('Creating checkout session:', {
        customerId,
        priceId,
        userId
      });

      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000';
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
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
      });

      console.log('✅ Checkout session created:', {
        sessionId: session.id,
        customerId,
        subscriptionId: session.subscription?.id
      });

      return session;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  static async getSubscriptionStatus(customerId: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      if (customerId === 'NULL') {
        return { status: 'inactive' };
      }

      console.log('🔍 Checking subscription status for customer:', customerId);

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: 'active',
      });

      if (subscriptions.data.length === 0) {
        console.log('❌ No active subscription found for customer:', customerId);
        return { status: 'inactive' };
      }

      const subscription = subscriptions.data[0];
      console.log('✅ Found subscription:', {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
      });

      return {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        subscriptionId: subscription.id
      };
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return { status: 'inactive' };
      }
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      if (!subscriptionId) {
        throw new Error('Subscription ID is required');
      }

      console.log('🔄 Cancelling subscription:', subscriptionId);

      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      console.log('✅ Subscription cancelled:', {
        id: subscription.id,
        status: subscription.status
      });

      return subscription;
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      throw error;
    }
  }

  static async createCustomerPortalSession(customerId: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log('Creating customer portal session for:', customerId);

      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000';
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/settings`,
      });

      console.log('✅ Customer portal session created:', {
        sessionId: session.id,
        url: session.url
      });

      return session;
    } catch (error) {
      console.error('❌ Error creating customer portal session:', error);
      throw error;
    }
  }
}