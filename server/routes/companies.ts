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

// Get a company by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    const company = await storage.getCompanyById(id);
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
    
    // Generate a slug from the company name for URL-friendly references
    const slug = companyData.name ? generateSlug(companyData.name) : null;
    
    // Create the company with the generated slug
    const company = await storage.createCompany({
      ...companyData,
      customLinks: customLinks ? customLinks : null,
      slug: slug
    });
    
    // Add the current user as an admin of the company
    if (req.session.userId) {
      await storage.addMemberToCompany({
        companyId: company.id,
        userId: req.session.userId,
        role: "admin",
        title: null, // Don't set a title that matches the role
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

// Update a company (requires company admin or system admin)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Check if the user is a system admin
    const user = await storage.getUserById(req.session.userId!);
    const isSystemAdmin = user?.isAdmin === true;
    
    // Log the system admin check
    console.log(`User ${req.session.userId} isAdmin check: ${isSystemAdmin}`);
    
    // If not a system admin, verify if they're a company admin
    if (!isSystemAdmin) {
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId!, id);
      console.log(`User ${req.session.userId} isCompanyAdmin check: ${isCompanyAdmin}`);
      
      if (!isCompanyAdmin) {
        console.log(`Access denied: User ${req.session.userId} is neither a system admin nor a company admin`);
        return res.status(403).json({ error: "Unauthorized" });
      }
    } else {
      console.log(`Access granted: User ${req.session.userId} is a system admin`);
    }

    // Validate the company data
    const { customLinks, tags: tagsList, ...otherData } = req.body;
    const companyData = insertCompanySchema.partial().parse(otherData);
    
    // If the name is being updated, generate a new slug
    let updatedData: any = {
      ...companyData,
      customLinks: customLinks ? customLinks : null
    };
    
    if (companyData.name) {
      updatedData.slug = generateSlug(companyData.name);
      console.log(`Generated slug "${updatedData.slug}" for company "${companyData.name}"`);
    }
    
    // Update the company with potentially new slug
    const company = await storage.updateCompany(id, updatedData);
    
    // Process tags if provided
    let updatedTags = [];
    if (tagsList && Array.isArray(tagsList)) {
      console.log(`Processing tags for company update:`, tagsList);
      // Sync tags for the company
      updatedTags = await storage.syncCompanyTags(id, tagsList);
      console.log(`Updated tags for company ${id}:`, updatedTags);
    }
    
    // Include updated tags in the response
    res.json({ 
      company,
      tags: updatedTags
    });
  } catch (error) {
    console.error("Failed to update company:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update company" });
  }
});

// Delete a company (requires company admin or system admin)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Check if the user is a system admin
    const user = await storage.getUserById(req.session.userId!);
    const isSystemAdmin = user?.isAdmin === true;
    
    // If the user is a system admin, they have full access
    if (isSystemAdmin) {
      console.log(`Access granted: User ${req.session.userId} is a system admin`);
    } else {
      // If not a system admin, verify if they're a company admin
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId!, id);
      
      if (!isCompanyAdmin) {
        console.log(`Access denied: User ${req.session.userId} is neither a system admin nor a company admin`);
        return res.status(403).json({ error: "Unauthorized" });
      }
      console.log(`Access granted: User ${req.session.userId} is a company admin`);
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
router.get("/:id/members", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`Fetching members for company ID: ${id}`);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    const members = await storage.getCompanyMembers(id);
    console.log(`Found ${members.length} members for company ID ${id}:`, members);
    
    res.json({ members });
  } catch (error) {
    console.error("Failed to fetch company members:", error);
    res.status(500).json({ error: "Failed to fetch company members" });
  }
});

