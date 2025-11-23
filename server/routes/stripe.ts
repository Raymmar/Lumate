/**
 * Stripe Webhook Configuration:
 * Base URL: process.env.APP_URL || 'http://localhost:3000'
 * Webhook Path: /api/stripe/webhook
 * Full webhook URL should be: https://lumate.replit.app/api/stripe/webhook
 */

import express from "express";
import { storage } from "../storage";
import { StripeService } from "../services/stripe";

const router = express.Router();

// Add proper debug logging at the top of the file
router.use((req, res, next) => {
  const startTime = Date.now();
  console.log("🔄 Stripe route request received:", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    sessionId: req.query.session_id,
  });

  // Add response logging
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log("🔄 Stripe route response sent:", {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Simple ping endpoint for testing
router.get("/ping", (req, res) => {
  console.log("🏓 Stripe routes ping received");
  res.json({ status: "ok" });
});

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  try {
    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error("Stripe price ID is not configured");
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a new customer if one doesn't exist
    if (!user.stripeCustomerId || user.stripeCustomerId === "NULL") {
      const customer = await StripeService.createCustomer(user.email, user.id);
      await storage.setStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
    }

    const session = await StripeService.createCheckoutSession(
      user.stripeCustomerId,
      process.env.STRIPE_PRICE_ID,
      user.id,
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Verify checkout session status
router.get("/session-status", async (req, res) => {
  const startTime = Date.now();
  console.log("🔍 Session verification request received:", {
    timestamp: new Date().toISOString(),
    sessionId: req.query.session_id,
  });

  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      console.log("❌ No session ID provided");
      return res.status(400).json({ error: "Session ID is required" });
    }

    const sessionDetails = await StripeService.verifySession(sessionId);

    const responseTime = Date.now() - startTime;
    console.log("✅ Session verification completed:", {
      duration: `${responseTime}ms`,
      sessionId,
      status: sessionDetails.status,
      paymentStatus: sessionDetails.paymentStatus,
    });

    // If payment is confirmed, return complete status
    if (sessionDetails.paymentStatus === "paid") {
      console.log("💳 Payment confirmed as paid");
      return res.json({
        status: "complete",
        subscription: sessionDetails.subscriptionDetails,
      });
    }

    // If payment is still processing, return pending status
    console.log("⏳ Payment pending:", sessionDetails.paymentStatus);
    return res.json({
      status: "pending",
      debug: {
        sessionStatus: sessionDetails.status,
        paymentStatus: sessionDetails.paymentStatus,
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error("❌ Session verification failed:", {
      duration: `${responseTime}ms`,
      error: error.message,
      type: error.type,
      code: error.code,
    });

    return res.status(500).json({
      error: "Failed to verify session status",
      message: error.message,
      type: error.type,
    });
  }
});

// Cancel subscription
router.post("/cancel-subscription", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscriptionId || user.subscriptionId === "NULL") {
      return res.status(400).json({ error: "No active subscription found" });
    }

    console.log("🔄 Cancelling subscription:", {
      userId,
      subscriptionId: user.subscriptionId,
    });

    const cancelledSubscription = await StripeService.cancelSubscription(
      user.subscriptionId,
    );

    console.log("✅ Subscription cancelled:", {
      subscriptionId: cancelledSubscription.id,
      status: cancelledSubscription.status,
    });

    // Update the user's subscription status in the database
    await storage.updateUserSubscription(
      user.id,
      cancelledSubscription.id,
      cancelledSubscription.status,
    );

    res.json({
      status: "success",
      message: "Subscription cancelled successfully",
    });
  } catch (error: any) {
    console.error("❌ Error cancelling subscription:", error);
    res.status(500).json({
      error: "Failed to cancel subscription",
      message: error.message,
    });
  }
});

// Create customer portal session
router.post("/create-portal-session", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.stripeCustomerId || user.stripeCustomerId === "NULL") {
      return res.status(400).json({ error: "No customer record found" });
    }

    const session = await StripeService.createCustomerPortalSession(
      user.stripeCustomerId,
    );
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Error creating portal session:", error);
    res.status(500).json({
      error: "Failed to create portal session",
      message: error.message,
    });
  }
});

router.get("/subscription-status", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user is admin, they always have access
    if (user.isAdmin) {
      return res.json({ status: "active" });
    }

    if (!user.stripeCustomerId || user.stripeCustomerId === "NULL") {
      return res.json({ status: "inactive" });
    }

    try {
      const subscriptionStatus = await StripeService.getSubscriptionStatus(
        user.stripeCustomerId,
      );
      return res.json(subscriptionStatus);
    } catch (error: any) {
      // If customer not found, return inactive status instead of error
      if (error?.raw?.code === "resource_missing") {
        console.log("Customer not found, returning inactive status");
        return res.json({ status: "inactive" });
      }
      throw error; // Re-throw other errors to be caught by outer catch block
    }
  } catch (error: any) {
    console.error("Error checking subscription status:", error);
    return res.status(500).json({
      error: "Failed to check subscription status",
      message: error.message,
    });
  }
});

router.get("/revenue", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get revenue data from synced Stripe database
    const revenueData = await storage.getStripeSubscriptionRevenue();

    return res.json(revenueData);
  } catch (error: any) {
    console.error("Error fetching revenue data:", error);
    return res.status(500).json({
      error: "Failed to fetch revenue data",
      message: error.message,
    });
  }
});

export default router;
