import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    console.log("⭐️ Creating checkout session");

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

    // Determine the base URL for redirects
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://lumate.replit.app'
      : 'http://localhost:5000';

    console.log('Using base URL for redirects:', baseUrl);

    // Create or use existing Stripe customer
    if (!user.stripeCustomerId || user.stripeCustomerId === 'NULL') {
      console.log('Creating new Stripe customer for user:', user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString(),
        },
      });
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
      console.log('Created new Stripe customer:', customer.id);
    }

    console.log('Creating checkout session with:', {
      customerId: user.stripeCustomerId,
      priceId: process.env.STRIPE_PRICE_ID,
      successUrl: `${baseUrl}/subscription/success`,
      cancelUrl: `${baseUrl}/subscription/cancel`
    });

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
    });

    console.log('Checkout session created successfully:', {
      sessionId: session.id,
      url: session.url
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Simple webhook handler
router.post('/webhook', async (req, res) => {
  console.log('🔔 Webhook received:', {
    type: req.headers['content-type'],
    signature: !!req.headers['stripe-signature']
  });

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('📦 Webhook event:', event.type, JSON.stringify(event.data.object));

    // Only handle subscription completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

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

        console.log('✅ Subscription updated:', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Status check endpoint
router.get('/subscription/status', async (req, res) => {
  console.log("📊 Checking subscription status");
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