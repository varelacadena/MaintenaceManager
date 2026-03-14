import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Upload } from "@shared/schema";

interface SubtaskPhotosProps {
  subtaskId: string;
  disabled: boolean;
  testIdPrefix?: string;
}

export function SubtaskPhotos({ subtaskId, disabled, testIdPrefix = "subtask" }: SubtaskPhotosProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: uploads } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", subtaskId],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${subtaskId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!subtaskId,
  });

  const photos = uploads?.filter(u => u.fileType.startsWith("image/")) || [];

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const paramRes = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
      if (!paramRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL } = await paramRes.json();

      const isMock = uploadURL.startsWith("https://mock-storage.local/");
      let objectUrl = uploadURL;

      if (!isMock) {
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        objectUrl = uploadURL.split("?")[0];
      }

      await apiRequest("PUT", "/api/uploads", {
        taskId: subtaskId,
        fileName: file.name,
        fileType: file.type || "image/jpeg",
        objectUrl,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", subtaskId] });
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {photos.map(photo => (
        <a
          key={photo.id}
          href={photo.objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testIdPrefix}-photo-${photo.id}`}
        >
          <img
            src={photo.objectUrl}
            alt={photo.fileName}
            className="rounded object-cover"
            style={{ width: "54px", height: "54px", border: "1px solid #EEEEEE" }}
          />
        </a>
      ))}
      {!disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div
            className="flex items-center justify-center rounded cursor-pointer"
            style={{
              width: "54px",
              height: "54px",
              border: "2px dashed #D1D5DB",
            }}
            onClick={() => fileInputRef.current?.click()}
            data-testid={`${testIdPrefix}-add-photo-${subtaskId}`}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
            ) : (
              <Camera className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            )}
          </div>
        </>
      )}
    </>
  );
}
