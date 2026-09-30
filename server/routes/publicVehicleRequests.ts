import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import * as driverStorage from "../storage/drivers";
import { handleRouteError } from "../routeUtils";
import { syncVehicleStatus } from "../routeUtils";
import {
  checkInManualVehicleStatus,
  isReservationCheckoutAllowed,
  requiresCheckInReview,
} from "@shared/fleetReservationPolicy";
import {
  driverCanBeSelected,
  driverFullName,
  isPublicVehicleHoneypot,
  normalizePersonName,
  normalizeTripCode,
  publicVehicleRequestSchema,
} from "@shared/driverRoster";
import { createAccessToken, createTripCode } from "../driverAccess";
import { getPublicAppUrl } from "../appUrl";
import { notificationService, notifyDriverTripLink, notifyNewVehicleReservation } from "../notifications";
import type { User, VehicleReservation } from "@shared/schema";

const FUEL_LEVELS = new Set(["empty", "1/4", "1/2", "3/4", "full"]);
const FUEL_PERCENT: Record<string, number> = {
  empty: 0,
  "1/4": 25,
  "1/2": 50,
  "3/4": 75,
  full: 100,
};

async function issueTripAccess() {
  const accessToken = createAccessToken();
  let tripCode = createTripCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!(await driverStorage.tripCodeInUse(tripCode))) break;
    tripCode = createTripCode();
  }
  return { accessToken, tripCode };
}

function validateTripDates(startDate: Date, endDate: Date): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Enter a start and end time";
  }
  if (endDate <= startDate) {
    return "End date/time must be after start date/time";
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (startDateOnly < today) {
    return "Cannot create reservations for past dates";
  }
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (startDateOnly.getTime() === tomorrow.getTime() && now.getHours() >= 16) {
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    if (startMinutes < 9 * 60) {
      return "After 4:00 PM, reservations for tomorrow must start at or after 9:00 AM";
    }
  }
  return null;
}

async function loadOpenTrip(token: string) {
  const reservation = await driverStorage.getReservationByAccessToken(token);
  if (!reservation || reservation.linkRevokedAt) return null;
  return reservation;
}

function tripCodeVisible(reservation: VehicleReservation): boolean {
  if (reservation.linkRevokedAt) return false;
  if (reservation.status === "active") return true;
  return reservation.status === "approved" && isReservationCheckoutAllowed(reservation);
}

async function toPublicTrip(reservation: VehicleReservation) {
  const vehicle = reservation.vehicleId ? await storage.getVehicle(reservation.vehicleId) : undefined;
  const showCode = tripCodeVisible(reservation);
  const showKeys = showCode && Boolean(reservation.advisoryAccepted);
  return {
    driverName: reservation.driverName,
    purpose: reservation.purpose,
    passengerCount: reservation.passengerCount,
    notes: reservation.notes,
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    status: reservation.status,
    advisoryAccepted: Boolean(reservation.advisoryAccepted),
    tripCode: showCode ? reservation.tripCode : null,
    vehicle: vehicle
      ? {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vehicleId: vehicle.vehicleId,
          licensePlate: vehicle.licensePlate,
          color: vehicle.color,
        }
      : null,
    keyPickup: showKeys
      ? {
          method: reservation.keyPickupMethod,
          adminNotes: reservation.adminNotes,
          lockboxCode: reservation.revealedLockboxCode,
        }
      : null,
    canCancel: reservation.status === "pending" || reservation.status === "approved",
    canCheckout: reservation.status === "approved" && isReservationCheckoutAllowed(reservation),
    canCheckIn: reservation.status === "active",
  };
}

