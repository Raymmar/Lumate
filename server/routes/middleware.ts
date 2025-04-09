import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

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