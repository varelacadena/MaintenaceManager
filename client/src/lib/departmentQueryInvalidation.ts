import { queryClient } from "@/lib/queryClient";
import type { Area } from "@shared/schema";

const AREAS_QUERY_KEY = ["/api/areas"] as const;

export function setAreasQueryData(updater: (areas: Area[]) => Area[]) {
  queryClient.setQueriesData<Area[]>(
    { queryKey: AREAS_QUERY_KEY },
    (current) => updater(current ?? []),
  );
}

export async function refreshDepartmentQueries() {
  await queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY });
  await queryClient.refetchQueries({ queryKey: AREAS_QUERY_KEY, type: "all" });
}

export async function syncDepartmentQueries(updater?: (areas: Area[]) => Area[]) {
  if (updater) {
    setAreasQueryData(updater);
  }
  await refreshDepartmentQueries();
}

/** After deleting a department, tasks may be unassigned from that area on the server. */
export async function syncAfterDepartmentDelete(
  updater: (areas: Area[]) => Area[],
) {
  await syncDepartmentQueries(updater);
  await queryClient.refetchQueries({ queryKey: ["/api/tasks"], type: "all" });
}
