import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSignedUploadParameters, mapUploaderResultForRegistration } from "@/lib/uploadUtils";
import type { Upload } from "@shared/schema";

const KINDS = [
  { id: "photo", label: "Photo", accept: "image/*" },
  { id: "video", label: "Video", accept: "video/*" },
  { id: "document", label: "Document", accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt" },
] as const;

export function TaskAttachmentEditor({ taskId, variant = "panel" }: { taskId: string; variant?: "panel" | "page" }) {
  const { toast } = useToast();
  const { data: uploads = [] } = useQuery<Upload[]>({
    queryKey: ["/api/uploads/task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/uploads/task/${taskId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function register(result: { successful?: Array<Record<string, unknown>> }) {
    if (!result.successful?.length) return;
    try {
      for (const file of result.successful) {
        const registered = mapUploaderResultForRegistration(file);
        await apiRequest("PUT", "/api/uploads", {
          taskId,
          fileName: registered.fileName,
          fileType: registered.fileType,
          objectUrl: registered.objectUrl,
          objectPath: registered.objectPath,
          label: registered.fileName,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/uploads/task", taskId] });
      toast({ title: "Attachment added" });
    } catch (error) {
      toast({
        title: "Could not save attachment",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-2" data-testid="task-attachment-editor">
      <p className={variant === "page" ? "text-sm font-medium" : "text-xs font-medium"} style={variant === "panel" ? { color: "#6B7280" } : undefined}>
        Attachments
      </p>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <ObjectUploader
            key={kind.id}
            accept={kind.accept}
            maxNumberOfFiles={5}
            onGetUploadParameters={getSignedUploadParameters}
            onComplete={register}
            buttonVariant="outline"
            buttonClassName="h-8"
            buttonTestId={`button-edit-attach-${kind.id}`}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            {kind.label}
          </ObjectUploader>
        ))}
      </div>
      {uploads.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments yet</p>
      ) : (
        <ul className="space-y-1">
          {uploads.map((upload) => (
            <li key={upload.id} className="truncate text-sm" data-testid={`edit-attachment-${upload.id}`}>
              {upload.label || upload.fileName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
