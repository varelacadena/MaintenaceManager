import type { RequestHandler } from "express";
import type { User } from "@shared/schema";
import {
  canManageEquipment,
  canManageFleet,
  canManageInventory,
} from "@shared/techPermissions";

// Middleware to check if user has specific role
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return async (req: any, res, next) => {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user = req.currentUser as User | undefined;
    if (!user) {
      const { storage } = await import("./storage");
      user = await storage.getUser(userId);
      req.currentUser = user;
    }

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
    if (req.currentUser) return req.currentUser;
    const userId = req.userId;
    if (!userId) return null;
    const { storage } = await import("./storage");
    const user = (await storage.getUser(userId)) ?? null;
    req.currentUser = user;
    return user;
  } catch (error) {
    return null;
  }
};

// Specific role middleware wrappers
export const requireAdmin = requireRole("admin");
export const requireTechnicianOrAdmin = requireRole("technician", "admin");

function requireUserPermission(check: (user: User) => boolean): RequestHandler {
  return async (req: any, res, next) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!check(user)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    req.currentUser = user;
    next();
  };
}

export const requireEquipmentManager = requireUserPermission(canManageEquipment);
export const requireFleetPrivileged = requireUserPermission(canManageFleet);
/** Create items and adjust stock (search, add, use on inventory page). */
export const requireInventoryOperator = requireUserPermission(canManageInventory);
/** Read inventory when picking parts on tasks (staff excluded). */
export const requireInventoryReader = requireRole("admin", "technician", "student");
export const requireStaffOrHigher = requireRole("staff", "technician", "admin");
// Role middleware for student/technician model
export const requireStudentOrAdmin = requireRole("student", "admin");
export const requireTaskExecutorOrAdmin = requireRole("student", "technician", "admin");
export const requireAnyAuthenticated = requireRole("admin", "technician", "staff", "student");

// Helper to check if user can access a specific request
export async function canAccessRequest(userId: string, requestId: string, requireAssignedOrRequester: boolean = false): Promise<boolean> {
  const { storage } = await import("./storage");

  const user = await storage.getUser(userId);
  if (!user) return false;

  // Admins can access all requests
  if (user.role === "admin") return true;

  const request = await storage.getServiceRequest(requestId);
  if (!request) return false;

  // Submitters can only access their own requests
  if (["staff", "technician", "student"].includes(user.role)) {
    return request.requesterId === userId;
  }

  return false;
}

// Helper to check if user can access a specific task
export async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  const { storage } = await import("./storage");

  const user = await storage.getUser(userId);
  if (!user) return false;

  // Admins can access all tasks
  if (user.role === "admin") return true;

  const task = await storage.getTask(taskId);
  if (!task) return false;

  // Technicians can access tasks directly assigned to them, technician-type tasks in the technician pool,
  // or tasks where they were added as an additional assignee.
  if (user.role === "technician") {
    if (task.assignedToId === userId) return true;
    const isHelper = await storage.isTaskHelper(taskId, userId);
    if (isHelper) return true;
    return task.executorType === "technician" && task.assignedPool === "technician_pool";
  }

  // Students can access tasks directly assigned to them, student pool tasks, or tasks where they are a helper
  if (user.role === "student") {
    if (task.assignedToId === userId) return true;
    if (task.executorType === "student" && task.assignedPool === "student_pool") return true;
    const isHelper = await storage.isTaskHelper(taskId, userId);
    if (isHelper) return true;
    return false;
  }

  // Staff cannot access tasks
  return false;
}

// Middleware to require task access
export function requireTaskAccess(): RequestHandler {
  return async (req: any, res, next) => {
    if (!req.currentUser && req.userId) {
      const { storage } = await import("./storage");
      req.currentUser = await storage.getUser(req.userId);
    }

    if (!req.currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const taskId = req.params.taskId || req.params.id || req.body.taskId;
    if (!taskId) {
      return res.status(400).json({ message: "Task ID required" });
    }

    const hasAccess = await canAccessTask(req.currentUser.id, taskId);
    if (!hasAccess) {
      return res.status(403).json({
        message: "Forbidden: You don't have access to this task"
      });
    }

    next();
  };
}

// Middleware to require request access
export function requireRequestAccess(requireAssignedOrRequester: boolean = false): RequestHandler {
  return async (req: any, res, next) => {
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