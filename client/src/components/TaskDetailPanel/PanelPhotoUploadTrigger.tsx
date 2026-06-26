import { Camera, Loader2 } from "lucide-react";

interface PanelPhotoUploadTriggerProps {
  onClick: () => void;
  isUploading: boolean;
  size?: "sm" | "md";
  testId?: string;
}

export function PanelPhotoUploadTrigger({
  onClick,
  isUploading,
  size = "md",
  testId = "button-panel-add-photo",
}: PanelPhotoUploadTriggerProps) {
  const dimension = size === "sm" ? "48px" : "54px";

  return (
    <button
      type="button"
      className="flex items-center justify-center rounded shrink-0 transition-colors hover:bg-muted/50"
      style={{ width: dimension, height: dimension, border: "2px dashed #D1D5DB" }}
      onClick={onClick}
      disabled={isUploading}
      data-testid={testId}
    >
      {isUploading ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
      ) : (
        <Camera className="w-4 h-4" style={{ color: "#9CA3AF" }} />
      )}
    </button>
  );
}
