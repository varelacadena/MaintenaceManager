import type { ResourceFolder } from "@shared/schema";

export type ResourceFormState = {
  title: string;
  description: string;
  type: "video" | "document" | "image" | "link";
  url: string;
  objectPath: string;
  fileName: string;
  categoryId: string;
  folderId: string;
  equipmentId: string;
  equipmentCategory: string;
  propertyIds: string[];
};

export function clearResourceFileFields(): Pick<ResourceFormState, "url" | "fileName" | "objectPath"> {
  return { url: "", fileName: "", objectPath: "" };
}

export function isUploadedResourceUrl(url: string, objectPath?: string | null): boolean {
  return Boolean(objectPath) || url.startsWith("/api/objects/");
}

export function shouldUsePasteUrlMode(
  type: ResourceFormState["type"],
  url: string,
  objectPath?: string | null,
): boolean {
  if (type !== "document" && type !== "image") return false;
  if (!url.trim()) return false;
  return !isUploadedResourceUrl(url, objectPath);
}

export function buildFolderPathLabel(
  folder: Pick<ResourceFolder, "id" | "name" | "parentId">,
  allFolders: Pick<ResourceFolder, "id" | "name" | "parentId">[],
): string {
  const byId = new Map(allFolders.map((item) => [item.id, item]));
  const parts: string[] = [];
  const visited = new Set<string>();
  let current: Pick<ResourceFolder, "id" | "name" | "parentId"> | undefined = folder;

  while (current && !visited.has(current.id) && parts.length < 50) {
    visited.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return parts.join(" / ");
}

export function hasActiveResourceFilters(
  search: string,
  typeFilter: string,
  categoryFilter: string,
): boolean {
  return Boolean(search.trim()) || typeFilter !== "all" || categoryFilter !== "all";
}

export function isFilteredEmptyView(
  filteredCount: number,
  totalResources: number,
  totalFolders: number,
  search: string,
  typeFilter: string,
  categoryFilter: string,
): boolean {
  if (filteredCount > 0) return false;
  return (
    totalResources > 0 ||
    totalFolders > 0 ||
    hasActiveResourceFilters(search, typeFilter, categoryFilter)
  );
}
