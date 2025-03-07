import express, { Request } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { StripeService } from '../services/stripe';

const router = express.Router();

// Ensure we have the required environment variables
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Required Stripe environment variables are not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia'
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

    // Create or retrieve Stripe customer
    const customerId = await StripeService.getOrCreateCustomer(user);
    if (!customerId) {
      throw new Error('Failed to create/retrieve Stripe customer');
    }

    // Create checkout session
    const session = await StripeService.createCheckoutSession(
      customerId,
      process.env.STRIPE_PRICE_ID,
      userId
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// IMPORTANT: Configure webhook raw body handling before any other middleware
// This ensures we get the raw body for signature verification
router.use('/webhook', express.raw({type: 'application/json'}));

// Enhanced webhook handler
router.post('/webhook', async (req: Request, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    if (!sig) {
      console.error('❌ No Stripe signature in request headers');
      return res.status(400).json({ error: 'No Stripe signature found' });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ No webhook secret configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature with detailed error logging
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook signature verified for event:', event.type);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        signatureHeader: sig.substring(0, 10) + '...',
        bodyLength: req.body?.length,
        secretKeyFirstChars: process.env.STRIPE_WEBHOOK_SECRET.substring(0, 5) + '...',
        requestTimestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log('📦 Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          metadata: session.metadata
        });

        if (session.subscription) {
          // Retrieve subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = subscription.customer as string;

          console.log('📝 Retrieved subscription:', {
            subscriptionId: subscription.id,
            status: subscription.status,
            customerId
          });

          // Find user by customer ID
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('❌ No user found for customer:', customerId);
            throw new Error(`No user found for customer: ${customerId}`);
          }

          console.log('👤 Found user:', {
            userId: user.id,
            email: user.email
          });

          // Update user subscription
          try {
            await storage.updateUserSubscription(
              user.id,
              subscription.id,
              subscription.status
            );

            console.log('✅ Successfully updated user subscription:', {
              userId: user.id,
              subscriptionId: subscription.id,
              status: subscription.status
            });
          } catch (error) {
            console.error('❌ Failed to update user subscription:', error);
            throw error;
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('📝 Processing subscription update:', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId
        });

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('❌ No user found for customer:', customerId);
          throw new Error(`No user found for customer: ${customerId}`);
        }

        try {
          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );

          console.log('✅ Updated subscription status:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });
        } catch (error) {
          console.error('❌ Failed to update subscription status:', error);
          throw error;
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(400).json({
      error: 'Webhook error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple test endpoint for webhook verification
router.post('/webhook-test', async (req, res) => {
  console.log('🔔 Test webhook received:', {
    headers: req.headers,
    body: req.body
  });
  res.json({ received: true });
});

// Status check endpoint
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.subscriptionId) {
      return res.json({ status: 'inactive' });
    }

    const status = await StripeService.getSubscriptionStatus(user.subscriptionId);
    console.log('📈 Current subscription status:', status);
    return res.json({ status });
  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    return res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

export default router;