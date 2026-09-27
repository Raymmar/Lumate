import { Request, Response, Router } from "express";
import { storage, type SummitScope } from "../storage";
import { insertSummitSchema, type Summit } from "@shared/schema";
import { requireAdmin } from "./middleware";

const router = Router();

/** True when the request comes from a signed-in, non-blocked admin. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  if (!req.session.userId) return false;
  const user = await storage.getUserById(req.session.userId);
  return Boolean(user?.isAdmin && !user.blockedAt);
}

/**
 * Returns a predicate telling whether a record linked to `summitId` may be shown
 * to this request. Unlinked records are always visible; records of unpublished
 * summits are visible to admins only.
 */
export async function getSummitVisibility(
  req: Request,
): Promise<(summitId: number | null | undefined) => boolean> {
  if (await isAdminRequest(req)) return () => true;
  const published = new Set(
    (await storage.getSummits({ includeUnpublished: false })).map((s) => s.id),
  );
  return (summitId) => summitId == null || published.has(summitId);
}

function parseYear(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) return null;
  return parseInt(value, 10);
}

/**
 * Resolves the summit filter for agenda / speaker endpoints from `?year=`.
 * - no year: admins see everything; the public sees nothing from unpublished summits
 * - year: that summit only; unpublished summits are hidden from non-admins (404)
 * Sends the error response itself and returns null when the request can't continue.
 */
export async function resolveSummitScope(
  req: Request,
  res: Response,
): Promise<{ scope: SummitScope; summit: Summit | null; isAdmin: boolean } | null> {
  const isAdmin = await isAdminRequest(req);
  const rawYear = req.query.year;
  if (rawYear === undefined || rawYear === "" || rawYear === "all") {
    return { scope: isAdmin ? {} : { publishedOnly: true }, summit: null, isAdmin };
  }
  const year = parseYear(rawYear);
  if (year === null) {
    res.status(400).json({ error: "Invalid year" });
    return null;
  }
  const summit = await storage.getSummitByYear(year);
  if (!summit || (!summit.isPublished && !isAdmin)) {
    res.status(404).json({ error: "Summit not found" });
    return null;
  }
  return { scope: { summitId: summit.id }, summit, isAdmin };
}

// List summits (published only for the public, all for admins)
router.get("/", async (req: Request, res: Response) => {
  try {
    const isAdmin = await isAdminRequest(req);
    const summits = await storage.getSummits({ includeUnpublished: isAdmin });
    res.json({ summits });
  } catch (error) {
    console.error("Failed to fetch summits:", error);
    res.status(500).json({ error: "Failed to fetch summits" });
  }
});

// The featured summit: the one marked current (if published), else the latest published
router.get("/current", async (req: Request, res: Response) => {
  try {
    const summit = await storage.getCurrentSummit();
    res.json({ summit });
  } catch (error) {
    console.error("Failed to fetch current summit:", error);
    res.status(500).json({ error: "Failed to fetch current summit" });
  }
});

router.get("/:year", async (req: Request, res: Response) => {
  try {
    const year = parseYear(req.params.year);
    if (year === null) {
      return res.status(400).json({ error: "Invalid year" });
    }
    const summit = await storage.getSummitByYear(year);
    if (!summit || (!summit.isPublished && !(await isAdminRequest(req)))) {
      return res.status(404).json({ error: "Summit not found" });
    }
    res.json({ summit });
  } catch (error) {
    console.error("Failed to fetch summit:", error);
    res.status(500).json({ error: "Failed to fetch summit" });
  }
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = insertSummitSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid summit data", details: result.error.format() });
    }
    if (await storage.getSummitByYear(result.data.year)) {
      return res.status(409).json({ error: `A summit for ${result.data.year} already exists` });
    }
    const summit = await storage.createSummit(result.data);
    res.status(201).json({ summit });
  } catch (error) {
    console.error("Failed to create summit:", error);
    res.status(500).json({ error: "Failed to create summit" });
  }
});

// Update details, including publishing / unpublishing via `isPublished`
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getSummitById(id);
    if (!existing) {
      return res.status(404).json({ error: "Summit not found" });
    }
    const result = insertSummitSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid summit data", details: result.error.format() });
    }
    if (result.data.year !== undefined && result.data.year !== existing.year) {
      const clash = await storage.getSummitByYear(result.data.year);
      if (clash) {
        return res.status(409).json({ error: `A summit for ${result.data.year} already exists` });
      }
    }
    const summit = await storage.updateSummit(id, result.data);
    res.json({ summit });
  } catch (error) {
    console.error("Failed to update summit:", error);
    res.status(500).json({ error: "Failed to update summit" });
  }
});

// Mark a summit as the current one (unmarks any other)
router.post("/:id/current", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!(await storage.getSummitById(id))) {
      return res.status(404).json({ error: "Summit not found" });
    }
    const summit = await storage.setCurrentSummit(id);
    res.json({ summit });
  } catch (error) {
    console.error("Failed to set current summit:", error);
    res.status(500).json({ error: "Failed to set current summit" });
  }
});

export default router;
