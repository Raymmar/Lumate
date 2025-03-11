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
      });

      console.log('✅ Checkout session created:', {
        sessionId: session.id,
        customerId,
      });

      return session;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  static async verifySession(sessionId: string) {
    try {
      console.log('🔍 Verifying session:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription']
      });

      console.log('📦 Session details:', {
        id: session.id,
        status: session.status,
        customerId: session.customer,
        subscriptionId: session.subscription
      });

      if (session.subscription && typeof session.subscription === 'object') {
        const subscription = session.subscription;

        if (typeof session.customer === 'string') {
          const user = await storage.getUserByStripeCustomerId(session.customer);
          if (user) {
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
          subscriptionDetails: {
            id: subscription.id,
            status: subscription.status,
            customerId: typeof session.customer === 'string' ? session.customer : null
          }
        };
      }

      return {
        isValid: true,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionDetails: null
      };
    } catch (error) {
      console.error('❌ Error verifying session:', error);
      throw error;
    }
  }
  static async createCustomerPortalSession(customerId: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log('Creating customer portal session for:', customerId);

      // Use production URL, fallback to environment URL only in development
      const returnUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `${process.env.REPLIT_DEPLOYMENT_URL}/settings`
        : 'http://localhost:3000/settings';

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
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