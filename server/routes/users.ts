import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";

export function registerUserRoutes(app: Express) {
  app.post("/api/users", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleRouteError(res, error, "Failed to create user");
    }
  });

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (currentUser?.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      const users = await storage.getAllUsers();

      const roleFilter = req.query.role as string | undefined;
      let filtered = users;
      if (roleFilter && ["admin", "technician", "staff", "student"].includes(roleFilter)) {
        filtered = filtered.filter(u => u.role === roleFilter);
      }

      if (currentUser?.role === "admin") {
        res.json(filtered.map(({ password, ...user }) => user));
      } else {
        res.json(filtered.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          username: u.username,
        })));
      }
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch users");
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;

      if (currentUser?.role === "admin" || userId === req.params.id) {
        res.json(userWithoutPassword);
      } else {
        res.json({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          username: user.username,
        });
      }
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch user");
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const roleSchema = z.object({
        role: z.enum(["admin", "technician", "staff", "student"]),
      });
      const { role } = roleSchema.parse(req.body);

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid role", errors: error.errors });
      }
      handleRouteError(res, error, "Failed to update user role");
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userUpdateSchema = z.object({
        username: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      });
      const validated = userUpdateSchema.parse(req.body);

      const user = await storage.updateUser(id, validated);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error updating user:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      if (userToDelete.id === req.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      if (error.code === "23503") {
        return res.status(400).json({ message: "Cannot delete user with associated data. Remove their tasks and assignments first." });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/credentials/create", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { username, password, email, phoneNumber, firstName, lastName, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }

      if (!["admin", "technician", "staff", "student"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phoneNumber,
        firstName,
        lastName,
        role,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === "23505") {
        res.status(400).json({ message: "Username already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.patch("/api/credentials/:id/password", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const passwordSchema = z.object({
        password: z.string().min(1, "Password is required"),
      });
      const { password } = passwordSchema.parse(req.body);

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.updateUserPassword(id, hashedPassword);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid password data", errors: error.errors });
      }
      handleRouteError(res, error, "Failed to update password");
    }
  });

  app.delete("/api/credentials/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);

      if (error.code === '23503') {
        return res.status(409).json({
          message: "Cannot delete user because they have associated data (service requests, messages, or time entries). You can change their role or password instead."
        });
      }

      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch("/api/users/:id/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const targetId = req.params.id;

      if (userId !== targetId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const profileUpdateSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
      });
      const validated = profileUpdateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(targetId, validated);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      handleRouteError(res, error, "Failed to update profile");
    }
  });

  const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many password change attempts. Please try again in 15 minutes." },
  });

  app.post("/api/users/change-password", isAuthenticated, passwordChangeLimiter, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      handleRouteError(res, error, "Failed to change password");
    }
  });
}
