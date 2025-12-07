import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { events, users, coupons, people } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAdmin, requireAuth } from "./middleware";
import { lumaApiRequest } from "../routes";
import { z } from "zod";
import { sendCouponNotificationEmail } from "../email";

const router = Router();

function generateCouponCode(eventPrefix: string, recipientId: number): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `${eventPrefix}-${recipientId}-${random}`;
  return code.substring(0, 20);
}

function sanitizeCustomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9\-_]/g, '').substring(0, 50);
}

interface CouponRecipient {
  id: number;
  email: string;
  userId: number | null;
  personId: number | null;
  type: 'user' | 'person';
}

const generateCouponsSchema = z.object({
  eventApiId: z.string().min(1, "Event is required"),
  ticketTypeId: z.string().optional(),
  ticketTypeName: z.string().optional(),
  discountType: z.enum(['percent', 'dollars']).default('percent'),
  discountPercent: z.number().min(1).max(100).optional(),
  dollarOff: z.number().min(0.01).optional(),
  validStartAt: z.string().optional(),
  validEndAt: z.string().optional(),
  couponType: z.enum(['targeted', 'general']).default('targeted'),
  targetGroup: z.enum(['activePremium']).optional(),
  recipientIds: z.array(z.number()).optional(),
  customCode: z.string().min(3).max(50).optional(),
  maxUses: z.number().min(1).max(10000).optional(),
}).refine(data => {
  if (data.discountType === 'percent') {
    return data.discountPercent !== undefined && data.discountPercent >= 1 && data.discountPercent <= 100;
  }
  return data.dollarOff !== undefined && data.dollarOff > 0;
}, {
  message: "Discount value is required and must be valid for the selected discount type"
}).refine(data => {
  if (data.couponType === 'general') {
    return data.customCode !== undefined && data.customCode.length >= 3;
  }
  return true;
}, {
  message: "Custom code is required for general use coupons"
});

