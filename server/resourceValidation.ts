import { insertResourceSchema } from "@shared/schema";
import { z } from "zod";

const resourceUrlSchema = z.string().min(1).refine((url) => {
  if (url.startsWith("/api/objects/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "URL must be http(s) or an uploaded object path");

export const resourceCreateBodySchema = insertResourceSchema
  .omit({ createdById: true })
  .extend({
    url: resourceUrlSchema,
    propertyIds: z.array(z.string()).optional(),
  });

export const resourceUpdateBodySchema = insertResourceSchema
  .partial()
  .extend({
    url: resourceUrlSchema.optional(),
    propertyIds: z.array(z.string()).optional(),
  });

export function normalizeResourceFields<T extends Record<string, unknown>>(data: T): T {
  const normalized = { ...data } as T & {
    categoryId?: string | null;
    folderId?: string | null;
    equipmentId?: string | null;
    equipmentCategory?: string | null;
  };
  if ("categoryId" in normalized && !normalized.categoryId) normalized.categoryId = null;
  if ("folderId" in normalized && !normalized.folderId) normalized.folderId = null;
  if ("equipmentId" in normalized && !normalized.equipmentId) normalized.equipmentId = null;
  if ("equipmentCategory" in normalized && !normalized.equipmentCategory) normalized.equipmentCategory = null;
  return normalized as T;
}

function preprocessResourceBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const copy = { ...(body as Record<string, unknown>) };
  for (const key of ["categoryId", "folderId", "equipmentId", "equipmentCategory", "objectPath", "description", "fileName"]) {
    if (copy[key] === "") copy[key] = null;
  }
  return copy;
}

export function parseResourceCreateBody(body: unknown) {
  const parsed = resourceCreateBodySchema.parse(preprocessResourceBody(body));
  const { propertyIds = [], ...resourceData } = parsed;
  return {
    propertyIds,
    data: normalizeResourceFields(resourceData),
  };
}

export function parseResourceUpdateBody(body: unknown) {
  const parsed = resourceUpdateBodySchema.parse(preprocessResourceBody(body));
  const hasPropertyIds = Object.prototype.hasOwnProperty.call(body as object, "propertyIds");
  const { propertyIds, ...resourceData } = parsed;
  return {
    hasPropertyIds,
    propertyIds: hasPropertyIds ? (propertyIds ?? []) : undefined,
    data: normalizeResourceFields(resourceData),
  };
}
