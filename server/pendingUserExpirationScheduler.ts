import { storage } from "./storage";

export function startPendingUserExpirationScheduler() {
  const runExpiry = async () => {
    try {
      const expiredCount = await storage.expireOldPendingUsers();
      if (expiredCount > 0) {
        console.log(`[SIGNUP EXPIRY] Expired ${expiredCount} pending signup request(s)`);
      }
    } catch (error) {
      console.error("[SIGNUP EXPIRY] Error running expiration:", error);
    }
  };

  runExpiry();

  setInterval(runExpiry, 6 * 60 * 60 * 1000);
  console.log("Pending user expiration scheduler started (runs every 6 hours)");
}
