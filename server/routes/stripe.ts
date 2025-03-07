import express from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { StripeService } from '../services/stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
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

    console.log('Creating checkout session for user:', { userId, email: user.email });

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
    }

    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      'price_1Qs63DCM3nBpAbtwkRVcXEmS', // Use the exact price ID
      user.id
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error.message || 'Failed to create checkout session';
    res.status(500).json({ 
      error: 'Failed to create checkout session', 
      message: errorMessage
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    console.log('Received webhook request:', {
      path: req.path,
      method: req.method,
      headers: {
        'stripe-signature': sig?.substring(0, 10) + '...',
        'content-type': req.headers['content-type']
      }
    });

    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('Received webhook event:', event.type, JSON.stringify(event.data.object, null, 2));
  } catch (err: any) {
    console.error('Webhook signature verification failed:', {
      error: err.message,
      stack: err.stack,
      headers: req.headers
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('Processing subscription event:', {
          type: event.type,
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          metadata: subscription.metadata,
          items: subscription.items.data.map(item => ({
            priceId: item.price.id,
            quantity: item.quantity
          }))
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
          status: subscription.status,
          timestamp: new Date().toISOString()
        });
        break;
      }

      // Handle checkout.session.completed for one-time payments if needed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', {
          sessionId: session.id,
          customerId: session.customer,
          paymentStatus: session.payment_status,
          mode: session.mode,
          subscriptionId: session.subscription,
          metadata: session.metadata,
          amountTotal: session.amount_total,
          currency: session.currency
        });

        // For subscription mode, the subscription event will handle the status update
        if (session.mode === 'subscription' && session.subscription) {
          console.log('Subscription created:', session.subscription);
        }
        break;
      }

      // Log other events we might want to handle in the future
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', {
      error: err.message,
      stack: err.stack,
      eventType: event.type,
      eventId: event.id
    });
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
});

export default router;