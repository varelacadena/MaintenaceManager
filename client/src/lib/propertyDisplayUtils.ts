export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
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
