import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { requireFleetPrivileged } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { storage } from "../storage";
import * as driverStorage from "../storage/drivers";
import {
  approvedDriverInputSchema,
  driverFullName,
  driverHasContact,
  driverImportSchema,
  penaltyInputSchema,
} from "@shared/driverRoster";
import { createAccessToken, createTripCode } from "../driverAccess";
import { getPublicAppUrl } from "../appUrl";
import { notificationService, notifyDriverTripLink } from "../notifications";

function cleanDriverInput(data: {
  firstName: string;
  lastName: string;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  status: "active" | "inactive";
  notes?: string | null;
}) {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    department: data.department?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    status: data.status,
    notes: data.notes?.trim() || null,
  };
}

export function registerApprovedDriverRoutes(app: Express) {
  app.get("/api/approved-drivers", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const drivers = await driverStorage.getApprovedDrivers(String(req.query.search || ""));
      const penalized = await driverStorage.getActivePenaltyDriverIds();
      res.json(drivers.map((driver) => ({
        ...driver,
        activePenalty: penalized.has(driver.id),
      })));
    } catch (error) {
      handleRouteError(res, error, "Failed to load drivers");
    }
  });

  app.get("/api/approved-drivers/:id", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const driver = await driverStorage.getApprovedDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      const [penalties, reservations] = await Promise.all([
        driverStorage.getDriverPenalties(driver.id),
        storage.getVehicleReservations({ driverId: driver.id }),
      ]);
      res.json({
        ...driver,
        activePenalty: penalties.some((penalty) => !penalty.clearedAt),
        penalties,
        reservations,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to load driver");
    }
  });

  app.post("/api/approved-drivers", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const parsed = approvedDriverInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }
      const driver = await driverStorage.createApprovedDriver(cleanDriverInput(parsed.data));
      res.json(driver);
    } catch (error) {
      handleRouteError(res, error, "Failed to add driver");
    }
  });

  app.patch("/api/approved-drivers/:id", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const existing = await driverStorage.getApprovedDriver(req.params.id);
      if (!existing) return res.status(404).json({ message: "Driver not found" });
      const parsed = approvedDriverInputSchema.safeParse({ ...existing, ...req.body });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }
      const driver = await driverStorage.updateApprovedDriver(existing.id, cleanDriverInput(parsed.data));
      res.json(driver);
    } catch (error) {
      handleRouteError(res, error, "Failed to update driver");
    }
  });

  app.post("/api/approved-drivers/import", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const parsed = driverImportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid import", errors: parsed.error.flatten().fieldErrors });
      }
      let created = 0;
      const skipped: string[] = [];
      for (const row of parsed.data.drivers) {
        const input = cleanDriverInput(row);
        if (!driverHasContact(input)) {
          skipped.push(`${input.firstName} ${input.lastName}: no email or phone`);
          continue;
        }
        if (input.email) {
          const existing = await driverStorage.findDriverByEmail(input.email);
          if (existing) {
            skipped.push(`${driverFullName(input)}: email already on the list`);
            continue;
          }
        }
        await driverStorage.createApprovedDriver(input);
        created += 1;
      }
      res.json({ created, skipped });
    } catch (error) {
      handleRouteError(res, error, "Failed to import drivers");
    }
  });

  app.post("/api/approved-drivers/:id/penalties", isAuthenticated, requireFleetPrivileged, async (req: any, res) => {
    try {
      const driver = await driverStorage.getApprovedDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      const parsed = penaltyInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid penalty", errors: parsed.error.flatten().fieldErrors });
      }
      const penalty = await driverStorage.createDriverPenalty({
        driverId: driver.id,
        reason: parsed.data.reason,
        note: parsed.data.note?.trim() || null,
        reservationId: parsed.data.reservationId || null,
        appliedBy: req.userId,
      });
      res.json(penalty);
    } catch (error) {
      handleRouteError(res, error, "Failed to apply penalty");
    }
  });

  app.post("/api/driver-penalties/:id/clear", isAuthenticated, requireFleetPrivileged, async (req: any, res) => {
    try {
      const penalty = await driverStorage.clearDriverPenalty(req.params.id, req.userId);
      if (!penalty) return res.status(404).json({ message: "Penalty not found" });
      res.json(penalty);
    } catch (error) {
      handleRouteError(res, error, "Failed to clear penalty");
    }
  });

  app.post("/api/vehicle-reservations/:id/resend-link", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const reservation = await storage.getVehicleReservation(req.params.id);
      if (!reservation?.driverId || !reservation.accessToken) {
        return res.status(400).json({ message: "This reservation does not have a driver link" });
      }
      const driver = await driverStorage.getApprovedDriver(reservation.driverId);
      if (!driver?.email) {
        return res.status(400).json({ message: "This driver has no email on file" });
      }
      let accessToken = reservation.accessToken;
      if (reservation.linkRevokedAt) {
        accessToken = createAccessToken();
        await storage.updateVehicleReservation(reservation.id, {
          linkRevokedAt: null,
          accessToken,
          tripCode: createTripCode(),
        });
      }
      const tripUrl = `${getPublicAppUrl(req)}/trip/${accessToken}`;
      await notifyDriverTripLink(
        driver.email,
        reservation.driverName || driverFullName(driver),
        tripUrl,
        reservation.purpose,
        new Date(reservation.startDate).toLocaleString(),
        new Date(reservation.endDate).toLocaleString(),
        notificationService,
      );
      res.json({ ok: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to resend the link");
    }
  });

  app.post("/api/vehicle-reservations/:id/revoke-link", isAuthenticated, requireFleetPrivileged, async (req, res) => {
    try {
      const reservation = await storage.getVehicleReservation(req.params.id);
      if (!reservation) return res.status(404).json({ message: "Reservation not found" });
      await storage.updateVehicleReservation(reservation.id, {
        linkRevokedAt: new Date(),
      });
      res.json({ ok: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to revoke the link");
    }
  });
}
