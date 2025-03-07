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

    // Create or use existing Stripe customer
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

// Simplified webhook handler - focus on subscription completion
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret');
      return res.status(400).send('Missing signature or secret');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('Webhook signature verified:', event.type);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Processing completed checkout:', session.id);

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const customerId = subscription.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('No user found for customer:', customerId);
          return res.status(400).json({ error: 'No user found' });
        }

        await storage.updateUserSubscription(
          user.id,
          subscription.id,
          subscription.status
        );

        console.log('Updated subscription for user:', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Subscription status check
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
    return res.json({ status });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

export default router;