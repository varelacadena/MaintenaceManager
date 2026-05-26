import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Equipment } from "@shared/schema";

type EquipmentListFilters = {
  propertyId?: string | null;
  spaceId?: string | null;
};

export const equipmentKeys = {
  root: ["/api/equipment"] as const,
  list: ({ propertyId, spaceId }: EquipmentListFilters = {}) =>
    ["/api/equipment", { propertyId: propertyId || null, spaceId: spaceId || null }] as const,
  uploads: (equipmentId: string) => ["/api/equipment", equipmentId, "uploads"] as const,
};

export async function fetchEquipmentList({
  propertyId,
  spaceId,
}: EquipmentListFilters = {}): Promise<Equipment[]> {
  const params = new URLSearchParams();
  if (propertyId) params.set("propertyId", propertyId);
  if (spaceId) params.set("spaceId", spaceId);
  const query = params.toString();
  const response = await apiRequest("GET", `/api/equipment${query ? `?${query}` : ""}`);
  return response.json();
}

export function invalidateEquipmentQueries() {
  return queryClient.invalidateQueries({ queryKey: equipmentKeys.root });
}
