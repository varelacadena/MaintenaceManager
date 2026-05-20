import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";

export const inventoryFormSchema = insertInventoryItemSchema.extend({
  quantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0).optional(),
});

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;
