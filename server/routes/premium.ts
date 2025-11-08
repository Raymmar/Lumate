import { Router } from "express";
import { db } from "../db";
import { attendance, events, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "./middleware";
import { hasActivePremium } from "../utils/premiumCheck";

const router = Router();

// Get unique ticket types from attendance records for an event
router.get("/api/admin/events/:eventId/ticket-types", requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Get the event details
    const event = await db
      .select()
      .from(events)
      .where(eq(events.api_id, eventId))
      .limit(1);
    
    if (!event || event.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get unique ticket types from attendance records for this event
    const ticketTypes = await db
      .selectDistinct({
        ticketTypeId: attendance.ticketTypeId,
        ticketTypeName: attendance.ticketTypeName,
      })
      .from(attendance)
      .where(eq(attendance.eventApiId, eventId));

    // Filter out null values and return unique ticket types
    const uniqueTicketTypes = ticketTypes
      .filter((t) => t.ticketTypeId && t.ticketTypeName)
      .map((t) => ({
        id: t.ticketTypeId,
        name: t.ticketTypeName,
      }));

    res.json({ 
      ticketTypes: uniqueTicketTypes,
      event: {
        api_id: event[0].api_id,
        title: event[0].title,
        grantsPremiumAccess: event[0].grantsPremiumAccess,
        premiumTicketTypes: event[0].premiumTicketTypes || [],
        premiumExpiresAt: event[0].premiumExpiresAt,
      }
    });
  } catch (error) {
    console.error("Failed to fetch ticket types:", error);
    res.status(500).json({
      error: "Failed to fetch ticket types",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Update premium settings for an event
router.patch("/api/admin/events/:eventId/premium-settings", requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { grantsPremiumAccess, premiumTicketTypes, premiumExpiresAt } = req.body;

    // Get the event to extract the year from startTime
    const eventData = await db
      .select()
      .from(events)
      .where(eq(events.api_id, eventId))
      .limit(1);

    if (!eventData || eventData.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Calculate expiration date: end of the event's year
    const eventYear = new Date(eventData[0].startTime).getFullYear();
    const calculatedExpiresAt = premiumExpiresAt || new Date(`${eventYear}-12-31T23:59:59Z`).toISOString();

    // Update the event premium settings
    await db
      .update(events)
      .set({
        grantsPremiumAccess: grantsPremiumAccess,
        premiumTicketTypes: premiumTicketTypes || [],
        premiumExpiresAt: calculatedExpiresAt,
      })
      .where(eq(events.api_id, eventId));

    // If enabling premium access, process existing attendees
    if (grantsPremiumAccess && premiumTicketTypes?.length > 0) {
      // Get all attendance records for this event with the selected ticket types
      const eligibleAttendees = await db
        .select({
          attendance: attendance,
          user: users,
        })
        .from(attendance)
        .leftJoin(users, eq(attendance.userId, users.id))
        .where(
          and(
            eq(attendance.eventApiId, eventId),
            sql`${attendance.ticketTypeId} = ANY(${premiumTicketTypes})`
          )
        );

      let processedCount = 0;
      let updatedCount = 0;

      // Grant premium access to eligible users
      for (const record of eligibleAttendees) {
        processedCount++;
        if (record.user && record.attendance.ticketTypeId) {
          // Check if user already has active premium from another source
          const hasActiveStripePremium = record.user.subscriptionStatus === 'active';
          const hasActiveLumaPremium = record.user.premiumSource === 'luma' && 
            record.user.premiumExpiresAt && 
            new Date(record.user.premiumExpiresAt) > new Date();

          // Update premium access if they don't have Stripe subscription
          // or if the new expiration date is later than their current Luma expiration
          if (!hasActiveStripePremium) {
            const shouldUpdate = !hasActiveLumaPremium || 
              (new Date(calculatedExpiresAt) > new Date(record.user.premiumExpiresAt!));
            
            if (shouldUpdate) {
              await db
                .update(users)
                .set({
                  premiumSource: 'luma',
                  premiumExpiresAt: calculatedExpiresAt,
                  premiumGrantedAt: new Date().toISOString(),
                  lumaTicketId: record.attendance.ticketTypeId,
                })
                .where(eq(users.id, record.user.id));
              updatedCount++;
            }
          }
        }
      }

      res.json({
        message: "Premium settings updated successfully",
        eventId,
        settings: {
          grantsPremiumAccess,
          premiumTicketTypes,
          premiumExpiresAt: calculatedExpiresAt,
        },
        processed: processedCount,
        updated: updatedCount,
      });
    } else {
      res.json({
        message: "Premium settings updated successfully",
        eventId,
        settings: {
          grantsPremiumAccess,
          premiumTicketTypes,
          premiumExpiresAt: calculatedExpiresAt,
        },
      });
    }
  } catch (error) {
    console.error("Failed to update premium settings:", error);
    res.status(500).json({
      error: "Failed to update premium settings",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get premium member statistics
router.get("/api/admin/premium/stats", requireAdmin, async (req, res) => {
  try {
    // Count users by premium source
    const stats = await db
      .select({
        stripeCount: sql<number>`COUNT(*) FILTER (WHERE subscription_status = 'active')`,
        lumaCount: sql<number>`COUNT(*) FILTER (WHERE premium_source = 'luma' AND premium_expires_at > NOW())`,
        manualCount: sql<number>`COUNT(*) FILTER (WHERE premium_source = 'manual' AND premium_expires_at > NOW())`,
        totalActive: sql<number>`COUNT(*) FILTER (WHERE 
          subscription_status = 'active' OR 
          (premium_source IN ('luma', 'manual') AND premium_expires_at > NOW()))`,
      })
      .from(users);

    res.json(stats[0] || { stripeCount: 0, lumaCount: 0, manualCount: 0, totalActive: 0 });
  } catch (error) {
    console.error("Failed to fetch premium stats:", error);
    res.status(500).json({
      error: "Failed to fetch premium statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Manual premium management for a specific user (via members endpoint)
router.patch("/api/admin/members/:memberId/premium", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.memberId);
    const adminUserId = req.session!.userId!;
    const { grantPremium, expiresAt, notes } = req.body;

    if (grantPremium) {
      // Grant manual premium access
      await db
        .update(users)
        .set({
          premiumSource: 'manual',
          premiumExpiresAt: expiresAt,
          premiumGrantedBy: adminUserId,
          premiumGrantedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId));

      res.json({
        message: "Premium access granted successfully",
        userId,
        expiresAt,
        grantedBy: adminUserId,
        grantPremium: true,
      });
    } else {
      // Revoke manual premium access (only if source is 'manual')
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user[0].premiumSource === 'manual') {
        await db
          .update(users)
          .set({
            premiumSource: null,
            premiumExpiresAt: null,
            premiumGrantedBy: null,
            lumaTicketId: null,
          })
          .where(eq(users.id, userId));

        res.json({
          message: "Manual premium access revoked successfully",
          userId,
          grantPremium: false,
        });
      } else {
        res.json({
          message: "Cannot revoke non-manual premium access",
          currentSource: user[0].premiumSource,
          grantPremium: false,
        });
      }
    }
  } catch (error) {
    console.error("Failed to update user premium status:", error);
    res.status(500).json({
      error: "Failed to update user premium status",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Manual premium management for a specific user (original endpoint)
router.patch("/api/admin/users/:userId/premium", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminUserId = req.session!.userId!;
    const { grantPremium, expiresAt, notes } = req.body;

    if (grantPremium) {
      // Grant manual premium access
      await db
        .update(users)
        .set({
          premiumSource: 'manual',
          premiumExpiresAt: expiresAt,
          premiumGrantedBy: adminUserId,
          premiumGrantedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId));

      res.json({
        message: "Premium access granted successfully",
        userId,
        expiresAt,
        grantedBy: adminUserId,
      });
    } else {
      // Revoke manual premium access (only if source is 'manual')
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user[0].premiumSource === 'manual') {
        await db
          .update(users)
          .set({
            premiumSource: null,
            premiumExpiresAt: null,
            premiumGrantedBy: null,
            lumaTicketId: null,
          })
          .where(eq(users.id, userId));

        res.json({
          message: "Manual premium access revoked successfully",
          userId,
        });
      } else {
        res.json({
          message: "Cannot revoke non-manual premium access",
          currentSource: user[0].premiumSource,
        });
      }
    }
  } catch (error) {
    console.error("Failed to update user premium status:", error);
    res.status(500).json({
      error: "Failed to update user premium status",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;