import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ChevronRight,
  Paperclip,
  Download,
  BookOpen,
} from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import ResourceCard from "@/components/ResourceCard";
import type { Property, QuoteAttachment } from "@shared/schema";
import { isToday, isTomorrow, isPast, format } from "date-fns";

export function QuoteAttachmentsList({ quoteId }: { quoteId: string }) {
  const { data: attachments = [], isLoading } = useQuery<QuoteAttachment[]>({
    queryKey: ["/api/quotes", quoteId, "attachments"],
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return null;
  }

  const handleDownload = (attachment: QuoteAttachment) => {
    window.open(toDisplayUrl(attachment.storageUrl), "_blank");
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Paperclip className="w-3 h-3" />
        Attachments ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <Button
            key={attachment.id}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2 gap-1"
            onClick={() => handleDownload(attachment)}
            data-testid={`button-download-attachment-${attachment.id}`}
          >
            <Download className="w-3 h-3" />
            {attachment.fileName.length > 20 
              ? attachment.fileName.substring(0, 17) + "..." 
              : attachment.fileName}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function MultiPropertyDisplay({ properties, isTechnicianOrAdmin, safeNavigate }: {
  properties: Property[];
  isTechnicianOrAdmin: boolean;
  safeNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE = 3;
  const visible = expanded ? properties : properties.slice(0, MAX_VISIBLE);
  const hiddenCount = properties.length - MAX_VISIBLE;

  return (
    <div className="space-y-1.5" data-testid="display-multi-property">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium">{properties.length} Buildings</span>
        <Badge variant="secondary" className="text-xs">Multi-Building</Badge>
      </div>
      <div className={expanded && properties.length > 6 ? "max-h-[280px] overflow-y-auto space-y-1.5" : "space-y-1.5"}>
        {visible.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 p-2.5 min-h-[44px] bg-muted/50 rounded-md ${isTechnicianOrAdmin ? "hover-elevate active-elevate-2 cursor-pointer" : ""}`}
            onClick={() => isTechnicianOrAdmin && safeNavigate(`/properties/${p.id}`)}
            data-testid={`link-multi-property-${p.id}`}
          >
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{p.name}</span>
            {isTechnicianOrAdmin && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="text-sm text-primary hover:underline pl-6 min-h-[44px]"
          onClick={() => setExpanded(true)}
          data-testid="button-show-more-buildings"
        >
          +{hiddenCount} more building{hiddenCount > 1 ? "s" : ""}
        </button>
      )}
      {expanded && properties.length > MAX_VISIBLE && (
        <button
          type="button"
          className="text-sm text-primary hover:underline pl-6 min-h-[44px]"
          onClick={() => setExpanded(false)}
          data-testid="button-show-fewer-buildings"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}

export function getDateLabel(date: Date | string | null): { label: string; isOverdue: boolean } {
  if (!date) return { label: "No date", isOverdue: false };
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", isOverdue: false };
  if (isTomorrow(d)) return { label: "Tomorrow", isOverdue: false };
  if (isPast(d)) return { label: `Overdue (${format(d, "MMM d")})`, isOverdue: true };
  return { label: format(d, "MMM d"), isOverdue: false };
}

export function TaskResourcesSection({ resources, propertyName }: { resources: any[]; propertyName?: string }) {
  if (!resources || resources.length === 0) return null;
  const sorted = [...resources].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
  return (
    <div className="space-y-3" data-testid="task-resources-section">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {propertyName ? `${propertyName} Resources` : "Property Resources"}
        </p>
      </div>
      <div className="border rounded-md divide-y">
        {sorted.map((resource: any) => (
          <ResourceCard key={resource.id} resource={resource} variant="list" />
        ))}
      </div>
    </div>
  );
}
