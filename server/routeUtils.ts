import type { Response } from "express";
import { z } from "zod";
import { computeSyncedVehicleStatus } from "@shared/fleetStatus";
import { VEHICLE_ACCESS_RESERVATION_STATUSES } from "@shared/fleetReservationPolicy";
import { storage } from "./storage";

interface DatabaseError {
  code?: string;
  detail?: string;
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function handleRouteError(res: Response, error: unknown, defaultMessage: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.errors,
    });
  }

  if (isDatabaseError(error)) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: error.detail || "A record with this value already exists",
      });
    }
    if (error.code === "23503") {
      return res.status(409).json({
        message: error.detail || "Referenced record does not exist",
      });
    }
  }

  console.error(`${defaultMessage}:`, error);
  return res.status(500).json({ message: defaultMessage });
}

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export async function getAuthUser(req: any) {
  const userId = req.userId || (req.session as any)?.userId;
  if (!userId) return null;
  try {
    return await storage.getUser(userId);
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return null;
  }
}

type ProjectStatus = "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";

export async function authenticateUser(req: any): Promise<any | null> {
  const userId = req.userId || (req.session as any)?.userId;
  if (!userId) return null;
  try {
    const user = await storage.getUser(userId);
    if (user) return { ...user, role: user.role };
  } catch (error) {
    console.error("Error during authenticateUser:", error);
  }
  return null;
}

export function isFleetPrivilegedRole(role: string | undefined): boolean {
  return role === "admin" || role === "technician";
}

/** Non-privileged users may only read vehicles tied to their own non-cancelled reservations. */
export async function canAccessFleetVehicle(
  userId: string,
  role: string | undefined,
  vehicleId: string,
): Promise<boolean> {
  if (isFleetPrivilegedRole(role)) return true;
  const reservations = await storage.getVehicleReservations({ userId });
  return reservations.some(
    (r) =>
      r.vehicleId === vehicleId &&
      (VEHICLE_ACCESS_RESERVATION_STATUSES as readonly string[]).includes(r.status),
  );
}

export async function canAccessVehicleDocument(
  userId: string,
  role: string | undefined,
  documentId: string,
): Promise<boolean> {
  if (!isFleetPrivilegedRole(role)) return false;
  const document = await storage.getVehicleDocument(documentId);
  if (!document) return false;
  return canAccessFleetVehicle(userId, role, document.vehicleId);
}

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

export function parsePaginationQuery(query: {
  limit?: string;
  offset?: string;
}): { limit: number; offset: number } | null {
  if (query.limit === undefined && query.offset === undefined) {
    return null;
  }
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? String(DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT, 1),
    MAX_PAGE_LIMIT,
  );
  const offset = Math.max(parseInt(query.offset ?? "0", 10) || 0, 0);
  return { limit, offset };
}

export async function canAccessServiceRequest(userId: string, requestId: string): Promise<boolean> {
  try {
    const [request, user] = await Promise.all([
      storage.getServiceRequest(requestId),
      storage.getUser(userId),
    ]);
    if (!request || !user) return false;
    if (user.role === "admin") return true;
    if (["staff", "technician", "student"].includes(user.role)) {
      return request.requesterId === userId;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncVehicleStatus(vehicleId: string): Promise<void> {
  try {
    const vehicle = await storage.getVehicle(vehicleId);
    if (!vehicle) return;

    const checkOutLogs = await storage.getVehicleCheckOutLogs({ vehicleId });
    const checkInLogs = await storage.getVehicleCheckInLogs({ vehicleId });
    const checkedOutIds = new Set(checkInLogs.map((c) => c.checkOutLogId));
    const hasActiveCheckOut = checkOutLogs.some((co) => !checkedOutIds.has(co.id));

    const reservations = await storage.getVehicleReservations({ vehicleId });
    const nextStatus = computeSyncedVehicleStatus(
      vehicle.status,
      hasActiveCheckOut,
      reservations.map((r) => r.status),
    );

    if (nextStatus) {
      await storage.updateVehicleStatus(vehicleId, nextStatus);
    }
  } catch (error) {
    console.error(`Error syncing vehicle status for ${vehicleId}:`, error);
  }
}

export async function syncProjectStatusFromTasks(projectId: string): Promise<void> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return;
    if (project.status === "cancelled") return;

    const tasks = await storage.getTasksByProject(projectId);
    if (tasks.length === 0) {
      if (project.status !== "planning") {
        await storage.updateProject(projectId, { status: "planning" });
      }
      return;
    }

    const allCompleted = tasks.every(t => t.status === "completed");
    const someInProgressOrCompleted = tasks.some(
      t => t.status === "in_progress" || t.status === "completed"
    );

    let newStatus: ProjectStatus | null = null;

    if (allCompleted) {
      newStatus = "completed";
    } else if (someInProgressOrCompleted) {
      if (project.status !== "on_hold") {
        newStatus = "in_progress";
      }
    } else {
      if (project.status !== "on_hold") {
        newStatus = "planning";
      }
    }

    if (newStatus && newStatus !== project.status) {
      await storage.updateProject(projectId, { status: newStatus });
    }
  } catch (error) {
    console.error(`Error syncing project status for ${projectId}:`, error);
  }
}
