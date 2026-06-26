export type PropertyLike = { id: string; name: string; address?: string | null };

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export function formatPropertyLabel(property: PropertyLike): string {
  return property.address ? `${property.name} (${property.address})` : property.name;
}

export function formatSpaceLabel(space: { name: string; floor?: string | null }): string {
  return space.floor ? `${space.name} (Floor ${space.floor})` : space.name;
}

export function propertyMatchesSearch(
  property: { name: string; address?: string | null },
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    property.name.toLowerCase().includes(normalizedQuery) ||
    (property.address?.toLowerCase().includes(normalizedQuery) ?? false)
  );
}
