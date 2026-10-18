import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { preparePhotoForUpload } from "@/lib/preparePhotoForUpload";
import { inferUploadFileType } from "@/lib/uploadUtils";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  accept?: string;
  /** Opens the device camera when the browser supports it. */
  capture?: "environment" | "user";
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    /** Bucket-relative path from POST /api/objects/upload (preferred over parsing the PUT URL). */
    objectPath?: string;
  }>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  /** Classes for the wrapper around the file input and button. */
  wrapperClassName?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  buttonTestId?: string;
  buttonAriaLabel?: string;
  isLoading?: boolean;
  /** Fired when an upload or follow-up save starts and finishes. */
  onBusyChange?: (busy: boolean) => void;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  accept = "*/*",
  capture,
  onGetUploadParameters,
  onComplete,
  onError,
  buttonClassName,
  wrapperClassName,
  buttonVariant,
  buttonTestId,
  buttonAriaLabel,
  isLoading = false,
  onBusyChange,
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    current: 0,
    total: 0,
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const successful = [];
    const failed = [];
    const selectedFiles = Array.from(files).slice(0, maxNumberOfFiles);

    setUploadState({
      isUploading: true,
      current: 0,
      total: selectedFiles.length,
    });

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = await preparePhotoForUpload(selectedFiles[i]);

      setUploadState({
        isUploading: true,
        current: i + 1,
        total: selectedFiles.length,
      });

      if (file.size > maxFileSize) {
        failed.push({
          file,
          error: `File size exceeds ${(maxFileSize / 1048576).toFixed(0)}MB limit`,
        });
        continue;
      }

      try {
        const params = await onGetUploadParameters();
        const url = params.url;

        const fileType = inferUploadFileType(file);
        const isMock = url.startsWith("https://mock-storage.local/");

        if (isMock) {
          const mockKey = url.split('/').slice(3).join('/');
          successful.push({
            file,
            name: file.name,
            fileName: file.name,
            type: fileType,
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
            "Content-Type": fileType,
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const objectPath = params.objectPath?.startsWith("uploads/") ? params.objectPath : undefined;
        successful.push({
          file,
          name: file.name,
          fileName: file.name,
          type: fileType,
          size: file.size || 0,
          uploadURL: url.split("?")[0],
          objectUrl: url.split("?")[0],
          url: url.split("?")[0],
          objectPath,
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

    setUploadState({
      isUploading: false,
      current: 0,
      total: 0,
    });
  };

  const isBusy = isLoading || uploadState.isUploading;
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;
  useEffect(() => {
    onBusyChangeRef.current?.(isBusy);
    return () => {
      if (isBusy) onBusyChangeRef.current?.(false);
    };
  }, [isBusy]);

  const uploadLabel =
    uploadState.total > 1
      ? `Uploading ${uploadState.current} of ${uploadState.total}...`
      : "Uploading...";
  const statusLabel = uploadState.isUploading ? uploadLabel : "Saving...";

  const statusBanner = isBusy && typeof document !== "undefined"
    ? createPortal(
        <div
          role="status"
          aria-live="polite"
          data-testid="upload-status-banner"
          className="pointer-events-none fixed z-[200] flex justify-center"
          style={{
            left: "max(0.75rem, env(safe-area-inset-left, 0px))",
            right: "max(0.75rem, env(safe-area-inset-right, 0px))",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)",
          }}
        >
          <div className="flex w-full max-w-md items-center gap-2 overflow-visible rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-lg">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="min-w-0 leading-snug break-words">{statusLabel}</span>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cn("flex w-full sm:w-auto", wrapperClassName)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileChange}
        accept={accept}
        capture={capture}
        className="sr-only"
      />
      <Button
        type="button"
        variant={buttonVariant ?? "default"}
        onClick={() => !isBusy && fileInputRef.current?.click()}
        className={cn("h-full w-full sm:w-auto min-h-10", buttonClassName)}
        data-testid={buttonTestId ?? "button-upload"}
        aria-label={isBusy ? statusLabel : buttonAriaLabel}
        disabled={isBusy}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          children
        )}
      </Button>
      {statusBanner}
    </div>
  );
}
