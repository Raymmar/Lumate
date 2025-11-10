import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { hasActivePremium } from "../utils/premiumCheck";

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

// Middleware to require premium membership AND company admin privileges (or system admin)
export const requirePremiumOrCompanyAdmin = (companyIdParam: string = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // System admins bypass all requirements
      if (user.isAdmin) {
        return next();
      }
      
      // Check if user has active premium
      if (!hasActivePremium(user)) {
        return res.status(403).json({ 
          error: "Premium membership required",
          message: "Managing company profiles requires an active premium membership" 
        });
      }
      
      // Check if user is a company admin/owner
      const companyId = parseInt(req.params[companyIdParam]);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId, companyId);
      if (!isCompanyAdmin) {
        return res.status(403).json({ 
          error: "Company admin access required",
          message: "You must be an admin or owner of this company to make changes" 
        });
      }
      
      next();
    } catch (error) {
      console.error("Error checking premium and company admin status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};