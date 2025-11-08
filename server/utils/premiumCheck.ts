import { User } from "@shared/schema";

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