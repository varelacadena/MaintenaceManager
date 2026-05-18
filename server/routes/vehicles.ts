import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, getCurrentUser, requireStaffOrHigher, requireFleetPrivileged } from "../middleware";
import {
  handleRouteError,
  syncVehicleStatus,
  isFleetPrivilegedRole,
  parsePaginationQuery,
  canAccessFleetVehicle,
  canAccessVehicleDocument,
} from "../routeUtils";
import {
  validateReservationStatusTransition,
  normalizePrivilegedCreateStatus,
  checkInManualVehicleStatus,
} from "@shared/fleetReservationPolicy";
import {
  insertVehicleSchema,
  insertVehicleReservationSchema,
  insertVehicleCheckOutLogSchema,
  insertVehicleCheckInLogSchema,
  insertVehicleMaintenanceScheduleSchema,
  insertVehicleMaintenanceLogSchema,
  insertVehicleDocumentSchema,
  insertChecklistTemplateSchema,
} from "@shared/schema";
import { z } from "zod";
import {
  notificationService,
  notifyNewVehicleReservation,
  notifyVehicleReservationApproved,
  notifyVehicleReservationDenied,
} from "../notifications";

const vehicleStatusSchema = z.enum([
  "available",
  "reserved",
  "in_use",
  "needs_cleaning",
  "needs_maintenance",
  "out_of_service",
]);

const reservationStatusSchema = z.enum([
  "pending",
  "approved",
  "active",
  "pending_review",
  "completed",
  "cancelled",
]);

function parseReservationStatuses(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const valid = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => reservationStatusSchema.safeParse(s).success);
  return valid.length > 0 ? valid : undefined;
}

