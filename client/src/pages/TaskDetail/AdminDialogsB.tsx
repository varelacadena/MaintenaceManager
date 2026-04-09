import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  Package,
  Car,
  BookOpen,
  History,
  ExternalLink,
  FileText,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { toDisplayUrl } from "@/lib/imageUtils";
import {
  statusColors,
  EQUIPMENT_CATEGORY_ICONS,
  EQUIPMENT_CATEGORY_LABELS,
  RESOURCE_TYPE_ICONS,
  CONDITION_COLORS,
} from "./constants";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import type { TaskDetailContext } from "./useTaskDetail";

export function AdminDialogsB({ ctx }: { ctx: TaskDetailContext }) {
  const {
    task, navigate,
    allEquipment, allVehicles,
    isEquipmentInfoOpen, setIsEquipmentInfoOpen,
    scannedEquipment, scannedEquipmentTasks, scannedEquipmentResources,
    equipmentInfoTab, setEquipmentInfoTab,
    isAddSubTaskDialogOpen, setIsAddSubTaskDialogOpen,
    subTaskSearchQuery, setSubTaskSearchQuery,
    subTaskSearchType, setSubTaskSearchType,
    addSubTaskMutation,
  } = ctx;

  if (!task) return null;

  return (
    <>
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
                    <h2 className="font-semibold text-base leading-tight" data-testid="text-scanned-equipment-name">{scannedEquipment.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{catLabel}</Badge>
                      {scannedEquipment.condition && (
                        <Badge className={`text-xs border ${condColor}`} variant="outline">{scannedEquipment.condition}</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setIsEquipmentInfoOpen(false)} data-testid="button-close-equipment-info">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex border-b bg-muted/30">
                  {(["info", "history", "resources"] as const).map(tab => {
                    const counts: Record<string, number> = {
                      info: 0,
                      history: scannedEquipmentTasks.length,
                      resources: scannedEquipmentResources.length,
                    };
                    const labels: Record<string, string> = { info: "Info", history: "Work History", resources: "Resources" };
                    return (
                      <button
                        key={tab}
                        onClick={() => setEquipmentInfoTab(tab)}
                        className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${equipmentInfoTab === tab ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
                        data-testid={`tab-equipment-${tab}`}
                      >
                        {labels[tab]}
                        {counts[tab] > 0 && (
                          <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {equipmentInfoTab === "info" && (
                    <div className="space-y-4">
                      {(scannedEquipment as any).manufacturerImageUrl && (
                        <img
                          src={toDisplayUrl((scannedEquipment as any).manufacturerImageUrl)}
                          alt="Manufacturer"
                          className="w-full max-h-48 object-contain rounded-md border"
                          data-testid="img-manufacturer"
                        />
                      )}
                      {scannedEquipment.description && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                          <p className="text-sm">{scannedEquipment.description}</p>
                        </div>
                      )}
                      {scannedEquipment.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Serial Number:</span>
                          <span className="font-mono font-medium">{scannedEquipment.serialNumber}</span>
                        </div>
                      )}
                      {scannedEquipment.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{scannedEquipment.notes}</p>
                        </div>
                      )}
                      {!scannedEquipment.description && !scannedEquipment.serialNumber && !scannedEquipment.notes && !(scannedEquipment as any).manufacturerImageUrl && (
                        <p className="text-sm text-muted-foreground text-center py-4">No additional details available</p>
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "history" && (
                    <div className="space-y-2">
                      {scannedEquipmentTasks.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No work history for this equipment</p>
                        </div>
                      ) : (
                        [...scannedEquipmentTasks]
                          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                          .map(t => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-md border hover-elevate cursor-pointer"
                              onClick={() => { setIsEquipmentInfoOpen(false); navigate(`/tasks/${t.id}`); }}
                              data-testid={`history-task-${t.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{t.name}</p>
                                <p className="text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "Unknown date"}</p>
                              </div>
                              <Badge className={`text-xs shrink-0 ${statusColors[t.status] || ""}`} variant="outline">
                                {statusLabels[t.status] || t.status}
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {equipmentInfoTab === "resources" && (
                    <div className="space-y-2">
                      {scannedEquipmentResources.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No manuals or resources linked to this equipment</p>
                          <p className="text-xs text-muted-foreground mt-1">Admins can link resources in the Resource Library</p>
                        </div>
                      ) : (
                        scannedEquipmentResources.map((r: any) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] || FileText;
                          return (
                            <button
                              key={r.id}
                              className="w-full flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 text-left"
                              onClick={() => window.open(toDisplayUrl(r.url), "_blank")}
                              data-testid={`resource-item-${r.id}`}
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                                <RIcon className="w-4 h-4 text-primary" />
                              </div>
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

      <Dialog open={isAddSubTaskDialogOpen} onOpenChange={setIsAddSubTaskDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Sub-Task</DialogTitle>
            <DialogDescription>Search for equipment or vehicles to create a sub-task.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={subTaskSearchType === "equipment" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("equipment")}
              data-testid="button-search-equipment"
            >
              <Package className="w-4 h-4 mr-1" />
              Equipment
            </Button>
            <Button
              variant={subTaskSearchType === "vehicle" ? "default" : "outline"}
              size="sm"
              onClick={() => setSubTaskSearchType("vehicle")}
              data-testid="button-search-vehicles"
            >
              <Car className="w-4 h-4 mr-1" />
              Vehicles
            </Button>
          </div>
          <Input
            placeholder={subTaskSearchType === "equipment" ? "Search equipment..." : "Search vehicles..."}
            value={subTaskSearchQuery}
            onChange={(e) => setSubTaskSearchQuery(e.target.value)}
            data-testid="input-subtask-search"
          />
          <div className="flex-1 overflow-y-auto space-y-2 mt-2 max-h-[40vh]">
            {subTaskSearchType === "equipment" ? (
              (allEquipment || [])
                .filter((eq: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return eq.name?.toLowerCase().includes(q) || eq.category?.toLowerCase().includes(q);
                })
                .map((eq: any) => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        equipmentId: eq.id,
                        name: `${task.name} - ${eq.name}`,
                      });
                    }}
                    data-testid={`subtask-equipment-${eq.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{eq.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{eq.category}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            ) : (
              (allVehicles || [])
                .filter((v: any) => {
                  if (!subTaskSearchQuery.trim()) return true;
                  const q = subTaskSearchQuery.toLowerCase();
                  return v.vehicleId?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q);
                })
                .map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover-elevate"
                    onClick={() => {
                      addSubTaskMutation.mutate({
                        vehicleId: v.id,
                        name: `${task.name} - ${v.make} ${v.model} ${v.year}`,
                      });
                    }}
                    data-testid={`subtask-vehicle-${v.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.make} {v.model} {v.year}</p>
                        <p className="text-xs text-muted-foreground">{v.vehicleId}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}