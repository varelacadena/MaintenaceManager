import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replitAuth";
import { seedDatabase } from "./seed";

import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerVendorRoutes } from "./routes/vendors";
import { registerInventoryRoutes } from "./routes/inventory";
import { registerFacilityRoutes } from "./routes/facilities";
import { registerServiceRequestRoutes } from "./routes/serviceRequests";
import { registerTaskRoutes } from "./routes/tasks";
import { registerMessageRoutes } from "./routes/messages";
import { registerUploadRoutes } from "./routes/uploads";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerVehicleRoutes } from "./routes/vehicles";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerProjectRoutes } from "./routes/projects";
import { registerResourceRoutes } from "./routes/resources";
import { registerAiRoutes } from "./routes/ai";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  await seedDatabase();

  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerVendorRoutes(app);
  registerInventoryRoutes(app);
  registerFacilityRoutes(app);
  registerServiceRequestRoutes(app);
  registerTaskRoutes(app);
  registerMessageRoutes(app);
  registerUploadRoutes(app);
  registerNotificationRoutes(app);
  registerVehicleRoutes(app);
  registerAnalyticsRoutes(app);
  registerProjectRoutes(app);
  registerResourceRoutes(app);
  registerAiRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
