import { Request, Response, Router } from "express";
import { storage, type SummitScope } from "../storage";
import { insertSummitSchema, type Summit } from "@shared/schema";
import { requireAdmin } from "./middleware";
import { lumaValuesFromEvent, oneWithLumaValues, withLumaValues } from "../services/summitLuma";

const router = Router();

/** Responds 400 and returns false when the presenting sponsor doesn't exist (or was deleted). */
async function validatePresentingSponsor(res: Response, sponsorId: number | null | undefined): Promise<boolean> {
  if (sponsorId == null) return true;
  if (await storage.getSponsorById(sponsorId)) return true;
  res.status(400).json({ error: "Presenting sponsor not found" });
  return false;
}

/** Responds 400 and returns false when the Luma event to link isn't in the synced events. */
async function validateLumaEvent(res: Response, apiId: string | null | undefined): Promise<boolean> {
  if (apiId == null) return true;
  if (await storage.getEventByApiId(apiId)) return true;
  res.status(400).json({ error: "Luma event not found. Run a Luma sync and try again." });
  return false;
}

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
    res.json({ summits: await withLumaValues(summits, { isAdmin }) });
  } catch (error) {
    console.error("Failed to fetch summits:", error);
    res.status(500).json({ error: "Failed to fetch summits" });
  }
});

// The featured summit: the one marked current (if published), else the latest published
router.get("/current", async (req: Request, res: Response) => {
  try {
    const summit = await storage.getCurrentSummit();
    res.json({ summit: await oneWithLumaValues(summit, { isAdmin: await isAdminRequest(req) }) });
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
    const isAdmin = await isAdminRequest(req);
    if (!summit || (!summit.isPublished && !isAdmin)) {
      return res.status(404).json({ error: "Summit not found" });
    }
    res.json({ summit: await oneWithLumaValues(summit, { isAdmin }) });
  } catch (error) {
    console.error("Failed to fetch summit:", error);
    res.status(500).json({ error: "Failed to fetch summit" });
  }
});

// Values a synced Luma event would supply, so the admin form can preview a new link before saving
router.get("/luma-preview/:apiId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const event = await storage.getEventByApiId(req.params.apiId);
    if (!event) {
      return res.status(404).json({ error: "Luma event not found" });
    }
    res.json({
      event: { title: event.title, startTime: event.startTime, timezone: event.timezone, url: event.url },
      values: lumaValuesFromEvent(event),
    });
  } catch (error) {
    console.error("Failed to preview Luma event:", error);
    res.status(500).json({ error: "Failed to preview Luma event" });
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
    if (!(await validatePresentingSponsor(res, result.data.presentingSponsorId))) return;
    if (!(await validateLumaEvent(res, result.data.lumaEventApiId))) return;
    // The presenting sponsor is also a sponsor of that summit's year
    if (result.data.presentingSponsorId != null) {
      await storage.ensureSponsorship(result.data.presentingSponsorId, result.data.year);
    }
    const summit = await storage.createSummit(result.data);
    res.status(201).json({ summit: await oneWithLumaValues(summit, { isAdmin: true }) });
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
    const data = { ...result.data };
    if (!(await validatePresentingSponsor(res, data.presentingSponsorId))) return;
    // Only check a newly chosen event; keeping an existing (possibly broken) link is allowed
    if (data.lumaEventApiId !== undefined && data.lumaEventApiId !== existing.lumaEventApiId) {
      if (!(await validateLumaEvent(res, data.lumaEventApiId))) return;
    }
    // Clearing the presenting sponsor also empties the old "Presented by" text fallback
    if ("presentingSponsorId" in data && data.presentingSponsorId === null) {
      data.presentedByName = null;
      data.presentedByUrl = null;
    }
    const presentingSponsorId =
      data.presentingSponsorId !== undefined ? data.presentingSponsorId : existing.presentingSponsorId;
    const year = data.year ?? existing.year;
    if (presentingSponsorId != null && (data.presentingSponsorId !== undefined || data.year !== undefined)) {
      await storage.ensureSponsorship(presentingSponsorId, year);
    }
    const summit = await storage.updateSummit(id, data);
    res.json({ summit: await oneWithLumaValues(summit, { isAdmin: true }) });
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
    res.json({ summit: await oneWithLumaValues(summit, { isAdmin: true }) });
  } catch (error) {
    console.error("Failed to set current summit:", error);
    res.status(500).json({ error: "Failed to set current summit" });
  }
});

export default router;
