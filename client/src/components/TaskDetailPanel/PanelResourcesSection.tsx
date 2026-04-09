import {
  ChevronRight,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";

interface Upload {
  id: string;
  fileName: string;
  fileType: string;
  objectUrl: string;
  [key: string]: any;
}

interface PanelResourcesSectionProps {
  uploads: Upload[] | undefined;
  resourcesExpanded: boolean;
  setResourcesExpanded: (v: boolean) => void;
  docCount: number;
  imgCount: number;
  vidCount: number;
}

export function PanelResourcesSection({
  uploads,
  resourcesExpanded,
  setResourcesExpanded,
  docCount,
  imgCount,
  vidCount,
}: PanelResourcesSectionProps) {
  return (
    <div
      className="px-5 py-3 cursor-pointer"
      style={{ borderBottom: "1px solid #EEEEEE" }}
      onClick={() => setResourcesExpanded(!resourcesExpanded)}
      data-testid="button-toggle-resources"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4" style={{ color: "#6B7280" }} />
        <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Resources</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}
          >
            {docCount} docs
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
          >
            {imgCount} img
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: "#FFF1F2", color: "#F43F5E" }}
          >
            {vidCount} vid
          </span>
          {resourcesExpanded ? (
            <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          )}
        </div>
      </div>
      {resourcesExpanded && (
        <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
          {(!uploads || uploads.length === 0) ? (
            <p className="text-xs text-center py-4" style={{ color: "#9CA3AF" }}>
              No resources attached
            </p>
          ) : (
            uploads.map((upload) => {
              const isImage = upload.fileType.startsWith("image/");
              const isVideo = upload.fileType.startsWith("video/");
              const TypeIcon = isImage ? ImageIcon : isVideo ? Video : FileText;
              const badgeBg = isImage ? "#F3F4F6" : isVideo ? "#FFF1F2" : "#EDE9FE";
              const badgeColor = isImage ? "#6B7280" : isVideo ? "#F43F5E" : "#7C3AED";
              const ext = upload.fileName.split(".").pop()?.toLowerCase() || "";
              const typeLabel = isImage ? "IMG" : isVideo ? "VID"
                : ext === "pdf" ? "PDF" : ext === "xls" || ext === "xlsx" ? "XLS"
                : ext === "doc" || ext === "docx" ? "DOC" : "FILE";
              return (
                <a
                  key={upload.id}
                  href={toDisplayUrl(upload.objectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1.5 px-1 rounded hover-elevate"
                  data-testid={`resource-item-${upload.id}`}
                >
                  <TypeIcon className="w-4 h-4 shrink-0" style={{ color: badgeColor }} />
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ backgroundColor: badgeBg, color: badgeColor }}
                  >
                    {typeLabel}
                  </span>
                  <span className="text-xs truncate flex-1" style={{ color: "#374151" }}>
                    {upload.fileName}
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#9CA3AF" }} />
                </a>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
