import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface DownloadResult {
  downloadUrl: string;
  fileName: string;
}

export function useFileDownload() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const downloadFile = useCallback(async (uploadId: string, objectUrl: string): Promise<boolean> => {
    const isMockFile = objectUrl.includes("mock-storage.local");
    
    if (isMockFile) {
      toast({
        title: "File unavailable",
        description: "This file was uploaded before storage was properly configured and cannot be downloaded.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("GET", `/api/uploads/${uploadId}/download`);
      const data: DownloadResult & { isMock?: boolean; message?: string } = await response.json();

      if (data.downloadUrl) {
        if (isMobile) {
          // On mobile, use window.location for more reliable file opening
          // This bypasses popup blockers that block window.open after async operations
          window.location.href = data.downloadUrl;
          toast({
            title: "Opening file",
            description: "File should open shortly...",
          });
        } else {
          // Desktop: use standard new tab approach
          window.open(data.downloadUrl, "_blank");
        }
        return true;
      } else if (data.isMock) {
        toast({
          title: "File unavailable",
          description: data.message || "This file cannot be downloaded.",
          variant: "destructive",
        });
        return false;
      } else {
        throw new Error(data.message || "Failed to get download URL");
      }
    } catch (err) {
      console.error("Download error:", err);
      const message = err instanceof Error ? err.message : "Failed to download file";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, isMobile]);

  const getSignedUrl = useCallback(async (uploadId: string, objectUrl: string): Promise<string | null> => {
    const isMockFile = objectUrl.includes("mock-storage.local");
    
    if (isMockFile) {
      return null;
    }

    try {
      const response = await apiRequest("GET", `/api/uploads/${uploadId}/download`);
      const data: DownloadResult & { isMock?: boolean; message?: string } = await response.json();

      if (data.downloadUrl) {
        return data.downloadUrl;
      }
      return null;
    } catch (err) {
      console.error("Error getting signed URL:", err);
      return null;
    }
  }, []);

  return { downloadFile, getSignedUrl, isLoading };
}
