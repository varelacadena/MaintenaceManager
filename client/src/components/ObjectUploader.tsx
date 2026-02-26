import { useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  accept?: string;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  buttonTestId?: string;
  isLoading?: boolean;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  accept = "*/*",
  onGetUploadParameters,
  onComplete,
  onError,
  buttonClassName,
  buttonVariant,
  buttonTestId,
  isLoading = false,
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

      if (file.size > maxFileSize) {
        failed.push({
          file,
          error: `File size exceeds ${(maxFileSize / 1048576).toFixed(0)}MB limit`,
        });
        continue;
      }

      try {
        const { url } = await onGetUploadParameters();

        const isMock = url.startsWith("https://mock-storage.local/");

        if (isMock) {
          const mockKey = url.split('/').slice(3).join('/');
          successful.push({
            file,
            name: file.name,
            fileName: file.name,
            type: file.type || "application/octet-stream",
            size: file.size || 0,
            url,
            objectUrl: url,
            uploadURL: url,
            isMock: true,
            objectPath: mockKey,
          });
          continue;
        }

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
          file,
          name: file.name,
          fileName: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          uploadURL: url.split("?")[0],
          objectUrl: url.split("?")[0],
          url: url.split("?")[0],
          objectPath: url.includes('?') ? new URL(url).pathname.split('/').slice(2).join('/') : url.split('/').slice(3).join('/'),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        failed.push({ file, error: errorMessage });
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

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
        accept={accept}
      />
      <Button
        type="button"
        variant={buttonVariant ?? "default"}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={buttonClassName}
        data-testid={buttonTestId ?? "button-upload"}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
      </Button>
    </div>
  );
}
