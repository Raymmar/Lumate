import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertCompanySchema, insertCompanyMemberSchema } from "@shared/schema";

// Middleware for authentication and authorization
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const router = Router();

// Get all companies
router.get("/", async (req: Request, res: Response) => {
  try {
    const companies = await storage.getCompanies();
    res.json({ companies });
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// Get a company by ID or name
router.get("/:idOrName", async (req: Request, res: Response) => {
  try {
    const idOrName = req.params.idOrName;
    const id = parseInt(idOrName);
    let company;
    
    if (!isNaN(id)) {
      // It's a numeric ID
      company = await storage.getCompanyById(id);
    } else {
      // Treat it as a company name 
      // First fetch all companies
      const companies = await storage.getCompanies();
      
      // Find the company with a matching name slug (lowercase, hyphenated)
      company = companies.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === idOrName.toLowerCase()
      );
    }
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ company });
  } catch (error) {
    console.error("Failed to fetch company:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// Create a new company (requires authentication)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate the company data
    const { customLinks, ...otherData } = req.body;
    const companyData = insertCompanySchema.parse(otherData);
    
    // Create the company
    // Handle custom links separately to avoid type issues
    const company = await storage.createCompany({
      ...companyData,
      customLinks: customLinks ? JSON.stringify(customLinks) : null
    });
    
    // Add the current user as an admin of the company
    if (req.session.userId) {
      await storage.addMemberToCompany({
        companyId: company.id,
        userId: req.session.userId,
        role: "admin",
        title: "Owner",
        isPublic: true,
        addedBy: req.session.userId
      });
    }
    
    res.status(201).json({ company });
  } catch (error) {
    console.error("Failed to create company:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error("Detailed error:", JSON.stringify(error));
    res.status(500).json({ 
      error: "Failed to create company",
      message: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Update a company (requires company admin)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Verify the user is a company admin
    const isAdmin = await storage.isCompanyAdmin(req.session.userId!, id);
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Validate the company data
    const { customLinks, ...otherData } = req.body;
    const companyData = insertCompanySchema.partial().parse(otherData);
    
    // Update the company
    // Handle custom links separately to avoid type issues
    const company = await storage.updateCompany(id, {
      ...companyData,
      customLinks: customLinks ? JSON.stringify(customLinks) : null
    });
    
    res.json({ company });
  } catch (error) {
    console.error("Failed to update company:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update company" });
  }
});

// Delete a company (requires company admin)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Verify the user is a company admin
    const isAdmin = await storage.isCompanyAdmin(req.session.userId!, id);
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete the company
    await storage.deleteCompany(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete company:", error);
    res.status(500).json({ error: "Failed to delete company" });
  }
});

// Get company members
router.get("/:idOrName/members", async (req: Request, res: Response) => {
  try {
    const idOrName = req.params.idOrName;
    const id = parseInt(idOrName);
    let companyId;
    
    if (!isNaN(id)) {
      // It's a numeric ID
      companyId = id;
    } else {
      // Treat it as a company name
      // First fetch all companies
      const companies = await storage.getCompanies();
      
      // Find the company with a matching name slug (lowercase, hyphenated)
      const company = companies.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === idOrName.toLowerCase()
      );
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      companyId = company.id;
    }

    const members = await storage.getCompanyMembers(companyId);
    res.json({ members });
  } catch (error) {
    console.error("Failed to fetch company members:", error);
    res.status(500).json({ error: "Failed to fetch company members" });
  }
});

// Add a member to a company (requires company admin)
router.post("/:id/members", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Verify the user is a company admin
    const isAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Validate the member data
    const memberSchema = z.object({
      userId: z.number(),
      role: z.string().default("user"),
      title: z.string().optional(),
      isPublic: z.boolean().default(true)
    });

    const memberData = memberSchema.parse(req.body);
    
    // Add the member
    const member = await storage.addMemberToCompany({
      companyId,
      userId: memberData.userId,
      role: memberData.role,
      title: memberData.title,
      isPublic: memberData.isPublic,
      addedBy: req.session.userId!
    });
    
    res.status(201).json({ member });
  } catch (error) {
    console.error("Failed to add company member:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to add company member" });
  }
});

// Update a member's role (requires company admin)
router.put("/:companyId/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const userId = parseInt(req.params.userId);
    if (isNaN(companyId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    // Verify the user is a company admin
    const isAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Validate the role data
    const roleSchema = z.object({
      role: z.string()
    });

    const { role } = roleSchema.parse(req.body);
    
    // Update the member's role
    const member = await storage.updateCompanyMemberRole(companyId, userId, role);
    
    res.json({ member });
  } catch (error) {
    console.error("Failed to update company member role:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update company member role" });
  }
});

// Remove a member from a company (requires company admin)
router.delete("/:companyId/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const userId = parseInt(req.params.userId);
    if (isNaN(companyId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    // Verify the user is a company admin
    const isAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Remove the member
    await storage.removeCompanyMember(companyId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to remove company member:", error);
    res.status(500).json({ error: "Failed to remove company member" });
  }
});

// Get user's companies
router.get("/user/companies", requireAuth, async (req: Request, res: Response) => {
  try {
    const companies = await storage.getUserCompanies(req.session.userId!);
    res.json({ companies });
  } catch (error) {
    console.error("Failed to fetch user companies:", error);
    res.status(500).json({ error: "Failed to fetch user companies" });
  }
});

export default router;