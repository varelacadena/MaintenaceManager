import {
  X,
  FileText,
  History,
  Info,
  Wind,
  Zap,
  Droplets,
  Wrench,
  BookOpen,
  Sparkles,
  Building2,
  ExternalLink,
  Car,
  ImageIcon,
  LinkIcon,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";
import { statusColors } from "./types";
import type { Task, Equipment, Vehicle } from "@shared/schema";

const EQUIPMENT_CATEGORY_ICONS: Record<string, any> = {
  hvac: Wind, electrical: Zap, plumbing: Droplets, mechanical: Wrench,
  appliances: Wrench, grounds: BookOpen, janitorial: Sparkles,
  structural: Building2, water_treatment: Droplets, general: Info,
};

const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC", electrical: "Electrical", plumbing: "Plumbing",
  mechanical: "Mechanical", appliances: "Appliances", grounds: "Grounds",
  janitorial: "Janitorial", structural: "Structural", water_treatment: "Water Treatment", general: "General",
};

const RESOURCE_TYPE_ICONS: Record<string, any> = {
  video: Video, document: FileText, image: ImageIcon, link: LinkIcon,
};

const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  fair: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  poor: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "needs replacement": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export interface TechnicianDialogsMoreProps {
  isEquipmentInfoOpen: boolean;
  setIsEquipmentInfoOpen: (v: boolean) => void;
  scannedEquipment: Equipment | null;
  scannedEquipmentTasks: Task[];
  scannedEquipmentResources: any[];
  equipmentInfoTab: "info" | "history" | "resources";
  setEquipmentInfoTab: (v: "info" | "history" | "resources") => void;
  isVehicleInfoOpen: boolean;
  setIsVehicleInfoOpen: (v: boolean) => void;
  scannedVehicle: Vehicle | null;
  safeNavigate: (path: string) => void;
}

export function TechnicianDialogsMore({
  isEquipmentInfoOpen,
  setIsEquipmentInfoOpen,
  scannedEquipment,
  scannedEquipmentTasks,
  scannedEquipmentResources,
  equipmentInfoTab,
  setEquipmentInfoTab,
  isVehicleInfoOpen,
  setIsVehicleInfoOpen,
  scannedVehicle,
  safeNavigate,
}: TechnicianDialogsMoreProps) {
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
                              onClick={() => { setIsEquipmentInfoOpen(false); safeNavigate(`/tasks/${t.id}`); }}
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

      <Dialog open={isVehicleInfoOpen} onOpenChange={setIsVehicleInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Info</DialogTitle>
            <DialogDescription>Scanned vehicle details</DialogDescription>
          </DialogHeader>
          {scannedVehicle && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-scanned-vehicle-name">{scannedVehicle.make} {scannedVehicle.model} {scannedVehicle.year}</p>
                  <p className="text-sm text-muted-foreground">{scannedVehicle.vehicleId}</p>
                </div>
              </div>
              {scannedVehicle.vin && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                  <p className="text-sm font-mono">{scannedVehicle.vin}</p>
                </div>
              )}
              {scannedVehicle.licensePlate && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">License Plate</p>
                  <p className="text-sm">{scannedVehicle.licensePlate}</p>
                </div>
              )}
              {scannedVehicle.currentMileage && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mileage</p>
                  <p className="text-sm">{scannedVehicle.currentMileage.toLocaleString()} mi</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
