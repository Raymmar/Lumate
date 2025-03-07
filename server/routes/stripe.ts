import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { StripeService } from '../services/stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('No user found for Stripe customer:', customerId);
          return res.status(400).send('No user found');
        }

        await storage.updateUser(user.id, {
          subscriptionStatus: subscription.status,
          subscriptionId: subscription.id,
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      const customer = await StripeService.createCustomer(user.email, user.id);
      user.stripeCustomerId = customer.id;
    }

    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      priceId,
      user.id
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;