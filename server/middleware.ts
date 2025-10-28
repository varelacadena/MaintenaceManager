import type { RequestHandler } from "express";

// Middleware to check if user has specific role
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return async (req: any, res, next) => {
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.claims.sub;
    
    // Get user from database to check current role
    const { storage } = await import("./storage");
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: "Forbidden: Insufficient permissions",
        required: allowedRoles,
        current: user.role,
      });
    }

    // Attach user to request for use in route handlers
    req.currentUser = user;
    next();
  };
}

// Helper to get current user from request
export function getCurrentUser(req: any) {
  return req.currentUser;
}
