import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Package,
  ExternalLink,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Check,
} from "lucide-react";
import type { TaskDetailContext } from "./useTaskDetail";
import { canSeeInventoryCost } from "@/lib/inventoryAccess";

export function AdminCollapsibleSectionsExtra({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, user, downloadFile,
    parts, uploads, requestAttachments,
    attachmentsExpanded, setAttachmentsExpanded,
    partsExpanded, setPartsExpanded,
    isAddPartDialogOpen, setIsAddPartDialogOpen,
    partsSectionRef,
    deleteUploadMutation,
    isTechnicianOrAdmin,
  } = ctx;

  if (!task) return null;

  const showPartCost = canSeeInventoryCost(user?.role);

  return (
    <>
      <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-attachments">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-primary" />
              <span className="font-medium">Attachments</span>
              {(uploads.length + requestAttachments.length) > 0 && (
                <Badge variant="secondary">{uploads.length + requestAttachments.length}</Badge>
              )}
            </div>
            {attachmentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {requestAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">From Request</p>
              {requestAttachments.map((att) => {
                const isMockFile = att.objectUrl.includes("mock-storage.local");
                return (
                  <button
                    key={att.id}
                    onClick={() => downloadFile(att.id, att.objectUrl)}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate w-full text-left"
                  >
                    {isMockFile ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm flex-1 truncate">{att.fileName}</span>
                    {isMockFile ? (
                      <span className="text-xs text-destructive">Unavailable</span>
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {uploads.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Task Attachments</p>
              {uploads.map((upload) => {
                const isMockFile = upload.objectUrl.includes("mock-storage.local");
                return (
                  <div key={upload.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <button
                      onClick={() => downloadFile(upload.id, upload.objectUrl)}
                      className="flex items-center gap-3 flex-1 min-w-0 hover-elevate text-left"
                    >
                      {isMockFile ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm truncate">{upload.fileName}</span>
                      {isMockFile && (
                        <span className="text-xs text-destructive">Unavailable</span>
                      )}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUploadMutation.mutate(upload.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
          {uploads.length === 0 && requestAttachments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No attachments</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {isTechnicianOrAdmin && (
        <Collapsible open={partsExpanded} onOpenChange={setPartsExpanded}>
          <CollapsibleTrigger asChild>
            <div ref={partsSectionRef} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover-elevate" data-testid="toggle-parts">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <span className="font-medium">Parts Used</span>
                {parts.length > 0 && <Badge variant="secondary">{parts.length}</Badge>}
              </div>
              {partsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {parts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No parts used</p>
            ) : (
              parts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{part.partName}</p>
                    {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Qty: {part.quantity}</p>
                    {showPartCost && Number(part.cost) > 0 && (
                      <p className="text-xs text-muted-foreground">${Number(part.cost).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddPartDialogOpen(true)}
              data-testid="button-add-part"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
