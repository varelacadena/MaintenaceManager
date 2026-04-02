import { useState } from "react";
import { Paperclip, ExternalLink, AlertCircle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

interface FileAttachmentProps {
  attachment: {
    id: string;
    fileName: string;
    fileType: string;
    objectUrl: string;
    objectPath?: string | null;
    label?: string | null;
  };
}

export function FileAttachment({ attachment }: FileAttachmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isMockFile = attachment.objectUrl.includes("mock-storage.local");

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
        const isViewable = attachment.fileType.startsWith('image/') || attachment.fileType === 'application/pdf';
        
        if (isMobile) {
          // On mobile, use window.location for more reliable file opening
          // This bypasses popup blockers that block window.open after async operations
          window.location.href = data.downloadUrl;
          toast({
            title: isViewable ? "Opening file" : "Downloading file",
            description: isViewable ? "File should open shortly..." : "Download should start shortly...",
          });
        } else {
          // Desktop: use standard new tab approach
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          
          if (!isViewable) {
            link.download = data.fileName || attachment.fileName;
          }
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: "Opening file",
            description: isViewable ? "Opening in new tab..." : "Starting download...",
          });
        }
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
      className={`flex items-center justify-between rounded-md border hover-elevate active-elevate-2 w-full text-left disabled:opacity-50 ${
        isMobile ? 'p-3 min-h-[52px]' : 'p-2'
      }`}
      data-testid={`attachment-${attachment.id}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`flex items-center justify-center rounded shrink-0 ${
          isMobile ? 'w-10 h-10' : 'w-8 h-8'
        } ${
          isMockFile || error 
            ? "bg-destructive/10 text-destructive" 
            : "bg-primary/10 text-primary"
        }`}>
          {isLoading ? (
            <Loader2 className={`animate-spin ${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
          ) : isMockFile || error ? (
            <AlertCircle className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          ) : (
            <Paperclip className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-medium truncate ${isMobile ? 'text-sm' : 'text-xs'}`}>
            {attachment.label || attachment.fileName}
          </p>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {isMockFile ? "File unavailable" : attachment.fileType}
          </p>
        </div>
        {!isLoading && !isMockFile && !error && (
          <div className={`shrink-0 ${isMobile ? 'p-2' : ''}`}>
            {isMobile ? (
              <Download className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
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
    label?: string | null;
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
