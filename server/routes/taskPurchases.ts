import type { Express } from "express";
import { z } from "zod";
import type { User } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { canAccessTask, requireAdmin, requireTechnicianOrAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { parsePropertyIds } from "../localDates";
import { getDownloadUrl } from "../objectStorage";
import { zipStoredFiles } from "../purchaseZip";
import {
  createTaskPurchase,
  deleteTaskPurchase,
  getTaskPurchase,
  listPurchasesForPeriod,
  listTaskPurchases,
  updateTaskPurchase,
  type TaskPurchaseRecord,
} from "../storage/taskPurchases";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

const receiptSchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  fileType: z.string().trim().min(1).max(100),
  objectPath: z.string().trim().min(1).max(1000),
});

const purchaseFields = z.object({
  storeName: z.string().trim().min(1, "Enter the store").max(200),
  description: z.string().trim().min(1, "Enter what was bought").max(500),
  amount: z.number().positive("Enter the amount paid").max(1_000_000),
  purchasedOn: z.string().regex(dayPattern, "Enter the purchase date"),
});

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function personName(user: User): string {
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.username;
}

function isReceiptType(fileType: string): boolean {
  const type = fileType.toLowerCase();
  return type.startsWith("image/") || type === "application/pdf";
}

function isReceiptPath(objectPath: string): boolean {
  return objectPath.startsWith("uploads/") && !objectPath.includes("..");
}

