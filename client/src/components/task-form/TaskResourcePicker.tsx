import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Resource } from "@shared/schema";

type LibraryResource = Resource & { category?: { name: string } | null };

export function TaskResourcePicker({
  selectedIds,
  onChange,
  variant = "panel",
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  variant?: "panel" | "page";
}) {
  const [search, setSearch] = useState("");
  const { data: resources = [] } = useQuery<LibraryResource[]>({
    queryKey: ["/api/resources"],
  });

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...resources].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    if (!query) return sorted;
    return sorted.filter((resource) => resource.title.toLowerCase().includes(query));
  }, [resources, search]);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((current) => current !== id) : [...selectedIds, id]);
  }

  return (
    <div className="space-y-2" data-testid="task-resource-picker">
      <p className={variant === "page" ? "text-sm font-medium" : "text-xs font-medium"} style={variant === "panel" ? { color: "#6B7280" } : undefined}>
        Resources
      </p>
      <p className="text-xs text-muted-foreground">
        Assign manuals and other library files to this task.
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search resources..."
          className="h-8 pl-8 text-sm"
          data-testid="input-task-resource-search"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border p-1">
        {visible.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">No resources found</p>
        ) : (
          visible.map((resource) => {
            const checked = selectedIds.includes(resource.id);
            return (
              <label
                key={resource.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted"
                data-testid={`checkbox-task-resource-${resource.id}`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(resource.id)} />
                <span className="min-w-0 flex-1 truncate text-sm">{resource.title}</span>
                {resource.category?.name ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{resource.category.name}</span>
                ) : null}
              </label>
            );
          })
        )}
      </div>
      {selectedIds.length > 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="text-task-resource-count">
          {selectedIds.length} resource{selectedIds.length === 1 ? "" : "s"} assigned
        </p>
      ) : null}
    </div>
  );
}
