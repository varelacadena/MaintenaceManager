import type { RequestHandler } from "express";
import type { User } from "@shared/schema";

// Middleware to check if user has specific role
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return async (req: any, res, next) => {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
export const getCurrentUser = async (req: any): Promise<User | null> => {
  try {
    const userId = req.userId;
    if (!userId) return null;
    const { storage } = await import("./storage");
    return await storage.getUser(userId);
  } catch (error) {
    return null;
  }
};

// Specific role middleware wrappers
export const requireAdmin = requireRole("admin");
export const requireMaintenanceOrAdmin = requireRole("maintenance", "admin");
export const requireStaffOrHigher = requireRole("staff", "maintenance", "admin");

// Helper to check if user can access a specific request
export async function canAccessRequest(userId: string, requestId: string | number, requireAssignedOrRequester: boolean = false): Promise<boolean> {
  const { storage } = await import("./storage");

  const user = await storage.getUser(userId);
  if (!user) return false;

  // Admins and maintenance can access all requests
  if (user.role === "admin" || user.role === "maintenance") return true;

  const request = await storage.getServiceRequest(requestId);
  if (!request) return false;

  // Staff can only access their own requests
  if (user.role === "staff") {
    return request.requesterId === userId;
  }

  return false;
}

// Middleware to require request access
export function requireRequestAccess(requireAssignedOrRequester: boolean = false): RequestHandler {
  return async (req: any, res, next) => {
    // Get user if not already set by requireRole middleware
    if (!req.currentUser && req.userId) {
      const { storage } = await import("./storage");
      req.currentUser = await storage.getUser(req.userId);
    }

    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestId = req.params.id || req.params.requestId || req.body.requestId;
    if (!requestId) {
      return res.status(400).json({ message: "Request ID required" });
    }

    const hasAccess = await canAccessRequest(req.currentUser.id, requestId, requireAssignedOrRequester);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden: You don't have access to this request"
      });
    }

    next();
  };
}