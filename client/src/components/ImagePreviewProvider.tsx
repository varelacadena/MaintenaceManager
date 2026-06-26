import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Download, Trash2, X } from "lucide-react";
import { toDisplayUrl } from "@/lib/imageUtils";
import { useFileDownload } from "@/hooks/use-download";
import { SecureImage } from "@/components/SecureImage";

export interface ImagePreviewOptions {
  src: string;
  alt?: string;
  fileName?: string;
  uploadId?: string;
  objectUrl?: string;
  onDelete?: () => void | Promise<void>;
}

interface ImagePreviewContextValue {
  openImagePreview: (options: ImagePreviewOptions) => void;
  closeImagePreview: () => void;
}

const ImagePreviewContext = createContext<ImagePreviewContextValue | null>(null);

export function isImageFileType(fileType?: string | null): boolean {
  return !!fileType?.startsWith("image/");
}

export function buildUploadPreviewOptions(upload: {
  id: string;
  fileName: string;
  objectUrl: string;
}): ImagePreviewOptions {
  return {
    src: toDisplayUrl(upload.objectUrl),
    alt: upload.fileName,
    fileName: upload.fileName,
    uploadId: upload.id,
    objectUrl: upload.objectUrl,
  };
}

export function useImagePreview(): ImagePreviewContextValue {
  const ctx = useContext(ImagePreviewContext);
  if (!ctx) {
    throw new Error("useImagePreview must be used within ImagePreviewProvider");
  }
  return ctx;
}

function ImagePreviewOverlay({
  options,
  onClose,
}: {
  options: ImagePreviewOptions;
  onClose: () => void;
}) {
  const { downloadFile, isLoading: isDownloading } = useFileDownload();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    if (options.uploadId && options.objectUrl) {
      await downloadFile(options.uploadId, options.objectUrl);
      return;
    }
    const link = document.createElement("a");
    link.href = options.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (options.fileName) link.download = options.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!options.onDelete) return;
    setIsDeleting(true);
    try {
      await options.onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const title = options.fileName || options.alt || "Photo";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="modal-photo-preview"
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 gap-3">
          <p className="text-sm font-medium text-white truncate flex-1">{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            {(options.uploadId || options.src) && (
              <button
                type="button"
                className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50"
                style={{ width: 32, height: 32 }}
                onClick={handleDownload}
                disabled={isDownloading}
                aria-label="Download"
                data-testid="button-download-photo"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            )}
            {options.onDelete && (
              <button
                type="button"
                className="flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50"
                style={{ width: 32, height: 32 }}
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Delete"
                data-testid="button-delete-photo"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              type="button"
              className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
              style={{ width: 32, height: 32 }}
              onClick={onClose}
              aria-label="Close"
              data-testid="button-close-photo-preview"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        {options.uploadId && options.objectUrl ? (
          <SecureImage
            uploadId={options.uploadId}
            objectUrl={options.objectUrl}
            fileName={options.fileName || options.alt || "Photo"}
            className="w-full max-h-[80vh] object-contain rounded-lg"
            alt={options.alt || options.fileName || "Photo"}
          />
        ) : (
          <img
            src={options.src}
            alt={options.alt || title}
            className="w-full max-h-[80vh] object-contain rounded-lg"
            data-testid="img-photo-preview"
          />
        )}
      </div>
    </div>
  );
}

export function ImagePreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<ImagePreviewOptions | null>(null);

  const openImagePreview = useCallback((options: ImagePreviewOptions) => {
    setPreview(options);
  }, []);

  const closeImagePreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <ImagePreviewContext.Provider value={{ openImagePreview, closeImagePreview }}>
      {children}
      {preview && (
        <ImagePreviewOverlay options={preview} onClose={closeImagePreview} />
      )}
    </ImagePreviewContext.Provider>
  );
}

export function openResourceUrl(
  openImagePreview: (options: ImagePreviewOptions) => void,
  url: string,
  meta?: { title?: string; type?: string; fileType?: string },
) {
  const isImage = meta?.type === "image" || isImageFileType(meta?.fileType);
  if (isImage) {
    openImagePreview({
      src: toDisplayUrl(url),
      alt: meta?.title,
      fileName: meta?.title,
    });
    return;
  }
  window.open(toDisplayUrl(url), "_blank", "noopener,noreferrer");
}
