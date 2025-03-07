/**
 * Stripe Webhook Configuration:
 * Base URL: process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000'
 * Webhook Path: /api/stripe/webhook
 * Full webhook URL should be: https://lumate.replit.app/api/stripe/webhook
 */

import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { StripeService } from '../services/stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

// Simple ping endpoint for testing
router.get('/ping', (req, res) => {
  console.log('🏓 Stripe routes ping received');
  res.json({ status: 'ok' });
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error('Stripe price ID is not configured');
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
    }

    // Always use the production URL
    const baseUrl = 'https://lumate.replit.app';
    console.log('Using base URL:', baseUrl);

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id.toString(),
      },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
  console.log('🔔 Webhook received:', {
    type: req.headers['content-type'],
    signature: !!req.headers['stripe-signature'],
    url: req.originalUrl,
    body: JSON.stringify(req.body)
  });

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('📦 Webhook event:', event.type, JSON.stringify(event.data.object));

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Processing completed checkout session:', session.id);

        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = subscription.customer as string;

          console.log('🔍 Looking up user for customer:', customerId);
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (!user) {
            console.error('❌ No user found for customer:', customerId);
            throw new Error(`No user found for customer: ${customerId}`);
          }

          console.log('✏️ Updating subscription for user:', user.id);
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );

          console.log('✅ Subscription updated:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });
        } else {
          console.warn('⚠️ Session missing subscription or customer:', session.id);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('🔄 Processing subscription change:', subscription.id);
        const user = await storage.getUserByStripeCustomerId(customerId);

        if (user) {
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
          console.log('✅ Subscription status updated:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });
        } else {
          console.warn('⚠️ No user found for subscription update:', customerId);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Verify checkout session status
router.get('/session-status', async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;
    console.log('🔍 Session verification request received:', {
      sessionId,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7)
    });

    if (!sessionId) {
      console.log('❌ No session ID provided');
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      console.log('📦 Attempting to retrieve session from Stripe:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      console.log('✅ Session retrieved successfully:', {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
        hasPaymentIntent: !!session.payment_intent
      });

      if (session.payment_status === 'paid') {
        console.log('💰 Payment confirmed as paid');
        return res.json({ status: 'complete' });
      }

      console.log('⏳ Payment not yet confirmed:', session.payment_status);
      return res.json({ 
        status: 'pending',
        debug: {
          sessionStatus: session.status,
          paymentStatus: session.payment_status
        }
      });

    } catch (stripeError: any) {
      console.error('❌ Stripe API Error:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message
      });
      throw stripeError;
    }

  } catch (error: any) {
    console.error('❌ Session verification failed:', {
      error: error.message,
      type: error.type,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Failed to verify session status',
      message: error.message,
      type: error.type
    });
  }
});

export default router;