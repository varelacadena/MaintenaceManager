import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Play,
  Pause,
  X,
  CheckCircle2,
  BookOpen,
  History,
  ExternalLink,
  FileText,
  ScanLine,
  Info,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { UploadLabelDialog } from "@/components/UploadLabelDialog";
import ResourceCard from "@/components/ResourceCard";
import { toDisplayUrl } from "@/lib/imageUtils";
import { statusColors, EQUIPMENT_CATEGORY_ICONS, EQUIPMENT_CATEGORY_LABELS, RESOURCE_TYPE_ICONS, CONDITION_COLORS } from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function StudentBottomBar({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, activeTimer, taskIsHelper, isParentTask, subTasks, completedSubTasks,
    estimateBlocksCompletion, handleStartOrPause, handleComplete,
    startTimerMutation, stopTimerMutation, updateStatusMutation,
    setIsScanEquipmentOpen, isEquipmentLoading,
  } = ctx;

  if (!task) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 safe-area-inset-bottom">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        {taskIsHelper ? (
          activeTimer ? (
            <div className="flex-1 flex items-center gap-3">
              <Badge variant="outline" data-testid="badge-helper-status">Helper</Badge>
              <Button
                size="lg"
                variant="outline"
                onClick={handleStartOrPause}
                disabled={stopTimerMutation.isPending}
                data-testid="bottom-button-helper-pause"
              >
                <Pause className="w-5 h-5" />
              </Button>
              <span className="text-sm text-muted-foreground flex-1 text-center">Timer running</span>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <Badge variant="outline" data-testid="badge-helper-status">Helper</Badge>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleStartOrPause}
                disabled={startTimerMutation.isPending}
                data-testid="bottom-button-helper-start"
              >
                <Play className="w-5 h-5 mr-2" />
                Log Time
              </Button>
            </div>
          )
        ) : isParentTask ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-2" data-testid="bottom-parent-info">
            <Layers className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{completedSubTasks} of {subTasks.length} sub-tasks complete</span>
          </div>
        ) : task.status === "completed" ? (
          <Button
            size="lg"
            className="flex-1 font-bold bg-green-600 text-white border-green-600"
            disabled
            data-testid="bottom-button-done"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Task Completed
          </Button>
        ) : activeTimer ? (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={handleStartOrPause}
              disabled={stopTimerMutation.isPending}
              data-testid="bottom-button-pause"
            >
              <Pause className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              className="flex-1 font-bold bg-green-600 text-white border-green-600"
              onClick={handleComplete}
              disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
              title={estimateBlocksCompletion ? "Estimates must be approved first" : undefined}
              data-testid="bottom-button-complete"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {estimateBlocksCompletion ? "Estimate Required" : "Mark as Completed"}
            </Button>
          </>
        ) : task.status === "in_progress" ? (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={handleStartOrPause}
              disabled={startTimerMutation.isPending}
              data-testid="bottom-button-resume"
            >
              <Play className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              className="flex-1 font-bold bg-green-600 text-white border-green-600"
              onClick={handleComplete}
              disabled={updateStatusMutation.isPending || !!estimateBlocksCompletion}
              title={estimateBlocksCompletion ? "Estimates must be approved first" : undefined}
              data-testid="bottom-button-complete"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {estimateBlocksCompletion ? "Estimate Required" : "Mark as Completed"}
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            className="flex-1 font-bold"
            onClick={handleStartOrPause}
            disabled={startTimerMutation.isPending}
            data-testid="bottom-button-start"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Task
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-14 px-3 shrink-0"
          onClick={() => setIsScanEquipmentOpen(true)}
          disabled={isEquipmentLoading}
          data-testid="bottom-button-scan-equipment"
        >
          {isEquipmentLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ScanLine className="w-5 h-5" />
          )}
          <span className="text-xs">Scan</span>
        </Button>
      </div>
    </div>
  );
}

