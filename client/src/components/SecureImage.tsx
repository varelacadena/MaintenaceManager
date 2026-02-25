import { useState, useEffect } from "react";
import { useFileDownload } from "@/hooks/use-download";
import { ImageIcon, AlertCircle, Loader2 } from "lucide-react";

interface SecureImageProps {
  uploadId: string;
  objectUrl: string;
  fileName: string;
  className?: string;
  alt?: string;
}

export function SecureImage({ uploadId, objectUrl, fileName, className, alt }: SecureImageProps) {
  const { getSignedUrl } = useFileDownload();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const isMock = objectUrl.includes("mock-storage.local");

  useEffect(() => {
    if (isMock) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    getSignedUrl(uploadId, objectUrl).then((url) => {
      if (cancelled) return;
      if (url) {
        setSignedUrl(url);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });

    return () => { cancelled = true; };
  }, [uploadId, objectUrl]);

  if (status === "loading") {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (status === "error" || !signedUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-destructive/10 ${className ?? ""}`}>
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="text-[10px] text-destructive mt-1">Unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt ?? fileName}
      className={className}
      onError={() => setStatus("error")}
    />
  );
}
