
import { useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  onError,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const successful = [];
    const failed = [];

    for (let i = 0; i < Math.min(files.length, maxNumberOfFiles); i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > maxFileSize) {
        failed.push({
          file,
          error: `File size exceeds ${(maxFileSize / 1048576).toFixed(0)}MB limit`,
        });
        continue;
      }

      try {
        const { url } = await onGetUploadParameters();
        
        // Check if this is a mock URL (Object Storage not configured)
        const isMock = url.startsWith("https://mock-storage.local/");
        
        if (isMock) {
          // For mock uploads, just return the mock URL without actually uploading
          successful.push({
            file,
            url,
            isMock: true,
          });
          continue;
        }
        
        // Upload file
        const response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        successful.push({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          uploadURL: url.split("?")[0], // Remove query params
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        failed.push({
          file,
          error: errorMessage,
        });
        
        // Call onError for each failed upload
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Call onComplete with results
    if (onComplete) {
      onComplete({ successful, failed });
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="*/*"
      />
      <Button 
        type="button" 
        onClick={() => fileInputRef.current?.click()} 
        className={buttonClassName} 
        data-testid="button-upload"
      >
        {children}
      </Button>
    </div>
  );
}
