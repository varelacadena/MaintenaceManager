import { ChevronRight, ChevronDown, FileText, Image as ImageIcon, Video } from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import { PanelSection } from "./PanelSection";

interface Upload {
  id: string;
  fileName: string;
  fileType: string;
  objectUrl: string;
  [key: string]: unknown;
}

interface PanelResourcesSectionProps {
  uploads: Upload[] | undefined;
  resourcesExpanded: boolean;
  setResourcesExpanded: (v: boolean) => void;
  docCount: number;
  imgCount: number;
  vidCount: number;
  variant?: "compact" | "full";
}

function ResourceBadges({ docCount, imgCount, vidCount }: { docCount: number; imgCount: number; vidCount: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
        {docCount} docs
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
        {imgCount} img
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
        {vidCount} vid
      </span>
    </span>
  );
}

function ResourceList({ uploads }: { uploads: Upload[] | undefined }) {
  if (!uploads || uploads.length === 0) {
    return <p className="text-xs text-center py-3 text-muted-foreground">No resources attached</p>;
  }

  return (
    <div className="space-y-1">
      {uploads.map((upload) => {
        const isImage = upload.fileType.startsWith("image/");
        const isVideo = upload.fileType.startsWith("video/");
        const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
        const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : "#EDE9FE";
        const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : "#7C3AED";
        const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
        const typeLabel = isImage
          ? "IMG"
          : isVideo
            ? "VID"
            : ext === "pdf"
              ? "PDF"
              : ext === "xls" || ext === "xlsx"
                ? "XLS"
                : ext === "doc" || ext === "docx"
                  ? "DOC"
                  : "FILE";
        return (
          <a
            key={upload.id}
            href={toDisplayUrl(upload.objectUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50"
            data-testid={`resource-item-${upload.id}`}
          >
            <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{ backgroundColor: badgeBg, color: badgeColor }}
            >
              {typeLabel}
            </span>
            <span className="text-xs truncate flex-1 text-foreground">{upload.fileName}</span>
            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}

export function PanelResourcesSection({
  uploads,
  resourcesExpanded,
  setResourcesExpanded,
  docCount,
  imgCount,
  vidCount,
  variant = "full",
}: PanelResourcesSectionProps) {
  if (variant === "compact") {
    return (
      <PanelSection
        title="Resources"
        icon={<FileText className="w-4 h-4" />}
        badge={<ResourceBadges docCount={docCount} imgCount={imgCount} vidCount={vidCount} />}
        expanded={resourcesExpanded}
        onToggle={() => setResourcesExpanded(!resourcesExpanded)}
        testId="button-toggle-resources"
      >
        <ResourceList uploads={uploads} />
      </PanelSection>
    );
  }

  return (
    <div
      className="px-5 py-3 cursor-pointer border-b border-border"
      onClick={() => setResourcesExpanded(!resourcesExpanded)}
      data-testid="button-toggle-resources"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Resources</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <ResourceBadges docCount={docCount} imgCount={imgCount} vidCount={vidCount} />
          {resourcesExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {resourcesExpanded && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <ResourceList uploads={uploads} />
        </div>
      )}
    </div>
  );
}
