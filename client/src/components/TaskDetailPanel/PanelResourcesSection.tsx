import { ChevronRight, ChevronDown, FileText, Image as ImageIcon, Video } from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import { buildUploadPreviewOptions, isImageFileType, useImagePreview } from "@/components/ImagePreviewProvider";
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

function getImageUploads(uploads: Upload[] | undefined): Upload[] {
  return uploads?.filter((u) => u.fileType.startsWith("image/")) ?? [];
}

function getNonImageUploads(uploads: Upload[] | undefined): Upload[] {
  return uploads?.filter((u) => !u.fileType.startsWith("image/")) ?? [];
}

export function PhotoThumbnailGrid({
  uploads,
  columns = 3,
  size = "md",
}: {
  uploads: Upload[];
  columns?: 2 | 3 | 4;
  size?: "sm" | "md";
}) {
  const { openImagePreview } = useImagePreview();

  if (uploads.length === 0) return null;

  const gridCols = columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  const thumbSize = size === "sm" ? "aspect-square" : "aspect-square";

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {uploads.map((upload) => (
        <button
          key={upload.id}
          type="button"
          onClick={() => openImagePreview(buildUploadPreviewOptions(upload))}
          className={`block ${thumbSize} rounded-md overflow-hidden border border-border hover-elevate`}
          data-testid={`photo-thumb-${upload.id}`}
        >
          <img
            src={toDisplayUrl(upload.objectUrl)}
            alt={upload.fileName}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}

function ResourceBadges({ docCount, imgCount, vidCount }: { docCount: number; imgCount: number; vidCount: number }) {
  return (
    <span className="flex items-center gap-1">
      {imgCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
          {imgCount} photo{imgCount !== 1 ? "s" : ""}
        </span>
      )}
      {docCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {docCount} doc{docCount !== 1 ? "s" : ""}
        </span>
      )}
      {vidCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          {vidCount} vid{vidCount !== 1 ? "s" : ""}
        </span>
      )}
    </span>
  );
}

function ResourceList({ uploads, emptyMessage = "No files attached" }: { uploads: Upload[] | undefined; emptyMessage?: string }) {
  const { openImagePreview } = useImagePreview();

  if (!uploads || uploads.length === 0) {
    return <p className="text-xs text-center py-3 text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-1">
      {uploads.map((upload) => {
        const isImage = isImageFileType(upload.fileType);
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
        const handleClick = () => {
          if (isImage) {
            openImagePreview(buildUploadPreviewOptions(upload));
          } else {
            window.open(toDisplayUrl(upload.objectUrl), "_blank", "noopener,noreferrer");
          }
        };

        return (
          <button
            key={upload.id}
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50 w-full text-left"
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
          </button>
        );
      })}
    </div>
  );
}

function PhotosBlock({
  images,
  variant,
}: {
  images: Upload[];
  variant: "compact" | "full";
}) {
  if (images.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Photos ({images.length})
        </p>
        <PhotoThumbnailGrid uploads={images} columns={3} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-3 pb-1">
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>
        Photos ({images.length})
      </p>
      <PhotoThumbnailGrid uploads={images} columns={4} />
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
  const images = getImageUploads(uploads);
  const otherFiles = getNonImageUploads(uploads);
  const hasOtherFiles = otherFiles.length > 0;

  if (variant === "compact") {
    return (
      <>
        <PhotosBlock images={images} variant="compact" />
        {hasOtherFiles && (
          <PanelSection
            title="Files"
            icon={<FileText className="w-4 h-4" />}
            badge={<ResourceBadges docCount={docCount} imgCount={0} vidCount={vidCount} />}
            expanded={resourcesExpanded}
            onToggle={() => setResourcesExpanded(!resourcesExpanded)}
            testId="button-toggle-resources"
          >
            <ResourceList uploads={otherFiles} />
          </PanelSection>
        )}
        {images.length === 0 && !hasOtherFiles && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Photos
            </p>
            <p className="text-xs text-muted-foreground py-2">No photos or files yet</p>
          </div>
        )}
      </>
    );
  }

  const sectionTitle = hasOtherFiles ? "Files" : "Photos & Files";

  return (
    <div style={{ borderBottom: "1px solid #EEEEEE" }}>
      {images.length > 0 && <PhotosBlock images={images} variant="full" />}
      {(hasOtherFiles || images.length === 0) && (
        <div
          className="px-5 py-3 cursor-pointer"
          onClick={() => setResourcesExpanded(!resourcesExpanded)}
          data-testid="button-toggle-resources"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{sectionTitle}</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <ResourceBadges docCount={docCount} imgCount={images.length > 0 ? 0 : imgCount} vidCount={vidCount} />
              {resourcesExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {resourcesExpanded && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <ResourceList
                uploads={images.length > 0 ? otherFiles : uploads}
                emptyMessage="No photos or files attached"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
