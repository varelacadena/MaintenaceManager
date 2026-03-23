import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";

export function registerInventoryRoutes(app: Express) {
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory items");
    }
  });

  app.get("/api/inventory/by-barcode/:barcode", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItemByBarcode(req.params.barcode);
      if (!item) {
        return res.status(404).json({ message: "No inventory item found with that barcode" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory item by barcode");
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory item");
    }
  });

  app.post("/api/inventory", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to create inventory item");
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const cleaned = { ...req.body };
      for (const key of ["quantity", "minQuantity", "cost"]) {
        if (cleaned[key] === "" || cleaned[key] === null) {
          delete cleaned[key];
        }
      }
      const itemData = insertInventoryItemSchema.partial().parse(cleaned);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory item");
    }
  });

  app.patch("/api/inventory/:id/quantity", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quantitySchema = z.object({ change: z.number() });
      const { change } = quantitySchema.parse(req.body);
      const item = await storage.updateInventoryQuantity(req.params.id, change);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory quantity");
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete inventory item");
    }
  });

  app.patch("/api/inventory/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const stockStatusSchema = z.object({ stockStatus: z.enum(["stocked", "low", "out"]) });
      const { stockStatus } = stockStatusSchema.parse(req.body);
      const item = await storage.updateInventoryStatus(req.params.id, stockStatus);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory status");
    }
  });

  app.post("/api/inventory/:id/use-container", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.useOneContainer(req.params.id);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update container count");
    }
  });

  app.post("/api/inventory/ai-insights", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { type, taskDescription, taskCategory } = req.body;
      if (!["reorder", "task_parts", "summary"].includes(type)) {
        return res.status(400).json({ message: "Invalid type. Must be: reorder, task_parts, or summary" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const allItems = await storage.getInventoryItems();
      const allParts = await storage.getPartsByTask ? [] : [];

      const itemsSummary = allItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || "general",
        trackingMode: item.trackingMode || "counted",
        quantity: parseFloat(item.quantity || "0"),
        unit: item.unit || "units",
        minQuantity: parseFloat(item.minQuantity || "0"),
        packageInfo: item.packageInfo || null,
        stockStatus: item.stockStatus || "stocked",
        cost: item.cost ? parseFloat(item.cost) : null,
      }));

      let prompt = "";
      let responseFormat = "json";

      if (type === "reorder") {
        prompt = `You are an inventory manager for a college facility maintenance department.
Here is the current inventory (JSON):
${JSON.stringify(itemsSummary, null, 2)}

Analyze the stock levels. For each item that should be reordered (quantity at or below minQuantity, or stockStatus is 'low' or 'out', or running critically low), provide a reorder recommendation.

Respond ONLY with a valid JSON array like this:
[
  {
    "id": "item-uuid",
    "name": "Item Name",
    "currentQuantity": 2,
    "unit": "bottles",
    "suggestedReorderQuantity": 10,
    "reason": "Plain English reason for reorder",
    "urgency": "high" | "medium" | "low"
  }
]

Return an empty array [] if nothing needs reordering. Respond only with JSON, no markdown.`;
      } else if (type === "task_parts") {
        prompt = `You are an inventory assistant for a college facility maintenance team.
Here is the available inventory:
${JSON.stringify(itemsSummary, null, 2)}

A technician needs to complete this task:
- Description: ${taskDescription || "General maintenance task"}
- Category: ${taskCategory || "general"}

Based on the task and available inventory, suggest which items they are likely to need. Only suggest items that exist in the inventory list above.

Respond ONLY with a valid JSON array like this:
[
  {
    "id": "item-uuid",
    "name": "Item Name",
    "suggestedQuantity": 2,
    "unit": "bottles",
    "reason": "Brief reason why this item is needed"
  }
]

Return an empty array [] if no specific items are needed. Respond only with JSON, no markdown.`;
      } else if (type === "summary") {
        prompt = `You are an inventory analyst for a college facility maintenance department.
Here is the current inventory data:
${JSON.stringify(itemsSummary, null, 2)}

Write a brief (2-4 sentences) plain-English summary of:
1. Overall inventory health
2. Which categories are well-stocked vs. running low
3. Any items that need immediate attention

Be concise and practical. Do not use markdown formatting.`;
        responseFormat = "text";
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content ?? "";

      if (responseFormat === "text") {
        return res.json({ type, summary: content });
      }

      let parsed;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch {
        parsed = [];
      }

      res.json({ type, items: parsed });
    } catch (error: any) {
      console.error("Error generating AI inventory insights:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI insights" });
    }
  });
}
