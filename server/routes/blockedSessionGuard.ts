import type { RequestHandler } from "express";

// Check current database state on every session-bearing request, not merely on
// login. Session-store deletion is cleanup, never the authorization boundary.
export function blockedSessionGuard(
  getUser: (id: number) => Promise<{ blockedAt: string | null } | null>,
): RequestHandler {
  return async (req, res, next) => {
    if (!req.session?.userId) return next();
    try {
      const user = await getUser(req.session.userId);
      if (!user || user.blockedAt) {
        req.session.destroy(() => {});
        res.status(403).json({ error: "Account inactive or blocked", blocked: !!user?.blockedAt });
        return;
      }
      next();
    } catch {
      res.status(503).json({ error: "Unable to verify account access" });
    }
  };
}