router.get("/api/admin/coupons", requireAdmin, async (req, res) => {
  try {
    const { eventApiId, status } = req.query;
    
    const filters: { eventApiId?: string; status?: string } = {};
    if (eventApiId && typeof eventApiId === 'string') {
      filters.eventApiId = eventApiId;
    }
    if (status && typeof status === 'string') {
      filters.status = status;
    }
    
    const couponsList = await storage.getCoupons(filters);
    
    const uniqueEvents = Array.from(new Set(couponsList.map(c => c.eventApiId)));
    const eventStats = uniqueEvents.map(eventId => {
      const eventCoupons = couponsList.filter(c => c.eventApiId === eventId);
      return {
        eventApiId: eventId,
        eventTitle: eventCoupons[0]?.eventTitle || 'Unknown Event',
        total: eventCoupons.length,
        issued: eventCoupons.filter(c => c.status === 'issued').length,
        redeemed: eventCoupons.filter(c => c.status === 'redeemed').length,
        expired: eventCoupons.filter(c => c.status === 'expired').length,
      };
    });
    
    res.json({ 
      coupons: couponsList,
      stats: eventStats,
    });
  } catch (error) {
    console.error("Failed to fetch coupons:", error);
    res.status(500).json({
      error: "Failed to fetch coupons",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/api/admin/coupons/generate", requireAdmin, async (req, res) => {
  try {
    const adminUserId = req.session!.userId!;
    const validatedData = generateCouponsSchema.parse(req.body);
    
    const event = await db
      .select()
      .from(events)
      .where(eq(events.api_id, validatedData.eventApiId))
      .limit(1);
    
    if (!event || event.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const eventData = event[0];
    const eventPrefix = eventData.title
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 6)
      .toUpperCase();

    const isGeneralCoupon = validatedData.couponType === 'general';
    const discountType = validatedData.discountType || 'percent';
    const centsOff = discountType === 'dollars' && validatedData.dollarOff 
      ? Math.round(validatedData.dollarOff * 100) 
      : null;
    const discountPercent = discountType === 'percent' ? validatedData.discountPercent : null;
    const maxUses = validatedData.maxUses || 1;

    if (isGeneralCoupon) {
      const couponCode = sanitizeCustomCode(validatedData.customCode!);
      
      if (couponCode.length < 3) {
        return res.status(400).json({ 
          error: "Invalid coupon code",
          message: "Coupon code must contain at least 3 valid characters (letters, numbers, hyphens, underscores)"
        });
      }
      
      const existingCoupon = await db
        .select()
        .from(coupons)
        .where(and(
          eq(coupons.eventApiId, validatedData.eventApiId),
          eq(coupons.code, couponCode)
        ))
        .limit(1);
      
      if (existingCoupon.length > 0) {
        return res.status(400).json({ 
          error: "Coupon code already exists",
          message: `A coupon with code "${couponCode}" already exists for this event`
        });
      }

      const lumaPayload: any = {
        code: couponCode,
        event_api_id: validatedData.eventApiId,
        remaining_count: maxUses,
        discount: discountType === 'percent' 
          ? { discount_type: "percent", percent_off: discountPercent }
          : { discount_type: "cents", cents_off: centsOff },
      };
      
      if (validatedData.ticketTypeId) {
        lumaPayload.discount.ticket_api_ids = [validatedData.ticketTypeId];
      }
      if (validatedData.validStartAt) {
        lumaPayload.valid_start_at = validatedData.validStartAt;
      }
      if (validatedData.validEndAt) {
        lumaPayload.valid_end_at = validatedData.validEndAt;
      }
      
      console.log(`Creating general Luma coupon:`, couponCode);
      
      const lumaResponse = await lumaApiRequest("event/create-coupon", undefined, {
        method: "POST",
        body: JSON.stringify(lumaPayload),
      });
      
      const lumaCouponApiId = lumaResponse?.coupon?.api_id || null;
      
      const couponData = {
        eventApiId: validatedData.eventApiId,
        eventTitle: eventData.title,
        eventUrl: eventData.url || null,
        ticketTypeId: validatedData.ticketTypeId || null,
        ticketTypeName: validatedData.ticketTypeName || null,
        code: couponCode,
        lumaCouponApiId,
        recipientUserId: null,
        recipientPersonId: null,
        recipientEmail: null,
        discountPercent,
        centsOff,
        discountType,
        couponType: 'general' as const,
        maxUses,
        remainingCount: maxUses,
        validStartAt: validatedData.validStartAt || null,
        validEndAt: validatedData.validEndAt || null,
        status: 'issued',
        issuedByUserId: adminUserId,
      };
      
      const createdCoupon = await storage.createCoupon(couponData);
      
      return res.json({
        success: true,
        message: `Created general coupon "${couponCode}" for ${eventData.title}`,
        results: { created: 1, failed: 0, skipped: 0, errors: [] },
        coupons: [createdCoupon],
      });
    }
    
    let recipients: CouponRecipient[] = [];
    
    if (validatedData.targetGroup === 'activePremium') {
      const premiumUsers = await storage.getActivePremiumMembers();
      const usersWithEmail = premiumUsers.filter(u => u.email);
      
      const userEmails = usersWithEmail.map(u => u.email);
      const matchedPeople = userEmails.length > 0 
        ? await db.select().from(people).where(inArray(people.email, userEmails))
        : [];
      const personEmailMap = new Map(matchedPeople.map(p => [p.email, p.id]));
      
      recipients = usersWithEmail.map(user => ({
        id: user.id,
        email: user.email,
        userId: user.id,
        personId: personEmailMap.get(user.email) || null,
        type: 'user' as const,
      }));
    } else if (validatedData.recipientIds && validatedData.recipientIds.length > 0) {
      const peopleResult = await db
        .select()
        .from(people)
        .where(inArray(people.id, validatedData.recipientIds));
      
      const peopleEmails = peopleResult.map(p => p.email).filter(Boolean);
      const matchedUsers = peopleEmails.length > 0 
        ? await db.select().from(users).where(inArray(users.email, peopleEmails as string[]))
        : [];
      const userEmailMap = new Map(matchedUsers.map(u => [u.email, u.id]));
      
      recipients = peopleResult
        .filter(p => p.email)
        .map(person => ({
          id: person.id,
          email: person.email!,
          userId: userEmailMap.get(person.email!) || null,
          personId: person.id,
          type: 'person' as const,
        }));
    }
    
    if (recipients.length === 0) {
      return res.status(400).json({ 
        error: "No eligible recipients found",
        message: "No users match the selected target group"
      });
    }
    
    const existingCouponsForEvent = await db
      .select({ recipientEmail: coupons.recipientEmail })
      .from(coupons)
      .where(eq(coupons.eventApiId, validatedData.eventApiId));
    
    const existingRecipientEmails = new Set(
      existingCouponsForEvent
        .filter((c): c is { recipientEmail: string } => c.recipientEmail != null)
        .map(c => c.recipientEmail.toLowerCase())
    );
    
    const originalCount = recipients.length;
    recipients = recipients.filter(
      r => !existingRecipientEmails.has(r.email.toLowerCase())
    );
    const skippedCount = originalCount - recipients.length;
    
    if (recipients.length === 0) {
      return res.status(400).json({ 
        error: "All recipients already have coupons",
        message: `All ${originalCount} selected recipients already have a coupon for this event`
      });
    }
    
    const results = {
      created: 0,
      failed: 0,
      skipped: skippedCount,
      errors: [] as string[],
    };
    
    const createdCoupons = [];
    
    for (const recipient of recipients) {
      try {
        const couponCode = generateCouponCode(eventPrefix, recipient.id);
        
        const lumaPayload: any = {
          code: couponCode,
          event_api_id: validatedData.eventApiId,
          remaining_count: 1,
          discount: discountType === 'percent'
            ? { discount_type: "percent", percent_off: discountPercent }
            : { discount_type: "cents", cents_off: centsOff },
        };
        
        if (validatedData.ticketTypeId) {
          lumaPayload.discount.ticket_api_ids = [validatedData.ticketTypeId];
        }
        
        if (validatedData.validStartAt) {
          lumaPayload.valid_start_at = validatedData.validStartAt;
        }
        if (validatedData.validEndAt) {
          lumaPayload.valid_end_at = validatedData.validEndAt;
        }
        
        console.log(`Creating Luma coupon for ${recipient.email}:`, couponCode);
        
        const lumaResponse = await lumaApiRequest("event/create-coupon", undefined, {
          method: "POST",
          body: JSON.stringify(lumaPayload),
        });
        
        const lumaCouponApiId = lumaResponse?.coupon?.api_id || null;
        
        const couponData = {
          eventApiId: validatedData.eventApiId,
          eventTitle: eventData.title,
          eventUrl: eventData.url || null,
          ticketTypeId: validatedData.ticketTypeId || null,
          ticketTypeName: validatedData.ticketTypeName || null,
          code: couponCode,
          lumaCouponApiId,
          recipientUserId: recipient.userId,
          recipientPersonId: recipient.personId,
          recipientEmail: recipient.email,
          discountPercent,
          centsOff,
          discountType,
          couponType: 'targeted' as const,
          maxUses: 1,
          remainingCount: 1,
          validStartAt: validatedData.validStartAt || null,
          validEndAt: validatedData.validEndAt || null,
          status: 'issued',
          issuedByUserId: adminUserId,
        };
        
        const createdCoupon = await storage.createCoupon(couponData);
        createdCoupons.push(createdCoupon);
        results.created++;
        
        if (eventData.url && couponCode) {
          const registrationLink = `${eventData.url}?coupon=${couponCode}`;
          try {
            const emailInfo: {
              eventTitle: string;
              discountPercent?: number;
              dollarOff?: number;
              registrationLink: string;
              expirationDate?: string;
            } = {
              eventTitle: eventData.title,
              registrationLink,
              expirationDate: validatedData.validEndAt,
            };
            
            if (discountType === 'percent' && discountPercent) {
              emailInfo.discountPercent = discountPercent;
            } else if (centsOff) {
              emailInfo.dollarOff = centsOff / 100;
            }
            
            await sendCouponNotificationEmail(recipient.email, {
              eventTitle: eventData.title,
              discountPercent: discountPercent || 0,
              registrationLink,
              expirationDate: validatedData.validEndAt,
            });
            console.log(`Coupon notification email sent to ${recipient.email}`);
          } catch (emailError) {
            console.error(`Failed to send coupon email to ${recipient.email}:`, emailError);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed for ${recipient.email}: ${errorMessage}`);
        console.error(`Failed to create coupon for ${recipient.email}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Generated ${results.created} coupons for ${eventData.title}`,
      results,
      coupons: createdCoupons,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    
    console.error("Failed to generate coupons:", error);
    res.status(500).json({
      error: "Failed to generate coupons",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.patch("/api/admin/coupons/:couponId/status", requireAdmin, async (req, res) => {
  try {
    const couponId = parseInt(req.params.couponId);
    const { status } = req.body;
    
    if (!['issued', 'redeemed', 'expired'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const redeemedAt = status === 'redeemed' ? new Date().toISOString() : undefined;
    const updatedCoupon = await storage.updateCouponStatus(couponId, status, redeemedAt);
    
    res.json({ 
      success: true,
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Failed to update coupon status:", error);
    res.status(500).json({
      error: "Failed to update coupon status",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/api/user/coupons", requireAuth, async (req, res) => {
  try {
    const userId = req.session!.userId!;
    
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userCoupons = await storage.getCouponsByUser(userId, user[0].email);
    
    const activeCoupons = userCoupons.filter(coupon => {
      if (coupon.status === 'redeemed' || coupon.status === 'expired') {
        return false;
      }
      
      if (coupon.validEndAt) {
        const endDate = new Date(coupon.validEndAt);
        if (endDate < new Date()) {
          return false;
        }
      }
      
      return true;
    });
    
    res.json({ 
      coupons: activeCoupons,
      hasUnclaimedCoupons: activeCoupons.some(c => c.status === 'issued'),
    });
  } catch (error) {
    console.error("Failed to fetch user coupons:", error);
    res.status(500).json({
      error: "Failed to fetch user coupons",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/api/admin/coupons/eligible-events", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    const futureEvents = await db
      .select()
      .from(events)
      .where(sql`${events.startTime} > ${now.toISOString()}`)
      .orderBy(sql`${events.startTime} ASC`);
    
    res.json({ 
      events: futureEvents.map(e => ({
        api_id: e.api_id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        coverUrl: e.coverUrl,
        url: e.url,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch eligible events:", error);
    res.status(500).json({
      error: "Failed to fetch eligible events",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/api/admin/coupons/premium-members-count", requireAdmin, async (req, res) => {
  try {
    const premiumMembers = await storage.getActivePremiumMembers();
    res.json({ count: premiumMembers.length });
  } catch (error) {
    console.error("Failed to fetch premium members count:", error);
    res.status(500).json({
      error: "Failed to fetch premium members count",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/api/admin/coupons/preview", requireAdmin, async (req, res) => {
  try {
    const { eventApiId, targetGroup, recipientIds } = req.body;
    
    if (!eventApiId) {
      return res.status(400).json({ error: "Event is required" });
    }
    
    let totalRecipients = 0;
    let recipientEmails: string[] = [];
    
    if (targetGroup === 'activePremium') {
      const premiumUsers = await storage.getActivePremiumMembers();
      const usersWithEmail = premiumUsers.filter(u => u.email);
      totalRecipients = usersWithEmail.length;
      recipientEmails = usersWithEmail.map(u => u.email.toLowerCase());
    } else if (recipientIds && recipientIds.length > 0) {
      const peopleResult = await db
        .select()
        .from(people)
        .where(inArray(people.id, recipientIds));
      
      totalRecipients = peopleResult.filter(p => p.email).length;
      recipientEmails = peopleResult.filter(p => p.email).map(p => p.email!.toLowerCase());
    }
    
    // Check existing coupons for this event
    const existingCouponsForEvent = await db
      .select({ recipientEmail: coupons.recipientEmail })
      .from(coupons)
      .where(eq(coupons.eventApiId, eventApiId));
    
    const existingRecipientEmails = new Set(
      existingCouponsForEvent
        .filter((c): c is { recipientEmail: string } => c.recipientEmail != null)
        .map(c => c.recipientEmail.toLowerCase())
    );
    
    const alreadyHaveCoupons = recipientEmails.filter(
      email => existingRecipientEmails.has(email)
    ).length;
    
    const willReceive = totalRecipients - alreadyHaveCoupons;
    
    res.json({
      total: totalRecipients,
      willReceive,
      alreadyHaveCoupons,
    });
  } catch (error) {
    console.error("Failed to preview coupons:", error);
    res.status(500).json({
      error: "Failed to preview coupon recipients",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
