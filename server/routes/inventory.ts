import type { Express, Request } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireInventoryOperator, requireInventoryReader } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { insertInventoryItemSchema } from "@shared/schema";
import {
  redactInventoryItemForRole,
  redactInventoryItemsForRole,
  formatInventoryDbError,
} from "../inventoryDto";
import type { InventoryListFilter, InventoryListSort } from "../storage/inventoryList";
import { inventoryItemsToCsvString } from "../inventoryExportCsv";
import { redactPartUsageCost } from "../inventoryDto";
import { z } from "zod";

function readerRole(req: Request): string {
  const user = (req as Request & { currentUser?: { role: string } }).currentUser;
  return user?.role ?? "student";
}

function normalizeInventoryBody(input: Record<string, unknown>): Record<string, unknown> {
  const body = { ...input };
  if (body["barcode"] === "" || body["barcode"] === null) body["barcode"] = null;
  if (body["cost"] === "" || body["cost"] === null) body["cost"] = null;
  for (const key of ["quantity", "minQuantity"] as const) {
    if (body[key] === "" || body[key] === null || body[key] === undefined) {
      delete body[key];
    }
  }
  return body;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  lowStock: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  sort: z
    .enum(["name-asc", "name-desc", "qty-asc", "qty-desc"])
    .optional(),
});

const exportQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  lowStock: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  sort: z.enum(["name-asc", "name-desc", "qty-asc", "qty-desc"]).optional(),
});

export function registerInventoryRoutes(app: Express) {
  app.get("/api/inventory/export", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const role = readerRole(req);
      const parsed = exportQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid export parameters" });
      }
      const filter: InventoryListFilter = {
        category: parsed.data.category,
        q: parsed.data.q,
        lowStock: parsed.data.lowStock ?? false,
        sort: (parsed.data.sort ?? "name-asc") as InventoryListSort,
      };
      const items = await storage.listInventoryItemsForExport(filter);
      const redacted = redactInventoryItemsForRole(items, role);
      const csv = inventoryItemsToCsvString(redacted, role === "admin");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="inventory-export.csv"');
      res.send(csv);
    } catch (error) {
      handleRouteError(res, error, "Failed to export inventory");
    }
  });

  app.get("/api/inventory/summary", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const summary = await storage.getInventorySummary();
      res.json(summary);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory summary");
    }
  });

  app.get("/api/inventory", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const role = readerRole(req);
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid inventory list parameters" });
      }
      const { page, pageSize, category, q, lowStock, sort } = parsed.data;

      const result = await storage.listInventoryItemsPaginated({
        page: page ?? 0,
        pageSize: pageSize ?? 30,
        category,
        q,
        lowStock: lowStock ?? false,
        sort: (sort ?? "name-asc") as InventoryListSort,
      });
      res.json({
        ...result,
        items: redactInventoryItemsForRole(result.items, role),
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory items");
    }
  });

  app.get("/api/inventory/by-barcode/:barcode", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const item = await storage.getInventoryItemByBarcode(req.params.barcode);
      if (!item) {
        return res.status(404).json({ message: "No inventory item found with that barcode" });
      }
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory item by barcode");
    }
  });

  app.get("/api/inventory/:id/parts-usage", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      const usage = await storage.getPartsByInventoryItem(req.params.id);
      res.json(redactPartUsageCost(usage, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory usage history");
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, requireInventoryReader, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory item");
    }
  });

  app.post("/api/inventory/import", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const importSchema = z.object({
        items: z.array(insertInventoryItemSchema).min(1).max(500),
      });
      const { items } = importSchema.parse(req.body);
      let created = 0;
      const errors: { row: number; message: string }[] = [];
      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const body = insertInventoryItemSchema.parse(normalizeInventoryBody(row));
        try {
          await storage.createInventoryItem(body);
          created++;
        } catch (err: unknown) {
          const friendly = formatInventoryDbError(err);
          const msg =
            friendly ??
            (err instanceof Error ? err.message : "Failed to create item");
          errors.push({ row: i + 1, message: msg });
        }
      }
      res.json({ created, errors, total: items.length });
    } catch (error) {
      handleRouteError(res, error, "Failed to import inventory items");
    }
  });

  app.post("/api/inventory", isAuthenticated, requireInventoryOperator, async (req, res) => {
    try {
      const body = normalizeInventoryBody(req.body);
      const itemData = insertInventoryItemSchema.parse(body);
      const item = await storage.createInventoryItem(itemData);
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      const friendly = formatInventoryDbError(error);
      if (friendly) return res.status(409).json({ message: friendly });
      handleRouteError(res, error, "Failed to create inventory item");
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const cleaned = normalizeInventoryBody(req.body);
      const itemData = insertInventoryItemSchema.partial().parse(cleaned);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      const friendly = formatInventoryDbError(error);
      if (friendly) return res.status(409).json({ message: friendly });
      handleRouteError(res, error, "Failed to update inventory item");
    }
  });

  app.patch("/api/inventory/:id/quantity", isAuthenticated, requireInventoryOperator, async (req, res) => {
    try {
      const quantitySchema = z.object({ change: z.number() });
      const { change } = quantitySchema.parse(req.body);
      const existing = await storage.getInventoryItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      if (existing.trackingMode === "status") {
        return res.status(400).json({
          message: "Status-tracked items use stock status instead of quantity adjustments",
        });
      }
      const item = await storage.updateInventoryQuantity(req.params.id, change);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory quantity");
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getInventoryItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      await storage.deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const dbErr = error as { code?: string };
      if (dbErr?.code === "23503") {
        return res.status(409).json({
          message:
            "Cannot delete this item because it is linked to parts used on tasks. Remove those part entries first.",
        });
      }
      handleRouteError(res, error, "Failed to delete inventory item");
    }
  });

  app.patch("/api/inventory/:id/status", isAuthenticated, requireInventoryOperator, async (req, res) => {
    try {
      const stockStatusSchema = z.object({ stockStatus: z.enum(["stocked", "low", "out"]) });
      const { stockStatus } = stockStatusSchema.parse(req.body);
      const item = await storage.updateInventoryStatus(req.params.id, stockStatus);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory status");
    }
  });

  app.post("/api/inventory/:id/use-container", isAuthenticated, requireInventoryOperator, async (req, res) => {
    try {
      const existing = await storage.getInventoryItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      if (existing.trackingMode === "status") {
        return res.status(400).json({
          message: "Status-tracked items cannot use container decrement",
        });
      }
      if (existing.trackingMode !== "container") {
        return res.status(400).json({
          message: "Only container-tracked items support “used one”",
        });
      }
      const item = await storage.useOneContainer(req.params.id);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(redactInventoryItemForRole(item, readerRole(req)));
    } catch (error) {
      handleRouteError(res, error, "Failed to update container count");
    }
  });
}
