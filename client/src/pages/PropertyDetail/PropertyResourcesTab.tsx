import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { Link } from "wouter";
import ResourceCard from "@/components/ResourceCard";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export function PropertyResourcesTab({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: propertyResources = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/properties", propertyId, "resources"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/properties/${propertyId}/resources`);
      return res.json();
    },
  });

  const sorted = [...propertyResources].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );

  const grouped = sorted.reduce((acc: Record<string, any[]>, r: any) => {
    const key = r.category?.name || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  if (isLoading) {
    return (
      <div className="border rounded-md divide-y">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-destructive" data-testid="resources-error">
        <p className="font-medium">Could not load resources</p>
        <p className="text-sm mt-1">{(error as Error)?.message || "Please try again later."}</p>
      </div>
    );
  }

  if (propertyResources.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="empty-resources">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No resources linked to {propertyName}</p>
        {isAdmin ? (
          <p className="text-sm mt-1">
            Go to the{" "}
            <Link href="/resources" className="underline text-primary">Resource Library</Link>
            {" "}to add resources and link them here.
          </p>
        ) : (
          <p className="text-sm mt-1">Resources can be added from the Resource Library.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto">
      {sortedGroupKeys.map(category => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
          <div className="border rounded-md divide-y">
            {grouped[category].map((resource: any) => (
              <ResourceCard key={resource.id} resource={resource} variant="list" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
