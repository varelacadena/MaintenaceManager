import type { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

export async function setupAuth(app: Express) {
  // Login and logout endpoints are registered in server/routes.ts
  // Session middleware is configured in server/index.ts
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    if ((req as any).currentUser?.id === userId) {
      (req as any).userId = userId;
      return next();
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach the session user once so downstream role guards and handlers do not
    // repeat the same DB lookup for every protected request.
    (req as any).userId = userId;
    (req as any).currentUser = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};