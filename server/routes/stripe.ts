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

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error('STRIPE_PRICE_ID not configured');
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId || customerId === 'NULL') {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString() }
      });
      customerId = customer.id;
      await storage.setStripeCustomerId(user.id, customer.id);
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:3000'}/subscription/cancel`,
      metadata: { userId: user.id.toString() },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add proper debug logging
router.use((req, res, next) => {
  const startTime = Date.now();
  console.log('🔄 Stripe route request:', {
    method: req.method,
    path: req.path,
    sessionId: req.query.session_id
  });
  next();
});

// Webhook handler - This must be first to handle raw body
router.post('/webhook', async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('📦 Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['customer'] }
          );

          const customerId = subscription.customer as string;
          const user = await storage.getUserByStripeCustomerId(customerId);

          if (!user) {
            throw new Error(`No user found for customer: ${customerId}`);
          }

          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const user = await storage.getUserByStripeCustomerId(customerId);

        if (user) {
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
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

// Simple session verification endpoint
router.get('/session-status', async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      return res.json({
        status: session.payment_status === 'paid' && subscription.status === 'active'
          ? 'complete'
          : 'pending',
        session: {
          paymentStatus: session.payment_status,
          subscriptionStatus: subscription.status
        }
      });
    }

    return res.json({
      status: session.payment_status === 'paid' ? 'complete' : 'pending',
      session: {
        paymentStatus: session.payment_status
      }
    });

  } catch (error: any) {
    console.error('Session verification error:', error);
    res.status(500).json({
      error: 'Failed to verify session',
      message: error.message
    });
  }
});

export default router;