// Add a member to a company (requires company admin or system admin)
router.post("/:id/members", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Check if user is a system admin first
    const user = await storage.getUserById(req.session.userId!);
    const isSystemAdmin = user?.isAdmin === true;
    
    if (isSystemAdmin) {
      console.log(`Access granted: User ${req.session.userId} is a system admin`);
    } else {
      // If not a system admin, verify if they're a company admin
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
      if (!isCompanyAdmin) {
        console.log(`Access denied: User ${req.session.userId} is neither a system admin nor a company admin`);
        return res.status(403).json({ error: "Unauthorized" });
      }
      console.log(`Access granted: User ${req.session.userId} is a company admin`);
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

// Update a member's role (requires company admin or system admin)
router.put("/:companyId/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const userId = parseInt(req.params.userId);
    if (isNaN(companyId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    // Check if user is a system admin first
    const user = await storage.getUserById(req.session.userId!);
    const isSystemAdmin = user?.isAdmin === true;
    
    if (isSystemAdmin) {
      console.log(`Access granted: User ${req.session.userId} is a system admin`);
    } else {
      // If not a system admin, verify if they're a company admin
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
      if (!isCompanyAdmin) {
        console.log(`Access denied: User ${req.session.userId} is neither a system admin nor a company admin`);
        return res.status(403).json({ error: "Unauthorized" });
      }
      console.log(`Access granted: User ${req.session.userId} is a company admin`);
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

// Remove a member from a company (requires company admin or system admin)
router.delete("/:companyId/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const userId = parseInt(req.params.userId);
    if (isNaN(companyId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    // Check if user is a system admin first
    const user = await storage.getUserById(req.session.userId!);
    const isSystemAdmin = user?.isAdmin === true;
    
    if (isSystemAdmin) {
      console.log(`Access granted: User ${req.session.userId} is a system admin`);
    } else {
      // If not a system admin, verify if they're a company admin
      const isCompanyAdmin = await storage.isCompanyAdmin(req.session.userId!, companyId);
      if (!isCompanyAdmin) {
        console.log(`Access denied: User ${req.session.userId} is neither a system admin nor a company admin`);
        return res.status(403).json({ error: "Unauthorized" });
      }
      console.log(`Access granted: User ${req.session.userId} is a company admin`);
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

// Get company profile for a specific user
router.get("/user/company-profile/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get the user's companies
    const companies = await storage.getUserCompanies(userId);
    
    if (!companies || companies.length === 0) {
      return res.status(404).json({ error: "No company found for user" });
    }
    
    // For now, just return the first company the user is associated with
    // This could be enhanced in the future to return the primary company
    const company = companies[0];
    
    // Return the company data using the stored database slug
    // We no longer generate a slug dynamically - use only what's in the database
    res.json(company);
  } catch (error) {
    console.error("Failed to fetch company profile for user:", error);
    res.status(500).json({ error: "Failed to fetch company profile" });
  }
});

// Helper function to generate a slug from a company name
const generateSlug = (name: string): string => {
  return name
    .replace(/\./g, '') // Remove periods
    .replace(/&/g, 'and') // Replace & with 'and'
    .normalize('NFKD') // Normalize Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
};

// Get a company by name slug (legacy endpoint - keeps compatibility)
router.get("/by-name/:nameSlug", async (req: Request, res: Response) => {
  try {
    const nameSlug = req.params.nameSlug;
    if (!nameSlug) {
      return res.status(400).json({ error: "Invalid company name slug" });
    }

    // First attempt to find the company by the stored slug field
    let company = await storage.getCompanyBySlug(nameSlug);
    
    // If not found by slug, fall back to generating slugs from company names
    if (!company) {
      const companies = await storage.getCompanies();
      
      for (const comp of companies) {
        // First check stored slug if available
        if (comp.slug === nameSlug) {
          company = comp;
          break;
        }
        
        // Then try generating a slug from the name as fallback
        const companyNameSlug = generateSlug(comp.name);
        if (companyNameSlug === nameSlug) {
          company = comp;
          
          // Update the company to store the generated slug for future use
          await storage.updateCompany(comp.id, { 
            slug: companyNameSlug 
          });
          
          break;
        }
      }
    }
    
    if (company) {
      return res.json({ company });
    }

    return res.status(404).json({ error: "Company not found" });
  } catch (error) {
    console.error("Error getting company by slug:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// Get a company by slug - new endpoint using the slug field
router.get("/by-slug/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return res.status(400).json({ error: "Invalid company slug" });
    }

    // Attempt to find the company by the stored slug field
    let company = await storage.getCompanyBySlug(slug);
    
    if (company) {
      return res.json({ company });
    }

    return res.status(404).json({ error: "Company not found" });
  } catch (error) {
    console.error("Error getting company by slug:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

export default router;