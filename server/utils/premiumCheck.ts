import { User } from "@shared/schema";
import { db } from "../db";
import { users, events, attendance } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Checks if a user has active premium access from any source
 * Sources: Stripe subscription, Luma tickets, or Manual admin grants
 */
export function hasActivePremium(user: User | null): boolean {
  if (!user) return false;
  
  // Check Stripe subscription
  if (user.subscriptionStatus === 'active') {
    return true;
  }
  
  // Check manual or Luma premium grants
  if (user.premiumSource && user.premiumExpiresAt) {
    const expirationDate = new Date(user.premiumExpiresAt);
    const now = new Date();
    
    if (expirationDate > now) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets the active premium source for a user
 */
export function getActivePremiumSource(user: User | null): string | null {
  if (!user) return null;
  
  // Check Stripe subscription first (highest priority)
  if (user.subscriptionStatus === 'active') {
    return 'stripe';
  }
  
  // Check manual or Luma premium grants
  if (user.premiumSource && user.premiumExpiresAt) {
    const expirationDate = new Date(user.premiumExpiresAt);
    const now = new Date();
    
    if (expirationDate > now) {
      return user.premiumSource;
    }
  }
  
  return null;
}

/**
 * Gets the premium expiration date for a user
 * Returns null if subscription is active (no expiration) or no premium
 */
export function getPremiumExpiration(user: User | null): Date | null {
  if (!user) return null;
  
  // Active Stripe subscriptions don't have expiration dates
  if (user.subscriptionStatus === 'active') {
    return null;
  }
  
  // Check manual or Luma premium grants
  if (user.premiumSource && user.premiumExpiresAt) {
    const expirationDate = new Date(user.premiumExpiresAt);
    const now = new Date();
    
    if (expirationDate > now) {
      return expirationDate;
    }
  }
  
  return null;
}

/**
 * Checks if premium access is about to expire (within 30 days)
 */
export function isPremiumExpiringSoon(user: User | null): boolean {
  const expiration = getPremiumExpiration(user);
  
  if (!expiration) return false;
  
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  return expiration <= thirtyDaysFromNow;
}

/**
 * Formats premium status for display
 */
export function formatPremiumStatus(user: User | null): {
  hasAccess: boolean;
  source: string | null;
  expiresAt: Date | null;
  isExpiringSoon: boolean;
  displayText: string;
} {
  const hasAccess = hasActivePremium(user);
  const source = getActivePremiumSource(user);
  const expiresAt = getPremiumExpiration(user);
  const isExpiringSoon = isPremiumExpiringSoon(user);
  
  let displayText = 'No Premium Access';
  
  if (hasAccess) {
    switch (source) {
      case 'stripe':
        displayText = 'Premium Subscriber';
        break;
      case 'luma':
        displayText = 'Premium (Luma Ticket)';
        break;
      case 'manual':
        displayText = 'Premium (Admin Grant)';
        break;
      default:
        displayText = 'Premium Member';
    }
  }
  
  return {
    hasAccess,
    source,
    expiresAt,
    isExpiringSoon,
    displayText,
  };
}

/**
 * Checks if a user should have premium access based on their ticket purchases
 * and grants it if they're eligible. This should be called when:
 * - A user creates/verifies their account
 * - A user's attendance records change
 * - An admin wants to sync premium access
 * 
 * @param userId The user's database ID
 * @returns Object with whether premium was granted and details
 */
export async function checkAndGrantPremiumFromTickets(userId: number): Promise<{
  granted: boolean;
  source: 'luma' | null;
  expiresAt: string | null;
  ticketTypeId: string | null;
}> {
  try {
    // Get the user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return { granted: false, source: null, expiresAt: null, ticketTypeId: null };
    }
    
    const user = userResult[0];
    
    // Don't override active Stripe subscriptions
    if (user.subscriptionStatus === 'active') {
      console.log(`User ${user.email} has active Stripe subscription, skipping Luma premium grant`);
      return { granted: false, source: null, expiresAt: null, ticketTypeId: null };
    }
    
    // Don't override manual premium grants unless Luma ticket extends beyond manual grant
    const hasActiveManualPremium = user.premiumSource === 'manual' && 
      user.premiumExpiresAt && 
      new Date(user.premiumExpiresAt) > new Date();
    
    // Get all attendance records for this user
    const userAttendance = await db
      .select({
        attendance: attendance,
        event: events,
      })
      .from(attendance)
      .leftJoin(events, eq(attendance.eventApiId, events.api_id))
      .where(eq(attendance.userEmail, user.email.toLowerCase()));
    
    // Find all qualifying tickets (events that grant premium + user has qualifying ticket type)
    const qualifyingTickets = userAttendance.filter(record => {
      const event = record.event;
      const att = record.attendance;
      
      return event?.grantsPremiumAccess && 
             att.ticketTypeId && 
             event.premiumTicketTypes?.includes(att.ticketTypeId);
    });
    
    if (qualifyingTickets.length === 0) {
      console.log(`User ${user.email} has no qualifying premium tickets`);
      return { granted: false, source: null, expiresAt: null, ticketTypeId: null };
    }
    
    // Find the ticket with the latest expiration date
    let latestExpiration: string | null = null;
    let latestTicketTypeId: string | null = null;
    
    for (const record of qualifyingTickets) {
      const event = record.event!;
      const att = record.attendance;
      
      const expiresAt = event.premiumExpiresAt || 
        new Date(`${new Date(event.startTime).getFullYear()}-12-31T23:59:59Z`).toISOString();
      
      if (!latestExpiration || new Date(expiresAt) > new Date(latestExpiration)) {
        latestExpiration = expiresAt;
        latestTicketTypeId = att.ticketTypeId;
      }
    }
    
    // Check if we should update
    // Only update if:
    // 1. User has no premium at all, OR
    // 2. User has expired premium (any source), OR
    // 3. User has Luma premium and the new ticket extends it, OR
    // 4. User has active manual premium but the Luma ticket extends beyond manual expiration
    const hasActiveLumaPremium = user.premiumSource === 'luma' && 
      user.premiumExpiresAt && 
      new Date(user.premiumExpiresAt) > new Date();
    
    let shouldUpdate = false;
    
    if (!user.premiumSource) {
      // No existing premium - grant it
      shouldUpdate = true;
    } else if (user.premiumSource === 'manual') {
      // User has manual premium
      if (hasActiveManualPremium) {
        // Active manual premium - only update if Luma extends beyond it
        shouldUpdate = !!(latestExpiration && new Date(latestExpiration) > new Date(user.premiumExpiresAt!));
        if (shouldUpdate) {
          console.log(`Luma ticket extends manual premium for ${user.email}, updating to Luma`);
        } else {
          console.log(`User ${user.email} has active manual premium, skipping Luma grant (manual expires ${user.premiumExpiresAt}, ticket expires ${latestExpiration})`);
        }
      } else {
        // Expired or missing manual premium - grant Luma
        shouldUpdate = true;
        console.log(`User ${user.email} has expired/missing manual premium, granting Luma premium`);
      }
    } else if (user.premiumSource === 'luma') {
      // Has Luma premium - update if new ticket extends it
      shouldUpdate = !!(latestExpiration && new Date(latestExpiration) > new Date(user.premiumExpiresAt!));
    }
    
    if (shouldUpdate && latestExpiration && latestTicketTypeId) {
      await db
        .update(users)
        .set({
          premiumSource: 'luma',
          premiumExpiresAt: latestExpiration,
          premiumGrantedAt: new Date().toISOString(),
          lumaTicketId: latestTicketTypeId,
        })
        .where(eq(users.id, userId));
      
      console.log(`Granted premium access to ${user.email} through ${latestExpiration} (ticket: ${latestTicketTypeId})`);
      
      return {
        granted: true,
        source: 'luma',
        expiresAt: latestExpiration,
        ticketTypeId: latestTicketTypeId,
      };
    }
    
    return { granted: false, source: null, expiresAt: null, ticketTypeId: null };
    
  } catch (error) {
    console.error('Error checking and granting premium from tickets:', error);
    return { granted: false, source: null, expiresAt: null, ticketTypeId: null };
  }
}