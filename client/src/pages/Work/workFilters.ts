export const UNASSIGNED_TECH_ID = "__unassigned_tech__";

export function matchesTechFilter(
  assignedToId: string | null | undefined,
  techFilter: string,
): boolean {
  if (!techFilter) return true;
  if (techFilter === UNASSIGNED_TECH_ID) return !assignedToId;
  return assignedToId === techFilter;
}
