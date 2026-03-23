import type { Response } from "express";
import { z } from "zod";
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

export async function syncVehicleStatus(vehicleId: string): Promise<void> {
  try {
    const vehicle = await storage.getVehicle(vehicleId);
    if (!vehicle) return;

    if (vehicle.status === "needs_maintenance" || vehicle.status === "needs_cleaning" || vehicle.status === "out_of_service") {
      return;
    }

    const checkOutLogs = await storage.getVehicleCheckOutLogs({ vehicleId });
    const checkInLogs = await storage.getVehicleCheckInLogs({ vehicleId });

    const activeCheckOut = checkOutLogs.find(checkOut => {
      const hasMatchingCheckIn = checkInLogs.some(checkIn => checkIn.checkOutLogId === checkOut.id);
      return !hasMatchingCheckIn;
    });

    if (activeCheckOut) {
      if (vehicle.status !== "in_use") {
        await storage.updateVehicleStatus(vehicleId, "in_use");
      }
      return;
    }

    const reservations = await storage.getVehicleReservations({ vehicleId });
    const hasActiveReservations = reservations.some(
      r => r.status === "pending" || r.status === "approved"
    );

    if (hasActiveReservations) {
      if (vehicle.status !== "reserved") {
        await storage.updateVehicleStatus(vehicleId, "reserved");
      }
    } else {
      if (vehicle.status !== "available") {
        await storage.updateVehicleStatus(vehicleId, "available");
      }
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