export function registerPublicVehicleRequestRoutes(app: Express) {
  const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many lookups. Please try again later." },
  });
  const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  });
  const codeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many code attempts. Please try again later." },
  });

  app.get("/api/public/approved-drivers", searchLimiter, async (req, res) => {
    try {
      const lastName = normalizePersonName(String(req.query.lastName || ""));
      if (lastName.length < 2) {
        return res.status(400).json({ message: "Enter at least 2 letters of the last name" });
      }
      const matches = await driverStorage.findActiveDriversByLastName(lastName);
      const penalized = await driverStorage.getActivePenaltyDriverIds();
      const drivers = matches
        .filter((driver) => driverCanBeSelected(driver, penalized.has(driver.id)))
        .map((driver) => ({
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          department: driver.department,
        }));
      res.json(drivers);
    } catch (error) {
      handleRouteError(res, error, "Failed to look up drivers");
    }
  });

  app.post("/api/public/vehicle-requests", submitLimiter, async (req, res) => {
    try {
      const parsed = publicVehicleRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }
      if (isPublicVehicleHoneypot(parsed.data)) {
        return res.json({ ok: true, linkSent: true });
      }

      const driver = await driverStorage.getApprovedDriver(parsed.data.driverId);
      const penalized = driver ? await driverStorage.driverHasActivePenalty(driver.id) : false;
      if (!driver || !driverCanBeSelected(driver, penalized)) {
        return res.status(400).json({
          message: "That person is not on the approved driver list. Contact the fleet office.",
        });
      }

      const startDate = new Date(parsed.data.startDate);
      const endDate = new Date(parsed.data.endDate);
      const dateError = validateTripDates(startDate, endDate);
      if (dateError) return res.status(400).json({ message: dateError });

      const access = await issueTripAccess();
      const reservation = await storage.createVehicleReservation({
        userId: null,
        driverId: driver.id,
        driverName: driverFullName(driver),
        accessToken: access.accessToken,
        tripCode: access.tripCode,
        purpose: parsed.data.purpose,
        passengerCount: parsed.data.passengerCount,
        notes: parsed.data.notes?.trim() || null,
        startDate,
        endDate,
        status: "pending",
        vehicleId: null,
      });

      const admins = await storage.getUsersByRoles(["admin"]);
      const requester = {
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
      } as User;
      notifyNewVehicleReservation(reservation, requester, admins, "Unassigned", notificationService).catch((err) =>
        console.error("Failed to notify admins of a driver vehicle request:", err),
      );

      let linkSent = false;
      if (driver.email) {
        const tripUrl = `${getPublicAppUrl(req)}/trip/${access.accessToken}`;
        try {
          await notifyDriverTripLink(
            driver.email,
            driverFullName(driver),
            tripUrl,
            reservation.purpose,
            startDate.toLocaleString(),
            endDate.toLocaleString(),
            notificationService,
          );
          linkSent = true;
        } catch (error) {
          console.error("Failed to email the trip link:", error);
        }
      }

      res.json({
        ok: true,
        linkSent,
        driverName: driverFullName(driver),
        hasEmail: Boolean(driver.email),
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to submit vehicle request");
    }
  });

  app.get("/api/public/vehicle-trips/:token", async (req, res) => {
    try {
      const reservation = await loadOpenTrip(req.params.token);
      if (!reservation) return res.status(404).json({ message: "This link is no longer active" });
      res.json(await toPublicTrip(reservation));
    } catch (error) {
      handleRouteError(res, error, "Failed to load trip");
    }
  });

  app.post("/api/public/vehicle-trips/:token/cancel", async (req, res) => {
    try {
      const reservation = await loadOpenTrip(req.params.token);
      if (!reservation) return res.status(404).json({ message: "This link is no longer active" });
      if (reservation.status !== "pending" && reservation.status !== "approved") {
        return res.status(400).json({ message: "This trip can no longer be cancelled from the link" });
      }
      const updated = await storage.updateReservationStatus(reservation.id, "cancelled");
      if (reservation.vehicleId) await syncVehicleStatus(reservation.vehicleId);
      res.json(await toPublicTrip(updated ?? reservation));
    } catch (error) {
      handleRouteError(res, error, "Failed to cancel trip");
    }
  });

  app.post("/api/public/vehicle-trips/:token/advisory", async (req, res) => {
    try {
      const reservation = await loadOpenTrip(req.params.token);
      if (!reservation) return res.status(404).json({ message: "This link is no longer active" });
      if (!tripCodeVisible(reservation)) {
        return res.status(400).json({ message: "Pickup instructions are not available yet" });
      }
      let revealedLockboxCode = reservation.revealedLockboxCode;
      if (!revealedLockboxCode && reservation.lockboxId) {
        const code = await storage.assignRandomCode(reservation.lockboxId);
        revealedLockboxCode = code?.code ?? null;
      }
      const updated = await storage.updateVehicleReservation(reservation.id, {
        advisoryAccepted: true,
        revealedLockboxCode,
      });
      res.json(await toPublicTrip(updated ?? { ...reservation, advisoryAccepted: true, revealedLockboxCode }));
    } catch (error) {
      handleRouteError(res, error, "Failed to accept the advisory");
    }
  });

  app.post("/api/public/vehicle-code", codeLimiter, async (req, res) => {
    try {
      const vehicleId = String(req.body?.vehicleId || "");
      const code = normalizeTripCode(String(req.body?.code || ""));
      if (!vehicleId || code.length < 4) {
        return res.status(400).json({ message: "Enter the trip code from your link" });
      }
      const reservation = await driverStorage.getReservationByTripCode(code, vehicleId);
      if (!reservation?.accessToken || !tripCodeVisible(reservation)) {
        return res.status(400).json({ message: "That code does not match this vehicle" });
      }
      res.json({ token: reservation.accessToken });
    } catch (error) {
      handleRouteError(res, error, "Failed to check the trip code");
    }
  });

  app.post("/api/public/vehicle-trips/:token/checkout", async (req, res) => {
    try {
      const reservation = await loadOpenTrip(req.params.token);
      if (!reservation?.vehicleId) return res.status(404).json({ message: "This link is no longer active" });
      if (!reservation.advisoryAccepted) {
        return res.status(400).json({ message: "Accept the safety note before checkout" });
      }
      if (reservation.status !== "approved" || !isReservationCheckoutAllowed(reservation)) {
        return res.status(400).json({ message: "Checkout is not available for this reservation yet" });
      }
      const startMileage = Number(req.body?.startMileage);
      const fuelLevel = String(req.body?.fuelLevel || "");
      if (!Number.isFinite(startMileage) || startMileage <= 0) {
        return res.status(400).json({ message: "Starting mileage must be a positive number" });
      }
      if (!FUEL_LEVELS.has(fuelLevel)) return res.status(400).json({ message: "Fuel level is required" });
      if (req.body?.cleanlinessConfirmed !== true) {
        return res.status(400).json({ message: "Confirm the vehicle condition before checkout" });
      }
      const vehicle = await storage.getVehicle(reservation.vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
      if (vehicle.currentMileage != null && startMileage < vehicle.currentMileage) {
        return res.status(400).json({
          message: `Starting mileage cannot be lower than the current vehicle mileage (${vehicle.currentMileage})`,
        });
      }
      const existing = await storage.getCheckOutLogByReservation(reservation.id);
      if (existing) return res.status(400).json({ message: "This trip is already checked out" });

      await storage.createVehicleCheckOutLog({
        reservationId: reservation.id,
        vehicleId: reservation.vehicleId,
        userId: null,
        startMileage,
        fuelLevel,
        cleanlinessConfirmed: true,
        damageNotes: req.body?.damageNotes ? String(req.body.damageNotes) : null,
        digitalSignature: req.body?.signature ? String(req.body.signature) : null,
      });
      await storage.updateVehicleMileage(reservation.vehicleId, startMileage);
      await storage.updateReservationStatus(reservation.id, "active");
      await syncVehicleStatus(reservation.vehicleId);
      const updated = await storage.getVehicleReservation(reservation.id);
      res.json(await toPublicTrip(updated ?? reservation));
    } catch (error) {
      handleRouteError(res, error, "Failed to check out");
    }
  });

  app.post("/api/public/vehicle-trips/:token/checkin", async (req, res) => {
    try {
      const reservation = await loadOpenTrip(req.params.token);
      if (!reservation?.vehicleId) return res.status(404).json({ message: "This link is no longer active" });
      if (reservation.status !== "active") {
        return res.status(400).json({ message: "Only an active trip can be checked in" });
      }
      const checkOutLog = await storage.getCheckOutLogByReservation(reservation.id);
      if (!checkOutLog) return res.status(400).json({ message: "This trip has not been checked out" });
      const existingCheckIn = await storage.getCheckInLogByCheckOut(checkOutLog.id);
      if (existingCheckIn) return res.status(400).json({ message: "This trip has already been checked in" });

      const endMileage = Number(req.body?.endMileage);
      const fuelLevel = String(req.body?.fuelLevel || "");
      const cleanlinessStatus = String(req.body?.cleanlinessStatus || "");
      if (!Number.isFinite(endMileage) || endMileage < checkOutLog.startMileage) {
        return res.status(400).json({ message: "End mileage cannot be less than the starting mileage" });
      }
      if (!FUEL_LEVELS.has(fuelLevel)) return res.status(400).json({ message: "Fuel level is required" });
      if (cleanlinessStatus !== "clean" && cleanlinessStatus !== "needs_cleaning") {
        return res.status(400).json({ message: "Cleanliness status is required" });
      }
      const issues = req.body?.issues ? String(req.body.issues) : null;
      const hasIssues = Boolean(issues?.trim());
      const needsCleaning = cleanlinessStatus === "needs_cleaning";
      const needsReview = requiresCheckInReview({ hasIssues, needsCleaning, fuelLevel });

      await storage.createVehicleCheckInLog({
        vehicleId: reservation.vehicleId,
        userId: null,
        checkOutLogId: checkOutLog.id,
        endMileage,
        endFuelLevel: FUEL_PERCENT[fuelLevel] ?? 100,
        cleanlinessStatus,
        issues,
        fuelLevel,
      });
      await storage.updateVehicleMileage(reservation.vehicleId, endMileage);
      await storage.updateReservationStatus(reservation.id, needsReview ? "pending_review" : "completed");
      const manualStatus = checkInManualVehicleStatus({ hasIssues, needsCleaning });
      if (manualStatus) {
        await storage.updateVehicleStatus(reservation.vehicleId, manualStatus);
      } else {
        await syncVehicleStatus(reservation.vehicleId);
      }
      const updated = await storage.getVehicleReservation(reservation.id);
      res.json(await toPublicTrip(updated ?? reservation));
    } catch (error) {
      handleRouteError(res, error, "Failed to check in");
    }
  });
}
