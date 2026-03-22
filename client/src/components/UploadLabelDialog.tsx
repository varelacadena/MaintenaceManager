import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, ImageIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface UploadLabelDialogProps {
  open: boolean;
  fileName: string;
  fileType: string;
  filePreviewUrl?: string;
  saving?: boolean;
  onSave: (label: string) => void;
  onCancel: () => void;
}

function LabelContent({
  fileName,
  fileType,
  filePreviewUrl,
  label,
  setLabel,
  saving,
  onSave,
  onCancel,
}: {
  fileName: string;
  fileType: string;
  filePreviewUrl?: string;
  label: string;
  setLabel: (v: string) => void;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isImage = fileType.startsWith("image/");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isImage && filePreviewUrl ? (
          <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
            <img
              src={filePreviewUrl}
              alt={fileName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
            {isImage ? (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            ) : (
              <FileText className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{fileType}</p>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Label this file</label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Damaged pipe in Room 204"
          autoFocus
          data-testid="input-upload-label"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving} data-testid="button-skip-label">
          Skip
        </Button>
        <Button onClick={onSave} disabled={saving} data-testid="button-save-label">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function UploadLabelDialog({
  open,
  fileName,
  fileType,
  filePreviewUrl,
  saving,
  onSave,
  onCancel,
}: UploadLabelDialogProps) {
  const [label, setLabel] = useState(fileName);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) setLabel(fileName);
  }, [open, fileName]);

  const handleSave = () => {
    onSave(label.trim() || fileName);
  };

  const handleCancel = () => {
    onCancel();
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Name your file</SheetTitle>
          </SheetHeader>
          <LabelContent
            fileName={fileName}
            fileType={fileType}
            filePreviewUrl={filePreviewUrl}
            label={label}
            setLabel={setLabel}
            saving={saving}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Name your file</DialogTitle>
        </DialogHeader>
        <LabelContent
          fileName={fileName}
          fileType={fileType}
          filePreviewUrl={filePreviewUrl}
          label={label}
          setLabel={setLabel}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
