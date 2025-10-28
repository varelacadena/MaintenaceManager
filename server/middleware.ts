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

// Specific role middleware wrappers
export const requireAdmin = requireRole("admin");
export const requireMaintenanceOrAdmin = requireRole("maintenance", "admin");
export const requireStaffOrHigher = requireRole("staff", "maintenance", "admin");

// Helper to check if user can access a specific request
export async function canAccessRequest(userId: string, requestId: string, requireAssignedOrRequester: boolean = false): Promise<boolean> {
  const { storage } = await import("./storage");
  
  const user = await storage.getUser(userId);
  if (!user) return false;
  
  // Admins can access all requests
  if (user.role === "admin") return true;
  
  const request = await storage.getServiceRequest(requestId);
  if (!request) return false;
  
  // Maintenance can access all requests
  if (user.role === "maintenance") {
    if (requireAssignedOrRequester) {
      // For modifications, must be assigned to the request
      return request.assignedToId === userId || request.requesterId === userId;
    }
    return true;
  }
  
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
    if (!req.currentUser && req.user?.claims?.sub) {
      const { storage } = await import("./storage");
      req.currentUser = await storage.getUser(req.user.claims.sub);
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
