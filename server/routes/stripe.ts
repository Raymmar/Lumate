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
    console.log("⭐️ Creating checkout session");
    if (!process.env.STRIPE_PRICE_ID) {
      console.error("STRIPE_PRICE_ID environment variable not set");
      throw new Error('Stripe price ID is not configured');
    }

    const userId = req.session?.userId;
    if (!userId) {
      console.error("User not authenticated");
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { couponId } = req.body;
    console.log("Request body:", req.body);

    const user = await storage.getUserById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Stripe customer if not exists or if it's NULL
    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      console.log('Creating new Stripe customer for user:', user.email);
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
      console.log('Created new Stripe customer:', customer.id);
    }

    console.log('Creating checkout session with customer:', user.stripeCustomerId);
    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      process.env.STRIPE_PRICE_ID,
      user.id,
      couponId
    );

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler - no middleware needed as it's handled in index.ts
router.post('/webhook', async (req, res) => {
  console.log("⚡️ Webhook received:", {
    path: req.path,
    contentType: req.headers['content-type'],
    hasSignature: !!req.headers['stripe-signature']
  });

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('❌ No Stripe signature found');
    return res.status(400).send('No Stripe signature');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    console.log('🔐 Verifying webhook signature...');
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('🔄 Processing webhook event:', event.type);
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Processing completed checkout:', {
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (session.subscription) {
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = subscription.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('❌ No user found for Stripe customer:', customerId);
            return res.status(400).send('No user found');
          }

          await storage.updateUserSubscription(
            user.id,
            subscription.id,
            subscription.status
          );

          console.log('✅ Updated user subscription from checkout:', {
            userId: user.id,
            subscriptionId: subscription.id,
            status: subscription.status
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('💫 Processing subscription event:', {
          type: event.type,
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status
        });

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('❌ No user found for Stripe customer:', customerId);
          return res.status(400).send('No user found');
        }

        await storage.updateUserSubscription(
          user.id,
          subscription.id,
          subscription.status
        );

        console.log('✅ Updated subscription for user:', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });
        break;
      }

      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('❌ Error processing webhook:', err);
    return res.status(500).send(`Webhook Error: ${err.message}`);
  }
});

// Status check endpoint
router.get('/subscription/status', async (req, res) => {
  console.log("📊 Checking subscription status");
  try {
    const userId = req.session?.userId;
    if (!userId) {
      console.error("User not authenticated");
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      console.error("User not found:", userId);
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