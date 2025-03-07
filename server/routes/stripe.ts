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
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Configure webhook raw body handling
router.use('/webhook', express.raw({ type: 'application/json' }));

// Enhanced webhook handler
router.post('/webhook', async (req: Request, res) => {
  const sig = req.headers['stripe-signature'];
  console.log('🔔 Webhook received:', {
    type: req.headers['content-type'],
    signature: !!sig
  });

  try {
    if (!sig) {
      throw new Error('No Stripe signature found');
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('📦 Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
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

          console.log('✅ Subscription activated:', {
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
        if (!user) {
          throw new Error(`No user found for customer: ${customerId}`);
        }

        await storage.updateUserSubscription(
          user.id,
          subscription.id,
          subscription.status
        );

        console.log('📝 Subscription updated:', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });
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