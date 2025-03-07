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
      console.error('Missing STRIPE_PRICE_ID environment variable');
      throw new Error('Stripe price ID is not configured');
    }

    const userId = req.session?.userId;
    if (!userId) {
      console.log('Unauthorized attempt to create checkout session - no userId in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Creating checkout session for user:', { 
      userId, 
      email: user.email,
      stripeCustomerId: user.stripeCustomerId || 'none',
      priceId: process.env.STRIPE_PRICE_ID
    });

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      console.log('No Stripe customer ID found, creating new customer');
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
      console.log('Created new Stripe customer:', customer.id);
    }

    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      process.env.STRIPE_PRICE_ID,
      user.id
    );

    console.log('Successfully created checkout session:', {
      sessionId: session.id,
      url: session.url
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error.message || 'Failed to create checkout session';
    res.status(500).json({ 
      error: 'Failed to create checkout session', 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('Received webhook request at:', new Date().toISOString());
  console.log('Webhook Headers:', {
    'stripe-signature': req.headers['stripe-signature'] ? 'Present' : 'Missing',
    'content-type': req.headers['content-type'],
  });

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('No Stripe signature found in webhook request');
    return res.status(400).send('No Stripe signature');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    console.log('Attempting to construct webhook event...');
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('Successfully constructed webhook event:', {
      type: event.type,
      id: event.id,
      apiVersion: event.api_version
    });
  } catch (err: any) {
    console.error('Webhook signature verification failed:', {
      error: err.message,
      type: err.type,
      code: err.code
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed:', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          paymentStatus: session.payment_status
        });

        // The subscription will be activated by the customer.subscription.created event
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('Processing subscription event:', {
          type: event.type,
          customerId,
          subscriptionId: subscription.id,
          status: subscription.status
        });

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('No user found for Stripe customer:', customerId);
          return res.status(400).send('No user found');
        }

        await storage.updateUserSubscription(
          user.id,
          subscription.id,
          subscription.status
        );

        console.log('Successfully updated user subscription:', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
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

export default router;