function validDay(value: string): boolean {
  const match = dayPattern.exec(value);
  if (!match) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function canModifyPurchase(user: User, createdById: string | null): boolean {
  if (user.role === "admin") return true;
  return user.role === "technician" && !!createdById && createdById === user.id;
}

function receiptExtension(fileName: string | null, fileType: string | null): string {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (fileType === "application/pdf") return "pdf";
  if (fileType === "image/png") return "png";
  if (fileType === "image/webp") return "webp";
  return "jpg";
}

function safeFilePart(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function receiptDownloadName(row: TaskPurchaseRecord, used: Map<string, number>): string {
  const amount = money(row.amount).toFixed(2);
  const base = safeFilePart(`${row.purchasedOn} ${row.storeName} $${amount}`) || "receipt";
  const ext = receiptExtension(row.receiptFileName, row.receiptFileType);
  const count = (used.get(base) ?? 0) + 1;
  used.set(base, count);
  return count === 1 ? `${base}.${ext}` : `${base}-${count}.${ext}`;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function periodFilters(query: Record<string, unknown>) {
  const startDate = typeof query.startDate === "string" && dayPattern.test(query.startDate) ? query.startDate : undefined;
  const endDate = typeof query.endDate === "string" && dayPattern.test(query.endDate) ? query.endDate : undefined;
  const propertyIds = parsePropertyIds(typeof query.propertyId === "string" ? query.propertyId : "");
  return { startDate, endDate, propertyIds };
}

export function registerTaskPurchaseRoutes(app: Express) {
  app.get("/api/tasks/:taskId/purchases", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const allowed = await canAccessTask(req.userId, req.params.taskId);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
      const rows = await listTaskPurchases(req.params.taskId);
      res.json(rows);
    } catch (error) {
      handleRouteError(res, error, "Failed to load store runs");
    }
  });

  app.post("/api/tasks/:taskId/purchases", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const allowed = await canAccessTask(req.userId, req.params.taskId);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });

      const parsed = purchaseFields.extend({ receipt: receiptSchema }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Check the store run and try again." });
      }
      const body = parsed.data;
      if (!validDay(body.purchasedOn)) return res.status(400).json({ message: "Enter the purchase date" });
      if (!isReceiptType(body.receipt.fileType) || !isReceiptPath(body.receipt.objectPath)) {
        return res.status(400).json({ message: "The receipt needs to be a photo or a PDF" });
      }

      const row = await createTaskPurchase({
        taskId: req.params.taskId,
        storeName: body.storeName,
        description: body.description,
        amount: money(body.amount),
        purchasedOn: body.purchasedOn,
        receiptFileName: body.receipt.fileName,
        receiptFileType: body.receipt.fileType,
        receiptObjectPath: body.receipt.objectPath,
        createdById: user.id,
        createdByName: personName(user),
      });
      res.json(row);
    } catch (error) {
      handleRouteError(res, error, "Failed to save store run");
    }
  });

  app.patch("/api/task-purchases/:id", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const existing = await getTaskPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Store run not found" });
      const allowed = await canAccessTask(req.userId, existing.taskId);
      if (!allowed || !canModifyPurchase(user, existing.createdById)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const parsed = purchaseFields.extend({
        receipt: receiptSchema.nullable().optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Check the store run and try again." });
      }
      const body = parsed.data;
      if (!validDay(body.purchasedOn)) return res.status(400).json({ message: "Enter the purchase date" });

      const next: Parameters<typeof updateTaskPurchase>[1] = {
        storeName: body.storeName,
        description: body.description,
        amount: money(body.amount),
        purchasedOn: body.purchasedOn,
      };

      if (body.receipt === null) {
        if (user.role !== "admin") {
          return res.status(400).json({ message: "Keep the receipt, or ask an admin to remove it" });
        }
        next.receiptFileName = null;
        next.receiptFileType = null;
        next.receiptObjectPath = null;
      } else if (body.receipt) {
        if (!isReceiptType(body.receipt.fileType) || !isReceiptPath(body.receipt.objectPath)) {
          return res.status(400).json({ message: "The receipt needs to be a photo or a PDF" });
        }
        next.receiptFileName = body.receipt.fileName;
        next.receiptFileType = body.receipt.fileType;
        next.receiptObjectPath = body.receipt.objectPath;
      }

      const row = await updateTaskPurchase(existing.id, next);
      res.json(row);
    } catch (error) {
      handleRouteError(res, error, "Failed to update store run");
    }
  });

  app.delete("/api/task-purchases/:id", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const existing = await getTaskPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Store run not found" });
      const allowed = await canAccessTask(req.userId, existing.taskId);
      if (!allowed || !canModifyPurchase(user, existing.createdById)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await deleteTaskPurchase(existing.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete store run");
    }
  });

  app.get("/api/task-purchases/:id/receipt", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const existing = await getTaskPurchase(req.params.id);
      if (!existing?.receiptObjectPath) return res.status(404).json({ message: "Receipt not found" });
      const allowed = await canAccessTask(req.userId, existing.taskId);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
      const signedUrl = await getDownloadUrl(existing.receiptObjectPath);
      return res.redirect(302, signedUrl);
    } catch (error) {
      handleRouteError(res, error, "Failed to open receipt");
    }
  });

  app.get("/api/analytics/purchases", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const rows = await listPurchasesForPeriod(periodFilters(req.query));
      res.json(rows.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        taskName: row.taskName,
        propertyName: row.propertyName,
        storeName: row.storeName,
        description: row.description,
        amount: row.amount,
        purchasedOn: row.purchasedOn,
        receiptFileName: row.receiptFileName,
        createdByName: row.createdByName,
        hasReceipt: !!row.receiptObjectPath,
      })));
    } catch (error) {
      handleRouteError(res, error, "Failed to load purchases");
    }
  });

  app.get("/api/analytics/purchases/export", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const format = req.query.format === "zip" ? "zip" : req.query.format === "csv" ? "csv" : "";
      if (!format) return res.status(400).json({ message: "Format must be csv or zip" });
      const filters = periodFilters(req.query);
      const rows = await listPurchasesForPeriod(filters);
      const stamp = filters.startDate && filters.endDate
        ? `${filters.startDate}-to-${filters.endDate}`
        : filters.startDate
          ? `from-${filters.startDate}`
          : filters.endDate
            ? `until-${filters.endDate}`
            : "all-dates";

      if (format === "csv") {
        const header = ["Date", "Task", "Building", "Store", "What was bought", "Amount", "Receipt", "Added by"];
        const lines = [header.map(csvCell).join(",")];
        for (const row of rows) {
          lines.push([
            row.purchasedOn,
            row.taskName,
            row.propertyName || "",
            row.storeName,
            row.description,
            money(row.amount).toFixed(2),
            row.receiptFileName || "",
            row.createdByName || "",
          ].map(csvCell).join(","));
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="store-purchases-${stamp}.csv"`);
        return res.send(lines.join("\n"));
      }

      const withReceipts = rows.filter((row) => row.receiptObjectPath);
      if (withReceipts.length === 0) {
        return res.status(404).json({ message: "No receipts in this period" });
      }
      const used = new Map<string, number>();
      const files: { name: string; data: Buffer }[] = [];
      for (const row of withReceipts) {
        const signedUrl = await getDownloadUrl(row.receiptObjectPath!);
        const response = await fetch(signedUrl);
        if (!response.ok) continue;
        const data = Buffer.from(await response.arrayBuffer());
        files.push({ name: receiptDownloadName(row, used), data });
      }
      if (files.length === 0) {
        return res.status(404).json({ message: "The receipts could not be downloaded" });
      }
      const zip = zipStoredFiles(files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="store-receipts-${stamp}.zip"`);
      return res.send(zip);
    } catch (error) {
      handleRouteError(res, error, "Failed to export purchases");
    }
  });
}