export function StudentDialogs({ ctx }: { ctx: TaskDetailContext }) {
  const { activeTimer, estimateBlocksCompletion, stopTimerMutation, toast,
    isStopTimerDialogOpen, setIsStopTimerDialogOpen,
    isResourcesSheetOpen, setIsResourcesSheetOpen, allTaskResources,
    isScanEquipmentOpen, setIsScanEquipmentOpen, handleEquipmentScan,
    isEquipmentInfoOpen, setIsEquipmentInfoOpen,
    scannedEquipment, scannedEquipmentTasks, scannedEquipmentResources,
    equipmentInfoTab, setEquipmentInfoTab, navigate,
    pendingUploadForLabel, isUploadLabelSaving,
    handleUploadLabelSave, handleUploadLabelCancel } = ctx;
  return (
    <>
      <Dialog open={isStopTimerDialogOpen} onOpenChange={setIsStopTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>What would you like to do?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button variant="outline" className="w-full justify-start"
              onClick={() => {
                if (estimateBlocksCompletion) { toast({ title: "Cannot complete task", description: "Estimates must be approved before completing this task.", variant: "destructive" }); return; }
                if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer, newStatus: "completed" }); }
              }}
              disabled={stopTimerMutation.isPending || !!estimateBlocksCompletion}
              data-testid="button-stop-complete">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
            <Button variant="ghost" className="w-full"
              onClick={() => { if (activeTimer) { stopTimerMutation.mutate({ timerId: activeTimer }); } }}
              disabled={stopTimerMutation.isPending} data-testid="button-stop-pause">
              Just Pause Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Sheet open={isResourcesSheetOpen} onOpenChange={setIsResourcesSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader><SheetTitle>Resources ({allTaskResources.length})</SheetTitle></SheetHeader>
          <div className="mt-4 overflow-y-auto max-h-[calc(70vh-80px)]">
            <div className="divide-y">
              {[...allTaskResources].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
                .map((resource: any) => (<ResourceCard key={resource.id} resource={resource} variant="list" />))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <BarcodeScanner open={isScanEquipmentOpen} onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan} title="Scan Equipment"
        description="Scan an equipment QR code to view info, work history, and manuals" />

      <Dialog open={isEquipmentInfoOpen} onOpenChange={setIsEquipmentInfoOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-hidden flex flex-col p-0">
          {scannedEquipment && (() => {
            const CatIcon = EQUIPMENT_CATEGORY_ICONS[scannedEquipment.category] || Info;
            const catLabel = EQUIPMENT_CATEGORY_LABELS[scannedEquipment.category] || scannedEquipment.category;
            const condColor = CONDITION_COLORS[(scannedEquipment.condition || "").toLowerCase()] || "bg-muted text-muted-foreground border-transparent";
            return (
              <>
                <div className="flex items-start gap-3 p-4 border-b">
                  <div className="p-2 rounded-md bg-primary/10">
                    <CatIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base leading-tight">{scannedEquipment.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                      {scannedEquipment.condition && (
                        <Badge className={`text-xs border ${condColor}`} variant="outline">{scannedEquipment.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setIsEquipmentInfoOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex border-b bg-muted/30">
                  {(["info", "history", "resources"] as const).map(tab => {
                    const counts: Record<string, number> = { info: 0, history: scannedEquipmentTasks.length, resources: scannedEquipmentResources.length };
                    const labels: Record<string, string> = { info: "Info", history: "Work History", resources: "Resources" };
                    return (
                      <button key={tab} onClick={() => setEquipmentInfoTab(tab)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${equipmentInfoTab === tab ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}>
                        {labels[tab]}
                        {counts[tab] > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{counts[tab]}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {equipmentInfoTab === "info" && (
                    <div className="space-y-4">
                      {(scannedEquipment as any).manufacturerImageUrl && (
                        <img src={toDisplayUrl((scannedEquipment as any).manufacturerImageUrl)} alt="Manufacturer" className="w-full max-h-48 object-contain rounded-md border" />
                      )}
                      {scannedEquipment.description && <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p><p className="text-sm">{scannedEquipment.description}</p></div>}
                      {scannedEquipment.serialNumber && <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Serial Number:</span><span className="font-mono font-medium">{scannedEquipment.serialNumber}</span></div>}
                      {scannedEquipment.notes && <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-muted-foreground">{scannedEquipment.notes}</p></div>}
                      {!scannedEquipment.description && !scannedEquipment.serialNumber && !scannedEquipment.notes && !(scannedEquipment as any).manufacturerImageUrl && (
                        <p className="text-sm text-muted-foreground text-center py-4">No additional details available</p>
                      )}
                    </div>
                  )}
                  {equipmentInfoTab === "history" && (
                    <div className="space-y-2">
                      {scannedEquipmentTasks.length === 0 ? (
                        <div className="text-center py-8"><History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No work history for this equipment</p></div>
                      ) : (
                        [...scannedEquipmentTasks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map(t => (
                          <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-md border hover-elevate cursor-pointer"
                            onClick={() => { setIsEquipmentInfoOpen(false); navigate(`/tasks/${t.id}`); }}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown date"}</p>
                            </div>
                            <Badge className={`text-xs shrink-0 ${statusColors[t.status] || ""}`} variant="outline">{statusLabels[t.status] || t.status}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {equipmentInfoTab === "resources" && (
                    <div className="space-y-2">
                      {scannedEquipmentResources.length === 0 ? (
                        <div className="text-center py-8"><BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No manuals or resources linked to this equipment</p></div>
                      ) : (
                        scannedEquipmentResources.map((r: any) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] || FileText;
                          return (
                            <button key={r.id} className="w-full flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 text-left" onClick={() => window.open(toDisplayUrl(r.url), "_blank")}>
                              <div className="p-1.5 rounded-md bg-primary/10 shrink-0"><RIcon className="w-4 h-4 text-primary" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{r.title}</p>
                                {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                                <p className="text-xs text-primary mt-0.5 capitalize">{r.type}</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <UploadLabelDialog
        open={!!pendingUploadForLabel}
        fileName={pendingUploadForLabel?.fileName || ""}
        fileType={pendingUploadForLabel?.fileType || ""}
        filePreviewUrl={pendingUploadForLabel?.previewUrl}
        saving={isUploadLabelSaving}
        onSave={handleUploadLabelSave}
        onCancel={handleUploadLabelCancel}
      />
    </>
  );
}
