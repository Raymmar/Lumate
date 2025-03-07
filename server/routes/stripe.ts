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

        // Immediately retrieve subscription details
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

          console.log('✅ Updated subscription:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });
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

    // For subscriptions, we need to check both session and subscription status
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

    // For non-subscription payments
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