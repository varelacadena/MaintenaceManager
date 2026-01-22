import { useState } from "react";
import { Paperclip, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileAttachmentProps {
  attachment: {
    id: string;
    fileName: string;
    fileType: string;
    objectUrl: string;
    objectPath?: string | null;
  };
}

export function FileAttachment({ attachment }: FileAttachmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isMockFile = attachment.objectUrl.includes("mock-storage.local");

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isMockFile) {
      toast({
        title: "File unavailable",
        description: "This file was uploaded before storage was properly configured and cannot be downloaded.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("GET", `/api/uploads/${attachment.id}/download`);
      const data = await response.json();

      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else if (data.isMock) {
        toast({
          title: "File unavailable",
          description: data.message || "This file cannot be downloaded.",
          variant: "destructive",
        });
      } else {
        throw new Error(data.message || "Failed to get download URL");
      }
    } catch (err) {
      console.error("Download error:", err);
      const message = err instanceof Error ? err.message : "Failed to download file";
      setError(message);
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center justify-between p-2 rounded-md border hover-elevate active-elevate-2 w-full text-left disabled:opacity-50"
      data-testid={`attachment-${attachment.id}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`flex items-center justify-center w-8 h-8 rounded shrink-0 ${
          isMockFile || error 
            ? "bg-destructive/10 text-destructive" 
            : "bg-primary/10 text-primary"
        }`}>
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isMockFile || error ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">
            {attachment.fileName}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isMockFile ? "File unavailable" : attachment.fileType}
          </p>
        </div>
        {!isLoading && !isMockFile && !error && (
          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </div>
    </button>
  );
}

interface FileAttachmentListProps {
  attachments: Array<{
    id: string;
    fileName: string;
    fileType: string;
    objectUrl: string;
    objectPath?: string | null;
  }>;
}

export function FileAttachmentList({ attachments }: FileAttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium">Attachments ({attachments.length})</p>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <FileAttachment key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}
