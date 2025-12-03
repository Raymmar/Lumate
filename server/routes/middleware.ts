import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { hasActivePremium, checkCompanyHasPremiumAccess } from "../utils/premiumCheck";

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Middleware to require admin privileges
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUserById(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Middleware to require company admin privileges
export const requireCompanyAdmin = (companyIdParam: string = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const companyId = parseInt(req.params[companyIdParam]);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const isAdmin = await storage.isCompanyAdmin(req.session.userId, companyId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking company admin status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

// Middleware to require premium membership OR admin privileges
export const requirePremiumOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // System admins bypass premium requirement
    if (user.isAdmin) {
      return next();
    }
    
    // Check if user has active premium (Stripe subscription or Luma/manual grant)
    if (!hasActivePremium(user)) {
      return res.status(403).json({ 
        error: "Premium membership required",
        message: "This feature requires an active premium membership" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error checking premium status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Middleware to require company admin privileges with company-level premium access
// Access is granted if:
// 1. User is a system admin
// 2. User has their own active premium membership
// 3. User is a company admin/owner AND the company has premium access (sponsor or owner premium)
export const requirePremiumOrCompanyAdmin = (companyIdParam: string = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('[PremiumOrCompanyAdmin] Checking access for request:', { 
      path: req.path, 
      method: req.method,
      userId: req.session.userId,
      companyIdParam
    });
    
    if (!req.session.userId) {
      console.log('[PremiumOrCompanyAdmin] No session userId - unauthorized');
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        console.log('[PremiumOrCompanyAdmin] User not found');
        return res.status(401).json({ error: "User not found" });
      }
      
      console.log('[PremiumOrCompanyAdmin] User found:', { 
        userId: user.id, 
        email: user.email, 
        isAdmin: user.isAdmin,
        subscriptionStatus: user.subscriptionStatus,
        premiumSource: user.premiumSource
      });
      
      // System admins bypass all requirements
      if (user.isAdmin) {
        console.log('[PremiumOrCompanyAdmin] User is system admin - granting access');
        return next();
      }
      
      // Check if user has their own active premium - if so, they can manage any company they're admin of
      const userHasPremium = hasActivePremium(user);
      console.log('[PremiumOrCompanyAdmin] User premium status:', { hasActivePremium: userHasPremium });
      
      if (userHasPremium) {
        console.log('[PremiumOrCompanyAdmin] User has personal premium - granting access');
        return next();
      }
      
      // Get the company ID from the request
      const companyId = parseInt(req.params[companyIdParam]);
      console.log('[PremiumOrCompanyAdmin] Checking company access:', { 
        companyIdParam, 
        rawValue: req.params[companyIdParam],
        parsedCompanyId: companyId 
      });
      
      if (isNaN(companyId)) {
        console.log('[PremiumOrCompanyAdmin] Invalid company ID');
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      // Check if user is a company admin/owner of THIS specific company
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId, companyId);
      console.log('[PremiumOrCompanyAdmin] Company admin check:', { 
        userId: req.session.userId, 
        companyId, 
        isCompanyAdmin 
      });
      
      if (!isCompanyAdmin) {
        console.log('[PremiumOrCompanyAdmin] User is not company admin - access denied');
        return res.status(403).json({ 
          error: "Access denied",
          message: "You must be an admin or owner of this company to make changes" 
        });
      }
      
      // User is a company admin - now check if the company has premium access
      // (either through sponsorship or owner's premium membership)
      const companyHasPremium = await checkCompanyHasPremiumAccess(companyId);
      console.log('[PremiumOrCompanyAdmin] Company premium check:', { 
        companyId, 
        companyHasPremium 
      });
      
      if (companyHasPremium) {
        console.log('[PremiumOrCompanyAdmin] Company has premium access - granting access');
        return next();
      }
      
      // Company admin but company doesn't have premium access
      console.log('[PremiumOrCompanyAdmin] Company lacks premium - access denied');
      return res.status(403).json({ 
        error: "Premium access required",
        message: "This company requires premium access to make changes. The company owner can subscribe or the company can become a sponsor." 
      });
    } catch (error) {
      console.error("[PremiumOrCompanyAdmin] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};