export function registerVehicleRoutes(app: Express) {
  // Vehicle routes
  app.get("/api/vehicles", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      if (status && !vehicleStatusSchema.safeParse(status).success) {
        return res.status(400).json({ message: "Invalid vehicle status" });
      }
      const filters = {
        ...(status ? { status } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
      };
      const hasFilters = Object.keys(filters).length > 0;
      const pagination = parsePaginationQuery({
        limit: req.query.limit as string | undefined,
        offset: req.query.offset as string | undefined,
      });

      if (pagination || search?.trim()) {
        const page = await storage.getVehiclesPage(
          hasFilters ? filters : undefined,
          pagination ?? { limit: 50, offset: 0 },
        );
        return res.json({ ...page, ...(pagination ?? { limit: 50, offset: 0 }) });
      }

      const vehicles = await storage.getVehicles(hasFilters ? filters : undefined);
      res.json(vehicles);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicles");
    }
  });

  app.get("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      const allowed = await canAccessFleetVehicle(
        req.userId,
        currentUser.role,
        vehicle.id,
      );
      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(vehicle);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle");
    }
  });

  app.post("/api/vehicles", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle");
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, validated);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update vehicle");
    }
  });

  app.patch("/api/vehicles/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status } = z.object({ status: vehicleStatusSchema }).parse(req.body);
      const vehicle = await storage.updateVehicleStatus(req.params.id, status);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      handleRouteError(res, error, "Failed to update vehicle status");
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle");
    }
  });

  // Vehicle reservation routes
  app.get("/api/vehicle-reservations/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const pagination = parsePaginationQuery({
        limit: req.query.limit as string | undefined,
        offset: req.query.offset as string | undefined,
      });

      let resolvedPage: Awaited<ReturnType<typeof storage.getVehicleReservationsPage>>;
      if (pagination) {
        resolvedPage = await storage.getVehicleReservationsPage({ userId }, pagination);
      } else {
        const items = await storage.getVehicleReservations({ userId });
        resolvedPage = { items, total: items.length };
      }

      const vehicleIds = Array.from(
        new Set(
          resolvedPage.items
            .map((r) => r.vehicleId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const vehiclesForRows = await storage.getVehiclesByIds(vehicleIds);
      const vehicleById = new Map(vehiclesForRows.map((v) => [v.id, v]));

      const enriched = resolvedPage.items.map((r) => {
        if (!r.vehicleId) return { ...r, vehicleName: null, vehicleDisplayId: null };
        const vehicle = vehicleById.get(r.vehicleId);
        return {
          ...r,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
          vehicleDisplayId: vehicle ? vehicle.vehicleId : null,
        };
      });

      if (pagination) {
        return res.json({ items: enriched, total: resolvedPage.total, ...pagination });
      }

      res.json(enriched);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle reservations");
    }
  });

  app.get("/api/vehicle-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const vehicleId = req.query.vehicleId as string | undefined;
      const statuses = parseReservationStatuses(req.query.statuses as string | undefined);
      const statusParam = req.query.status as string | undefined;
      let userId = req.query.userId as string | undefined;

      if (!isFleetPrivilegedRole(currentUser.role)) {
        if (userId && userId !== req.userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
        userId = req.userId;
      }

      if (statusParam && !statuses && !reservationStatusSchema.safeParse(statusParam).success) {
        return res.status(400).json({ message: "Invalid reservation status" });
      }

      const search = (req.query.q as string | undefined)?.trim();
      const filters = {
        vehicleId,
        userId,
        status: statuses ? undefined : statusParam,
        statuses,
        ...(search ? { search } : {}),
      };

      const pagination = parsePaginationQuery({
        limit: req.query.limit as string | undefined,
        offset: req.query.offset as string | undefined,
      });

      if (pagination) {
        const page = await storage.getVehicleReservationsPage(filters, pagination);
        return res.json({ ...page, ...pagination });
      }

      const reservations = await storage.getVehicleReservations(filters);
      res.json(reservations);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle reservations");
    }
  });

  app.get("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const reservationId = req.params.id;
      const reservation = await storage.getVehicleReservation(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const currentUser = await storage.getUser(req.userId);
      const isPrivileged = isFleetPrivilegedRole(currentUser?.role);

      if (reservation.userId !== req.userId && !isPrivileged) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(reservation);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch reservation");
    }
  });

  app.post("/api/vehicle-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      const bodyWithDates = {
        ...req.body,
        userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };

      const currentUser = await storage.getUser(userId);
      const reservationData = insertVehicleReservationSchema.parse(bodyWithDates);
      const isPrivileged = isFleetPrivilegedRole(currentUser?.role);
      if (!isPrivileged) {
        reservationData.status = "pending";
      } else {
        reservationData.status = normalizePrivilegedCreateStatus(reservationData.status);
        if (reservationData.status === "approved" && !reservationData.vehicleId) {
          return res.status(400).json({
            message: "A vehicle must be assigned before approving a reservation",
          });
        }
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startDate = new Date(reservationData.startDate);
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      if (startDateOnly < today) {
        return res.status(400).json({ message: "Cannot create reservations for past dates" });
      }

      if (startDateOnly.getTime() === tomorrow.getTime()) {
        const currentHour = now.getHours();
        
        if (currentHour >= 16) {
          const startHour = startDate.getHours();
          const startMinute = startDate.getMinutes();
          const startTimeInMinutes = startHour * 60 + startMinute;
          const nineAMInMinutes = 9 * 60;

          if (startTimeInMinutes < nineAMInMinutes) {
            return res.status(400).json({ 
              message: "After 4:00 PM, reservations for tomorrow must start at or after 9:00 AM" 
            });
          }
        }
      }

      if (reservationData.endDate <= reservationData.startDate) {
        return res.status(400).json({ message: "End date/time must be after start date/time" });
      }

      if (reservationData.vehicleId) {
        const isAvailable = await storage.checkVehicleAvailability(
          reservationData.vehicleId,
          reservationData.startDate,
          reservationData.endDate
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Vehicle is not available for the selected dates" });
        }
      }

      const reservation = await storage.createVehicleReservation(reservationData);

      if (reservationData.vehicleId) {
        await syncVehicleStatus(reservationData.vehicleId);
      }

      const requester = await storage.getUser(userId);
      if (requester) {
        const admins = await storage.getUsersByRoles(["admin"]);
        let vehicleName = "Unassigned";
        if (reservationData.vehicleId) {
          const vehicle = await storage.getVehicle(reservationData.vehicleId);
          if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        }
        notifyNewVehicleReservation(reservation, requester, admins, vehicleName, notificationService).catch(err =>
          console.error("Failed to send vehicle reservation notification emails:", err)
        );
      }

      res.json(reservation);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle reservation");
    }
  });

  // Update vehicle reservation (PATCH endpoint)
  app.patch("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const body = { ...req.body };
      if (body.startDate && typeof body.startDate === "string") body.startDate = new Date(body.startDate);
      if (body.endDate && typeof body.endDate === "string") body.endDate = new Date(body.endDate);
      const validated = insertVehicleReservationSchema.partial().parse(body);
      const updates: any = { ...validated };

      const reservation = await storage.getVehicleReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const canUpdate = 
        currentUser.role === "admin" || 
        currentUser.role === "technician" || 
        reservation.userId === userId;

      if (!canUpdate) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (updates.status === "cancelled" && reservation.userId === userId) {
        updates.lastViewedStatus = reservation.status;
      }

      if ((currentUser.role === "admin" || currentUser.role === "technician") && 
          reservation.userId !== userId) {
        updates.lastViewedStatus = "pending";
      }

      const effectiveKeyPickup = updates.keyPickupMethod ?? reservation.keyPickupMethod;
      if (effectiveKeyPickup === "key_box") {
        const effectiveLockboxId = ("lockboxId" in updates) ? updates.lockboxId : reservation.lockboxId;
        if (!effectiveLockboxId) {
          return res.status(400).json({ message: "A lockbox must be selected when using Key Box pickup method" });
        }
      } else if (updates.keyPickupMethod && updates.keyPickupMethod !== "key_box") {
        updates.lockboxId = null;
      }

      const isPrivileged = isFleetPrivilegedRole(currentUser.role);

      if (!isPrivileged) {
        delete updates.lockboxId;
        delete updates.keyPickupMethod;
        delete updates.adminNotes;
        delete updates.userId;
        if (updates.status !== undefined && updates.status !== "cancelled") {
          delete updates.status;
        }
        if (updates.status === "cancelled" && reservation.userId !== userId) {
          delete updates.status;
        }
      }

      if (updates.status !== undefined) {
        const statusError = validateReservationStatusTransition(
          reservation.status,
          updates.status,
          { isPrivileged, isOwner: reservation.userId === userId },
        );
        if (statusError) {
          return res.status(400).json({ message: statusError });
        }
        if (updates.status === "approved" && !(updates.vehicleId ?? reservation.vehicleId)) {
          return res.status(400).json({
            message: "A vehicle must be assigned before approving a reservation",
          });
        }
      }

      const effectiveStart = updates.startDate ?? reservation.startDate;
      const effectiveEnd = updates.endDate ?? reservation.endDate;
      if (updates.startDate || updates.endDate) {
        if (new Date(effectiveEnd) <= new Date(effectiveStart)) {
          return res.status(400).json({ message: "End date/time must be after start date/time" });
        }
      }

      const effectiveVehicleId = updates.vehicleId ?? reservation.vehicleId;
      const oldVehicleId = reservation.vehicleId;
      if (
        effectiveVehicleId &&
        (updates.vehicleId || updates.startDate || updates.endDate)
      ) {
        const isAvailable = await storage.checkVehicleAvailability(
          effectiveVehicleId,
          new Date(effectiveStart),
          new Date(effectiveEnd),
          id,
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Vehicle is not available for the selected dates" });
        }
      }

      const updatedReservation = await storage.updateVehicleReservation(id, updates);

      if (oldVehicleId) {
        await syncVehicleStatus(oldVehicleId);
      }
      if (updates.vehicleId && updates.vehicleId !== oldVehicleId) {
        await syncVehicleStatus(updates.vehicleId);
      }
      if (updates.status && updatedReservation?.vehicleId && !updates.vehicleId) {
        await syncVehicleStatus(updatedReservation.vehicleId);
      }

      if (updates.status === "approved" && reservation.status !== "approved" && updatedReservation) {
        const reservationUser = await storage.getUser(reservation.userId);
        if (reservationUser) {
          let vehicleName = "Unassigned";
          const vId = updatedReservation.vehicleId || reservation.vehicleId;
          if (vId) {
            const vehicle = await storage.getVehicle(vId);
            if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          }
          notifyVehicleReservationApproved(updatedReservation, reservationUser, vehicleName, notificationService).catch(err =>
            console.error("Failed to send reservation approval email:", err)
          );
        }
      }

      if (updates.status === "cancelled" && reservation.status !== "cancelled" && updatedReservation && reservation.userId !== userId) {
        const reservationUser = await storage.getUser(reservation.userId);
        if (reservationUser) {
          let vehicleName = "Unassigned";
          const vId = updatedReservation.vehicleId || reservation.vehicleId;
          if (vId) {
            const vehicle = await storage.getVehicle(vId);
            if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          }
          notifyVehicleReservationDenied(updatedReservation, reservationUser, vehicleName, notificationService).catch(err =>
            console.error("Failed to send reservation denied email:", err)
          );
        }
      }

      res.json(updatedReservation);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update vehicle reservation");
    }
  });

  // Delete vehicle reservation
  app.delete("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const reservation = await storage.getVehicleReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({
          message: "Only administrators can permanently delete reservations. Use cancel instead.",
        });
      }

      const vehicleId = reservation.vehicleId;
      await storage.deleteVehicleReservation(id);

      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting vehicle reservation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vehicle-reservations/:id/check-availability", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const reservation = await storage.getVehicleReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      if (
        reservation.userId !== req.userId &&
        !isFleetPrivilegedRole(currentUser.role)
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const bodySchema = z.object({
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        vehicleId: z.string().min(1),
      });
      const { startDate, endDate, vehicleId } = bodySchema.parse(req.body);
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ message: "End date/time must be after start date/time" });
      }
      const isAvailable = await storage.checkVehicleAvailability(
        vehicleId,
        start,
        end,
        req.params.id,
      );
      res.json({ available: isAvailable });
    } catch (error) {
      handleRouteError(res, error, "Failed to check vehicle availability");
    }
  });

  // Accept advisory for reservation
  app.post("/api/vehicle-reservations/:id/accept-advisory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const reservationId = req.params.id;

      const reservation = await storage.getVehicleReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const currentUser = await storage.getUser(userId);
      const isAdmin = currentUser?.role === "admin" || currentUser?.role === "technician";
      if (reservation.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateVehicleReservation(reservationId, {
        advisoryAccepted: true,
      });

      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to accept advisory");
    }
  });

  // Mark reservation status as viewed
  app.post("/api/vehicle-reservations/:id/mark-viewed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const reservationId = req.params.id;

      const reservation = await storage.getVehicleReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (reservation.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateVehicleReservation(reservationId, {
        lastViewedStatus: reservation.status,
      });

      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to mark reservation as viewed");
    }
  });

  // Vehicle check-out log routes
  app.get("/api/vehicle-checkout-logs", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const vehicleId = req.query.vehicleId as string | undefined;
      const openOnly = req.query.openOnly === "true";
      let userId = req.query.userId as string | undefined;
      if (!isFleetPrivilegedRole(currentUser.role)) {
        if (userId && userId !== req.userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
        userId = req.userId;
      }

      if (openOnly) {
        const targetUserId = userId ?? req.userId;
        if (targetUserId !== req.userId && !isFleetPrivilegedRole(currentUser.role)) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const openLogs = await storage.getOpenVehicleCheckOutLogs(targetUserId);
        return res.json(openLogs);
      }

      const logs = await storage.getVehicleCheckOutLogs({ vehicleId, userId });
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle check-out logs");
    }
  });

  app.get("/api/vehicle-checkout-logs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const log = await storage.getVehicleCheckOutLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Check-out log not found" });
      }
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (log.userId !== req.userId && !isFleetPrivilegedRole(currentUser.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle check-out log");
    }
  });

  app.post("/api/vehicle-checkout-logs", isAuthenticated, async (req: any, res) => {
    try {
      const checkoutUser = await storage.getUser(req.userId);
      const isCheckoutPrivileged = isFleetPrivilegedRole(checkoutUser?.role);
      const cleanedBody = {
        ...req.body,
        userId: req.userId,
        startMileage: Number(req.body.startMileage) || 0,
        fuelLevel: req.body.fuelLevel || "full",
        cleanlinessConfirmed: Boolean(req.body.cleanlinessConfirmed),
        damageNotes: req.body.damageNotes || null,
        adminOverride:
          isCheckoutPrivileged && req.body.adminOverride === true ? true : undefined,
        assignedCodeId: req.body.assignedCodeId || null,
      };

      const logData = insertVehicleCheckOutLogSchema.parse(cleanedBody);

      const reservation = await storage.getVehicleReservation(logData.reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      if (reservation.userId !== req.userId && !isCheckoutPrivileged) {
        return res.status(403).json({ message: "Unauthorized: This reservation belongs to another user" });
      }
      if (reservation.vehicleId !== logData.vehicleId) {
        return res.status(400).json({ message: "Vehicle mismatch: This reservation is for a different vehicle" });
      }
      if (!["approved", "active"].includes(reservation.status)) {
        return res.status(400).json({
          message: "Reservation must be approved before checkout",
        });
      }

      if (!reservation.advisoryAccepted && !isCheckoutPrivileged) {
        return res.status(400).json({
          message: "You must accept the vehicle advisory before checkout",
        });
      }

      const existingLog = await storage.getCheckOutLogByReservation(logData.reservationId);
      if (existingLog) {
        return res.status(400).json({ message: "A checkout log already exists for this reservation" });
      }

      const log = await storage.createVehicleCheckOutLog(logData);
      await storage.updateVehicleMileage(logData.vehicleId, logData.startMileage);
      await storage.updateReservationStatus(logData.reservationId, "active");
      await syncVehicleStatus(logData.vehicleId);

      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle check-out log");
    }
  });

  app.delete("/api/vehicle-checkout-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const log = await storage.getVehicleCheckOutLog(req.params.id);
      const vehicleId = log?.vehicleId;

      await storage.deleteVehicleCheckOutLog(req.params.id);

      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle check-out log");
    }
  });

  // Vehicle check-in log routes
  app.get("/api/vehicle-checkin-logs", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const vehicleId = req.query.vehicleId as string | undefined;
      let userId = req.query.userId as string | undefined;
      if (!isFleetPrivilegedRole(currentUser.role)) {
        if (userId && userId !== req.userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
        userId = req.userId;
      }

      const logs = await storage.getVehicleCheckInLogs({ vehicleId, userId });
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle check-in logs");
    }
  });

  app.get("/api/vehicle-checkin-logs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const log = await storage.getVehicleCheckInLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Check-in log not found" });
      }
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (log.userId !== req.userId && !isFleetPrivilegedRole(currentUser.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle check-in log");
    }
  });

  app.post("/api/vehicle-checkin-logs", isAuthenticated, async (req: any, res) => {
    try {
      const logData = insertVehicleCheckInLogSchema.parse(req.body);

      const checkOutLog = await storage.getVehicleCheckOutLog(logData.checkOutLogId);
      if (!checkOutLog) {
        return res.status(404).json({ message: "Check-out log not found" });
      }
      const checkInUser = await storage.getUser(req.userId);
      const isCheckInPrivileged = isFleetPrivilegedRole(checkInUser?.role);
      if (checkOutLog.userId !== req.userId && !isCheckInPrivileged) {
        return res.status(403).json({ message: "Unauthorized: This check-out log belongs to another user" });
      }
      if (checkOutLog.vehicleId !== logData.vehicleId) {
        return res.status(400).json({ message: "Vehicle mismatch: This check-out was for a different vehicle" });
      }

      const existingCheckIn = await storage.getCheckInLogByCheckOut(logData.checkOutLogId);
      if (existingCheckIn) {
        return res.status(400).json({ message: "This trip has already been checked in" });
      }

      if (logData.endMileage < checkOutLog.startMileage) {
        return res.status(400).json({
          message: "End mileage cannot be less than start mileage",
        });
      }

      const logWithDefaults = {
        ...logData,
        userId: checkOutLog.userId,
        checkInDate: new Date(),
        endFuelLevel: logData.fuelLevel ? parseInt(logData.fuelLevel) || 100 : 100,
      };
      const log = await storage.createVehicleCheckInLog(logWithDefaults as any);

      await storage.updateVehicleMileage(logData.vehicleId, logData.endMileage);

      await storage.updateReservationStatus(checkOutLog.reservationId, "pending_review");

      const manualStatus = checkInManualVehicleStatus({
        hasIssues: Boolean(logData.issues?.trim()),
        needsCleaning: logData.cleanlinessStatus === "needs_cleaning",
      });
      if (manualStatus) {
        await storage.updateVehicleStatus(logData.vehicleId, manualStatus);
      } else {
        await syncVehicleStatus(logData.vehicleId);
      }

      if (logData.issues && logData.issues.trim().length > 0) {
        const userId = req.userId;
        const vehicle = await storage.getVehicle(logData.vehicleId);

        if (vehicle) {
          await storage.createTask({
            vehicleId: logData.vehicleId,
            name: `Maintenance Required: ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
            description: `Issues reported by user at check-in: ${logData.issues}\n\nCheck-in log ID: ${log.id}`,
            urgency: "high",
            initialDate: new Date(),
            taskType: "one_time",
            status: "not_started",
            createdById: userId,
          });
        }
      }

      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle check-in log");
    }
  });

  app.patch("/api/vehicle-checkin-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const logData = insertVehicleCheckInLogSchema.partial().parse(req.body);
      const log = await storage.updateVehicleCheckInLog(req.params.id, logData);
      if (!log) {
        return res.status(404).json({ message: "Check-in log not found" });
      }

      if (logData.endMileage) {
        await storage.updateVehicleMileage(log.vehicleId, logData.endMileage);
      }

      await syncVehicleStatus(log.vehicleId);

      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to update vehicle check-in log");
    }
  });

  app.delete("/api/vehicle-checkin-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const log = await storage.getVehicleCheckInLog(req.params.id);
      const vehicleId = log?.vehicleId;

      await storage.deleteVehicleCheckInLog(req.params.id);

      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle check-in log");
    }
  });

  // Sync vehicle statuses (admin only) - fixes vehicles stuck in incorrect state
  app.post("/api/vehicles/sync-statuses", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allVehicles = await storage.getVehicles();
      let updatedCount = 0;

      for (const vehicle of allVehicles) {
        const oldStatus = vehicle.status;
        await syncVehicleStatus(vehicle.id);
        
        const updatedVehicle = await storage.getVehicle(vehicle.id);
        if (updatedVehicle && updatedVehicle.status !== oldStatus) {
          updatedCount++;
        }
      }

      res.json({ 
        success: true, 
        message: `Synced all vehicles. ${updatedCount} vehicle(s) had their status updated.` 
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to sync vehicle statuses");
    }
  });

  // Vehicle maintenance schedules
  app.get("/api/vehicle-maintenance-schedules", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const schedules = await storage.getVehicleMaintenanceSchedules(vehicleId);
      res.json(schedules);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle maintenance schedules");
    }
  });

  // Vehicle maintenance logs
  app.get("/api/vehicles/:id/maintenance-logs", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const logs = await storage.getVehicleMaintenanceLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle maintenance logs");
    }
  });

  app.post("/api/vehicles/:id/maintenance-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const logData = insertVehicleMaintenanceLogSchema.parse({
        ...req.body,
        vehicleId: req.params.id,
      });
      const log = await storage.createVehicleMaintenanceLog(logData);

      if (log.mileageAtMaintenance) {
        await storage.updateVehicleMileage(req.params.id, log.mileageAtMaintenance);
      }

      res.json(log);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle maintenance log");
    }
  });

  app.delete("/api/vehicle-maintenance-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleMaintenanceLog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle maintenance log");
    }
  });

  app.get("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const schedule = await storage.getVehicleMaintenanceSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle maintenance schedule");
    }
  });

  app.post("/api/vehicle-maintenance-schedules", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const scheduleData = insertVehicleMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createVehicleMaintenanceSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle maintenance schedule");
    }
  });

  app.patch("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleMaintenanceScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateVehicleMaintenanceSchedule(req.params.id, validated);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update vehicle maintenance schedule");
    }
  });

  app.delete("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleMaintenanceSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle maintenance schedule");
    }
  });

  // Vehicle Documents (Insurance, Registration, Inspection, etc.)
  app.get("/api/vehicles/:id/documents", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const documents = await storage.getVehicleDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle documents");
    }
  });

  app.get("/api/vehicle-documents/:id", isAuthenticated, requireFleetPrivileged, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const document = await storage.getVehicleDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      const allowed = await canAccessVehicleDocument(
        req.userId,
        currentUser.role,
        document.id,
      );
      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(document);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vehicle document");
    }
  });

  app.post("/api/vehicles/:id/documents", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const documentData = insertVehicleDocumentSchema.parse({
        ...req.body,
        vehicleId: req.params.id,
        expirationDate: new Date(req.body.expirationDate),
      });
      const document = await storage.createVehicleDocument(documentData);
      res.json(document);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vehicle document");
    }
  });

  app.patch("/api/vehicle-documents/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleDocumentSchema.partial().parse(req.body);
      const updateData: any = { ...validated };
      if (updateData.expirationDate && typeof updateData.expirationDate === 'string') {
        updateData.expirationDate = new Date(updateData.expirationDate);
      }
      const document = await storage.updateVehicleDocument(req.params.id, updateData);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update vehicle document");
    }
  });

  app.delete("/api/vehicle-documents/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vehicle document");
    }
  });

  // Get documents expiring within specified days (for reminders)
  app.get("/api/vehicle-documents/expiring/:days", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = parseInt(req.params.days, 10);
      const days = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
      const expiringDocuments = await storage.getExpiringDocuments(days);
      res.json(expiringDocuments);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch expiring documents");
    }
  });

  // Mark document reminder as sent
  app.post("/api/vehicle-documents/:id/mark-reminder-sent", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const document = await storage.markDocumentReminderSent(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error) {
      handleRouteError(res, error, "Failed to mark document reminder as sent");
    }
  });

  // Checklist Templates
  app.get("/api/checklist-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch checklist templates");
    }
  });

  app.get("/api/checklist-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getChecklistTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch checklist template");
    }
  });

  app.post("/api/checklist-templates", isAuthenticated, requireStaffOrHigher, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const templateData = insertChecklistTemplateSchema.parse({
        ...req.body,
        createdById: userId,
      });
      const template = await storage.createChecklistTemplate(templateData);
      res.json(template);
    } catch (error) {
      handleRouteError(res, error, "Failed to create checklist template");
    }
  });

  app.patch("/api/checklist-templates/:id", isAuthenticated, requireStaffOrHigher, async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        items: z.array(z.object({
          text: z.string(),
          sortOrder: z.number().optional(),
        })).optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      
      const template = await storage.updateChecklistTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      handleRouteError(res, error, "Failed to update checklist template");
    }
  });

  app.delete("/api/checklist-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteChecklistTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete checklist template");
    }
  });
}
