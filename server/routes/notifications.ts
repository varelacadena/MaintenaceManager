import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { handleRouteError, getAuthUser } from "../routeUtils";

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
      let unreadMessages = 0;
      let approvedReservations = 0;
      let pendingSignups = 0;

      if (currentUser.role === "admin" || currentUser.role === "technician") {
        const serviceRequests = await storage.getServiceRequests({
          status: "pending",
        });
        pendingServiceRequests = serviceRequests.length;

        const underReviewRequests = await storage.getServiceRequests({
          status: "under_review",
        });
        pendingServiceRequests += underReviewRequests.length;

        const vehicleReservations = await storage.getVehicleReservations({
          status: "pending",
        });
        pendingVehicleReservations = vehicleReservations.length;

        pendingSignups = await storage.getPendingUserCount();
      } else {
        const myReservations = await storage.getVehicleReservations({
          userId: userId,
        });
        approvedReservations = myReservations.filter(r => 
          r.lastViewedStatus === "pending" && r.status === "approved"
        ).length;
      }

      const messages = await storage.getMessages();
      unreadMessages = messages.filter(
        (msg) => !msg.read && msg.senderId !== userId
      ).length;

      res.json({
        pendingServiceRequests,
        pendingVehicleReservations,
        unreadMessages,
        approvedReservations,
        pendingSignups,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch notification counts");
    }
  });
}
