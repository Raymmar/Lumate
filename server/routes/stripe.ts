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
  console.log('🔄 Stripe route request received:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    sessionId: req.query.session_id
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log('🔄 Stripe route response sent:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
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

    // Create a new customer if one doesn't exist
    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
    }

    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      process.env.STRIPE_PRICE_ID,
      user.id
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  console.log('🔔 Webhook received:', {
    type: req.headers['content-type'],
    signature: sig,
    url: req.originalUrl
  });

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('📦 Webhook event:', {
      type: event.type,
      id: event.id,
      object: event.data.object.object
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Processing completed checkout session:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
              expand: ['customer', 'default_payment_method']
            }
          );

          console.log('🔍 Retrieved subscription details:', {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer
          });

          const user = await storage.getUserByStripeCustomerId(session.customer as string);
          if (!user) {
            console.error('❌ No user found for customer:', session.customer);
            throw new Error(`No user found for customer: ${session.customer}`);
          }

          console.log('✏️ Updating subscription for user:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });

          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );

          console.log('✅ Subscription updated successfully');
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Processing subscription change:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        });

        const user = await storage.getUserByStripeCustomerId(subscription.customer as string);
        if (user) {
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );
          console.log('✅ Subscription status updated for user:', user.id);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(400).json({
      error: 'Webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get subscription status
router.get('/subscription-status', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user is admin, they always have access
    if (user.isAdmin) {
      return res.json({ status: 'active' });
    }

    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      return res.json({ status: 'inactive' });
    }

    const status = await StripeService.getSubscriptionStatus(user.stripeCustomerId);
    res.json(status);
  } catch (error: any) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({
      error: 'Failed to check subscription status',
      message: error.message
    });
  }
});

// Verify checkout session status
router.get('/session-status', async (req, res) => {
  const startTime = Date.now();
  console.log('🔍 Session verification request received:', {
    timestamp: new Date().toISOString(),
    sessionId: req.query.session_id,
  });

  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      console.log('❌ No session ID provided');
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionDetails = await StripeService.verifySession(sessionId);

    const responseTime = Date.now() - startTime;
    console.log('✅ Session verification completed:', {
      duration: `${responseTime}ms`,
      sessionId,
      status: sessionDetails.status,
      paymentStatus: sessionDetails.paymentStatus
    });

    if (sessionDetails.paymentStatus === 'paid') {
      console.log('💳 Payment confirmed as paid');
      return res.json({ 
        status: 'complete',
        subscription: sessionDetails.subscriptionDetails 
      });
    }

    console.log('⏳ Payment pending:', sessionDetails.paymentStatus);
    return res.json({
      status: 'pending',
      debug: {
        sessionStatus: sessionDetails.status,
        paymentStatus: sessionDetails.paymentStatus
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Session verification failed:', {
      duration: `${responseTime}ms`,
      error: error.message,
      type: error.type,
      code: error.code
    });

    return res.status(500).json({
      error: 'Failed to verify session status',
      message: error.message,
      type: error.type
    });
  }
});

// Create customer portal session
router.post('/create-portal-session', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      return res.status(400).json({ error: 'No customer record found' });
    }

    const session = await StripeService.createCustomerPortalSession(user.stripeCustomerId);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscriptionId || user.subscriptionId === 'NULL') {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    console.log('🔄 Cancelling subscription:', {
      userId,
      subscriptionId: user.subscriptionId
    });

    const cancelledSubscription = await StripeService.cancelSubscription(user.subscriptionId);

    console.log('✅ Subscription cancelled:', {
      subscriptionId: cancelledSubscription.id,
      status: cancelledSubscription.status
    });

    // Update the user's subscription status in the database
    await storage.updateUserSubscription(
      user.id,
      cancelledSubscription.id,
      cancelledSubscription.status
    );

    res.json({
      status: 'success',
      message: 'Subscription cancelled successfully'
    });
  } catch (error: any) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

export default router;