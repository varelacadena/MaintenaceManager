import type { Express, Request, Response } from "express";
import { z } from "zod";
import { PURCHASE_LINK_KINDS, type PurchaseLinkKind, type PurchaseView, type User } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { canAccessTask, requireAdmin, requireTechnicianOrAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { parsePropertyIds } from "../localDates";
import { getDownloadUrl } from "../objectStorage";
import { zipStoredFiles } from "../purchaseZip";
import { readReceiptBuffer } from "../receiptReader";
import type { ReceiptRead } from "../receiptParse";
import {
  addPurchaseLink,
  countPurchaseLinks,
  createPurchase,
  deletePurchase,
  deletePurchaseLink,
  getPurchase,
  getPurchaseLink,
  getPurchaseView,
  listPurchases,
  listTaskPurchases,
  purchaseTargetExists,
  searchPurchaseOptions,
  searchWorkJobs,
  updatePurchase,
  type PurchaseLinkInput,
} from "../storage/purchases";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

const receiptSchema = z.object({
  fileName: z.string().trim().min(1).max(500),
  fileType: z.string().trim().min(1).max(100),
  objectPath: z.string().trim().min(1).max(1000),
});

const linkSchema = z.object({
  kind: z.enum(PURCHASE_LINK_KINDS),
  targetId: z.string().trim().min(1).max(80),
});

const purchaseFields = z.object({
  storeName: z.string().trim().min(1, "Enter the store").max(200),
  description: z.string().trim().min(1, "Enter what was bought").max(500),
  amount: z.number().positive("Enter the amount paid").max(1_000_000),
  purchasedOn: z.string().regex(dayPattern, "Enter the purchase date"),
  poNumber: z.string().trim().min(1, "Enter the PO").max(80),
  purpose: z.enum(["shop_stock", "general"]).nullable().optional(),
  purposeNote: z.string().trim().max(300).nullable().optional(),
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
  if (!dayPattern.test(value)) return false;
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

function receiptDownloadName(row: PurchaseView, used: Map<string, number>): string {
  const amount = money(row.amount).toFixed(2);
  const store = safeFilePart(row.storeName).slice(0, 40);
  const po = row.poNumber ? safeFilePart(row.poNumber) : "";
  const base = [row.purchasedOn, store, `$${amount}`, po].filter(Boolean).join(" ") || "receipt";
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
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  return { startDate, endDate, propertyIds, query: search || undefined };
}

function dedupeLinks(links: PurchaseLinkInput[]): PurchaseLinkInput[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}:${link.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function whereLabel(row: PurchaseView): string {
  const parts = row.links.map((link) => link.label);
  if (row.purpose === "shop_stock") parts.push("Shop stock");
  if (row.purpose === "general") parts.push("General");
  return parts.join("; ");
}

function readNote(read: ReceiptRead): string {
  const found = [read.storeName, read.purchasedOn, read.amount].filter((value) => value != null).length;
  if (found === 0) return "Could not read the receipt. Enter the store, date, and amount.";
  if (found < 3) return "Some of the receipt could not be read. Check the fields.";
  return "Check the store, date, and amount.";
}

async function downloadReceipt(objectPath: string): Promise<Buffer> {
  const signedUrl = await getDownloadUrl(objectPath);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Could not open the receipt");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > 15 * 1024 * 1024) throw new Error("Receipt must be 15 MB or smaller");
  return data;
}

async function readStoredReceipt(objectPath: string, fileType: string) {
  const buffer = await downloadReceipt(objectPath);
  const read = await Promise.race([
    readReceiptBuffer(buffer, fileType),
    new Promise<ReceiptRead>((_, reject) => {
      setTimeout(() => reject(new Error("Reading the receipt took too long")), 25000);
    }),
  ]);
  return { ...read, message: readNote(read) };
}

async function ensureTargets(links: PurchaseLinkInput[], res: Response): Promise<boolean> {
  for (const link of links) {
    const exists = await purchaseTargetExists(link.kind, link.targetId);
    if (!exists) {
      res.status(400).json({ message: "Choose a record that still exists" });
      return false;
    }
  }
  return true;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

async function sendReceipt(req: Request & { userId?: string }, res: Response, purchaseId: string) {
  const existing = await getPurchase(purchaseId);
  if (!existing?.receiptObjectPath) return res.status(404).json({ message: "Receipt not found" });
  const signedUrl = await getDownloadUrl(existing.receiptObjectPath);
  return res.redirect(302, signedUrl);
}

export function registerPurchaseRoutes(app: Express) {
  app.get("/api/tasks/:taskId/purchases", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const allowed = await canAccessTask(req.userId, req.params.taskId);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
      res.json(await listTaskPurchases(req.params.taskId));
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
      const row = await createPurchase({
        storeName: body.storeName,
        description: body.description,
        amount: money(body.amount),
        purchasedOn: body.purchasedOn,
        poNumber: body.poNumber,
        purpose: body.purpose ?? null,
        purposeNote: body.purposeNote?.trim() || null,
        receiptFileName: body.receipt.fileName,
        receiptFileType: body.receipt.fileType,
        receiptObjectPath: body.receipt.objectPath,
        createdById: user.id,
        createdByName: personName(user),
      }, [{ kind: "task", targetId: req.params.taskId }]);
      res.json(row);
    } catch (error) {
      handleRouteError(res, error, "Failed to save store run");
    }
  });

  app.delete("/api/tasks/:taskId/purchases/:purchaseId", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const allowed = await canAccessTask(req.userId, req.params.taskId);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
      const existing = await getPurchaseView(req.params.purchaseId);
      if (!existing) return res.status(404).json({ message: "Receipt not found" });
      const link = existing.links.find((item) => item.kind === "task" && item.targetId === req.params.taskId);
      if (!link) return res.status(404).json({ message: "This receipt is not on this job" });
      const onlyHere = existing.links.length === 1 && !existing.purpose;
      if (onlyHere) {
        if (!canModifyPurchase(user, existing.createdById)) return res.status(403).json({ message: "Forbidden" });
        await deletePurchase(existing.id);
        return res.json({ success: true, removed: "purchase" });
      }
      await deletePurchaseLink(link.id);
      res.json({ success: true, removed: "link" });
    } catch (error) {
      handleRouteError(res, error, "Failed to remove store run");
    }
  });

  app.get("/api/purchases/jobs", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
      const technicianId = typeof req.query.technicianId === "string" ? req.query.technicianId.slice(0, 80) : "";
      const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId.slice(0, 80) : "";
      res.json(await searchWorkJobs({ query, technicianId, propertyId }));
    } catch (error) {
      handleRouteError(res, error, "Failed to load jobs");
    }
  });

  app.get("/api/purchases/options", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const kind = typeof req.query.kind === "string" ? req.query.kind : "";
      if (!PURCHASE_LINK_KINDS.includes(kind as PurchaseLinkKind)) {
        return res.status(400).json({ message: "Choose what to link" });
      }
      const query = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
      res.json(await searchPurchaseOptions(kind as PurchaseLinkKind, query));
    } catch (error) {
      handleRouteError(res, error, "Failed to load records");
    }
  });

  app.get("/api/purchases/export", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const format = req.query.format === "zip" ? "zip" : req.query.format === "csv" ? "csv" : "";
      if (!format) return res.status(400).json({ message: "Format must be csv or zip" });
      const filters = periodFilters(req.query);
      const rows = await listPurchases(filters);
      const stamp = filters.startDate && filters.endDate
        ? `${filters.startDate}-to-${filters.endDate}`
        : filters.startDate
          ? `from-${filters.startDate}`
          : filters.endDate
            ? `until-${filters.endDate}`
            : "all-dates";

      if (format === "csv") {
        const header = ["Date", "PO", "Store", "What was bought", "Amount", "Linked to", "Receipt", "Added by"];
        const lines = [header.map(csvCell).join(",")];
        for (const row of rows) {
          lines.push([
            row.purchasedOn,
            row.poNumber || "",
            row.storeName,
            row.description,
            money(row.amount).toFixed(2),
            whereLabel(row),
            row.receiptFileName || "",
            row.createdByName || "",
          ].map(csvCell).join(","));
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="store-purchases-${stamp}.csv"`);
        return res.send(lines.join("\n"));
      }

      const withReceipts = rows.filter((row) => row.receiptObjectPath);
      if (withReceipts.length === 0) return res.status(404).json({ message: "No receipts in this period" });
      const used = new Map<string, number>();
      const files: { name: string; data: Buffer }[] = [];
      for (const row of withReceipts) {
        try {
          const data = await downloadReceipt(row.receiptObjectPath!);
          files.push({ name: receiptDownloadName(row, used), data });
        } catch {
          continue;
        }
      }
      if (files.length === 0) return res.status(404).json({ message: "The receipts could not be downloaded" });
      const zip = zipStoredFiles(files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="store-receipts-${stamp}.zip"`);
      return res.send(zip);
    } catch (error) {
      handleRouteError(res, error, "Failed to export purchases");
    }
  });

  app.post("/api/purchases/read-receipt", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const parsed = receiptSchema.pick({ objectPath: true, fileType: true }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Add a photo or PDF of the receipt" });
      if (!isReceiptType(parsed.data.fileType) || !isReceiptPath(parsed.data.objectPath)) {
        return res.status(400).json({ message: "The receipt needs to be a photo or a PDF" });
      }
      const read = await readStoredReceipt(parsed.data.objectPath, parsed.data.fileType);
      if (!read.storeName && !read.purchasedOn && read.amount == null) {
        return res.status(422).json({ message: read.message });
      }
      res.json(read);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read the receipt";
      return res.status(422).json({ message: message || "Could not read the receipt. Enter the store, date, and amount." });
    }
  });

  app.get("/api/purchases", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      res.json(await listPurchases(periodFilters(req.query as Record<string, unknown>)));
    } catch (error) {
      handleRouteError(res, error, "Failed to load purchases");
    }
  });

  app.post("/api/purchases", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const parsed = purchaseFields.extend({
        receipt: receiptSchema,
        links: z.array(linkSchema).max(12).optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Check the receipt and try again." });
      }
      const body = parsed.data;
      if (!validDay(body.purchasedOn)) return res.status(400).json({ message: "Enter the purchase date" });
      if (!isReceiptType(body.receipt.fileType) || !isReceiptPath(body.receipt.objectPath)) {
        return res.status(400).json({ message: "The receipt needs to be a photo or a PDF" });
      }
      const links = dedupeLinks(body.links ?? []);
      for (const link of links) {
        if (link.kind === "task") {
          const allowed = await canAccessTask(req.userId, link.targetId);
          if (!allowed) return res.status(403).json({ message: "Forbidden" });
        }
      }
      if (!(await ensureTargets(links, res))) return;
      const row = await createPurchase({
        storeName: body.storeName,
        description: body.description,
        amount: money(body.amount),
        purchasedOn: body.purchasedOn,
        poNumber: body.poNumber,
        purpose: body.purpose ?? null,
        purposeNote: body.purposeNote?.trim() || null,
        receiptFileName: body.receipt.fileName,
        receiptFileType: body.receipt.fileType,
        receiptObjectPath: body.receipt.objectPath,
        createdById: user.id,
        createdByName: personName(user),
      }, links);
      res.json(row);
    } catch (error) {
      if (isUniqueViolation(error)) return res.status(400).json({ message: "This receipt is already linked there" });
      handleRouteError(res, error, "Failed to save purchase");
    }
  });

  const updatePurchaseHandler = async (req: any, res: Response) => {
    try {
      const user = req.currentUser as User;
      const existing = await getPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Receipt not found" });
      if (!canModifyPurchase(user, existing.createdById)) return res.status(403).json({ message: "Forbidden" });
      const parsed = purchaseFields.extend({
        receipt: receiptSchema.nullable().optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Check the receipt and try again." });
      }
      const body = parsed.data;
      if (!validDay(body.purchasedOn)) return res.status(400).json({ message: "Enter the purchase date" });
      const next: Parameters<typeof updatePurchase>[1] = {
        storeName: body.storeName,
        description: body.description,
        amount: money(body.amount),
        purchasedOn: body.purchasedOn,
        poNumber: body.poNumber,
        purpose: body.purpose === undefined ? existing.purpose : body.purpose,
        purposeNote: body.purposeNote === undefined ? existing.purposeNote : (body.purposeNote?.trim() || null),
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
      res.json(await updatePurchase(existing.id, next));
    } catch (error) {
      handleRouteError(res, error, "Failed to update purchase");
    }
  };

  const deletePurchaseHandler = async (req: any, res: Response) => {
    try {
      const user = req.currentUser as User;
      const existing = await getPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Receipt not found" });
      if (!canModifyPurchase(user, existing.createdById)) return res.status(403).json({ message: "Forbidden" });
      await deletePurchase(existing.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete purchase");
    }
  };

  app.patch("/api/purchases/:id", isAuthenticated, requireTechnicianOrAdmin, updatePurchaseHandler);
  app.patch("/api/task-purchases/:id", isAuthenticated, requireTechnicianOrAdmin, updatePurchaseHandler);
  app.delete("/api/purchases/:id", isAuthenticated, requireTechnicianOrAdmin, deletePurchaseHandler);
  app.delete("/api/task-purchases/:id", isAuthenticated, requireTechnicianOrAdmin, deletePurchaseHandler);

  app.get("/api/purchases/:id/receipt", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      await sendReceipt(req, res, req.params.id);
    } catch (error) {
      handleRouteError(res, error, "Failed to open receipt");
    }
  });

  app.get("/api/task-purchases/:id/receipt", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      await sendReceipt(req, res, req.params.id);
    } catch (error) {
      handleRouteError(res, error, "Failed to open receipt");
    }
  });

  app.post("/api/purchases/:id/read", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const existing = await getPurchase(req.params.id);
      if (!existing?.receiptObjectPath || !existing.receiptFileType) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      const read = await readStoredReceipt(existing.receiptObjectPath, existing.receiptFileType);
      if (!read.storeName && !read.purchasedOn && read.amount == null) {
        return res.status(422).json({ message: read.message });
      }
      res.json(read);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read the receipt";
      return res.status(422).json({ message });
    }
  });

  app.post("/api/purchases/:id/links", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const existing = await getPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Receipt not found" });
      const parsed = linkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Choose what to link" });
      const link = parsed.data;
      if (link.kind === "task") {
        const allowed = await canAccessTask(req.userId, link.targetId);
        if (!allowed) return res.status(403).json({ message: "Forbidden" });
      }
      if (!(await purchaseTargetExists(link.kind, link.targetId))) {
        return res.status(400).json({ message: "Choose a record that still exists" });
      }
      const count = await countPurchaseLinks(existing.id);
      if (count >= 12) return res.status(400).json({ message: "This receipt already has enough links" });
      await addPurchaseLink(existing.id, link);
      res.json(await getPurchaseView(existing.id));
    } catch (error) {
      if (isUniqueViolation(error)) return res.status(400).json({ message: "This receipt is already linked there" });
      handleRouteError(res, error, "Failed to link receipt");
    }
  });

  app.delete("/api/purchases/:id/links/:linkId", isAuthenticated, requireTechnicianOrAdmin, async (req: any, res) => {
    try {
      const user = req.currentUser as User;
      const existing = await getPurchase(req.params.id);
      if (!existing) return res.status(404).json({ message: "Receipt not found" });
      const link = await getPurchaseLink(req.params.linkId);
      if (!link || link.purchaseId !== existing.id) return res.status(404).json({ message: "Link not found" });
      const canRemove = canModifyPurchase(user, existing.createdById)
        || (!!link.taskId && await canAccessTask(req.userId, link.taskId));
      if (!canRemove) return res.status(403).json({ message: "Forbidden" });
      await deletePurchaseLink(link.id);
      res.json(await getPurchaseView(existing.id));
    } catch (error) {
      handleRouteError(res, error, "Failed to remove link");
    }
  });
}
