import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { handleRouteError } from "../routeUtils";
import * as studentStorage from "../storage/students";

export function registerNotificationRoutes(app: Express) {
  app.get("/api/notifications/counts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let pendingServiceRequests = 0;
      let pendingVehicleReservations = 0;
      const unreadMessages = 0;
      let approvedReservations = 0;
      let pendingSignups = 0;
      let pendingStudentTimeEdits = 0;

      if (currentUser.role === "admin") {
        pendingServiceRequests = await storage.countServiceRequests({
          statuses: ["pending", "under_review"],
        });

        const vehicleReservations = await storage.getVehicleReservationsPage(
          { status: "pending" },
          { limit: 1, offset: 0 },
        );
        pendingVehicleReservations = vehicleReservations.total;

        pendingSignups = await storage.getPendingUserCount();
        pendingStudentTimeEdits = await studentStorage.countPendingStudentTimeEditRequests();
      } else if (currentUser.role === "technician") {
        const vehicleReservations = await storage.getVehicleReservationsPage(
          { status: "pending" },
          { limit: 1, offset: 0 },
        );
        pendingVehicleReservations = vehicleReservations.total;
      } else {
        const myReservations = await storage.getVehicleReservations({
          userId: userId,
        });
        approvedReservations = myReservations.filter(r => 
          r.lastViewedStatus === "pending" && r.status === "approved"
        ).length;
      }

      res.json({
        pendingServiceRequests,
        pendingVehicleReservations,
        unreadMessages,
        approvedReservations,
        pendingSignups,
        pendingStudentTimeEdits,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch notification counts");
    }
  });
}
