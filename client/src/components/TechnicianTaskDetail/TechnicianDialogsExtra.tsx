import {
  Check,
  X,
  DollarSign,
  FileText,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { taskStatusLabels as statusLabels } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toDisplayUrl } from "@/lib/imageUtils";
import { format } from "date-fns";
import { statusColors } from "./types";
import type { Task, Upload, User as UserType, Quote, Vendor, Equipment, Vehicle } from "@shared/schema";

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

export interface TechnicianDialogsExtraProps {
  isAddQuoteDialogOpen: boolean;
  setIsAddQuoteDialogOpen: (v: boolean) => void;
  newQuoteEstimatedCost: string;
  setNewQuoteEstimatedCost: (v: string) => void;
  newQuoteVendorId: string;
  setNewQuoteVendorId: (v: string) => void;
  newQuoteVendorName: string;
  setNewQuoteVendorName: (v: string) => void;
  newQuoteNotes: string;
  setNewQuoteNotes: (v: string) => void;
  vendors: Vendor[];
  createQuoteMutation: any;
  pendingQuoteFiles: any[];
  isPreviousWorkOpen: boolean;
  setIsPreviousWorkOpen: (v: boolean) => void;
  previousWork: Task[];
  users: UserType[];
  safeNavigate: (path: string) => void;
  previewUpload: Upload | null;
  setPreviewUpload: (v: Upload | null) => void;
  deleteUploadMutation: any;
  isScanEquipmentOpen: boolean;
  setIsScanEquipmentOpen: (v: boolean) => void;
  handleEquipmentScan: (value: string) => void;
  isScanPartOpen: boolean;
  setIsScanPartOpen: (v: boolean) => void;
  handleScanPart: (value: string) => void;
  setIsPartModalOpen: (v: boolean) => void;
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
}

export function TechnicianDialogsExtra({
  isAddQuoteDialogOpen,
  setIsAddQuoteDialogOpen,
  newQuoteEstimatedCost,
  setNewQuoteEstimatedCost,
  newQuoteVendorId,
  setNewQuoteVendorId,
  newQuoteVendorName,
  setNewQuoteVendorName,
  newQuoteNotes,
  setNewQuoteNotes,
  vendors,
  createQuoteMutation,
  pendingQuoteFiles,
  isPreviousWorkOpen,
  setIsPreviousWorkOpen,
  previousWork,
  users,
  safeNavigate,
  previewUpload,
  setPreviewUpload,
  deleteUploadMutation,
  isScanEquipmentOpen,
  setIsScanEquipmentOpen,
  handleEquipmentScan,
  isScanPartOpen,
  setIsScanPartOpen,
  handleScanPart,
  setIsPartModalOpen,
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
}: TechnicianDialogsExtraProps) {
  return (
    <>
      {isAddQuoteDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsAddQuoteDialogOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-add-estimate"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Add Estimate
              </p>
              <button onClick={() => setIsAddQuoteDialogOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Estimated Cost
                </Label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newQuoteEstimatedCost}
                    onChange={(e) => setNewQuoteEstimatedCost(e.target.value)}
                    className="pl-8"
                    data-testid="input-quote-cost"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Vendor (Optional)
                </Label>
                <Select
                  value={newQuoteVendorId}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNewQuoteVendorId("");
                      setNewQuoteVendorName("");
                    } else {
                      setNewQuoteVendorId(value);
                      const v = vendors.find((v) => v.id === value);
                      setNewQuoteVendorName(v?.name || "");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-quote-vendor">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Details..."
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  data-testid="input-quote-notes"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-lg text-white text-sm font-medium bg-primary"
                  onClick={() =>
                    createQuoteMutation.mutate({
                      vendorName: newQuoteVendorName,
                      estimatedCost: parseFloat(newQuoteEstimatedCost) || 0,
                      notes: newQuoteNotes,
                      files: pendingQuoteFiles,
                    })
                  }
                  disabled={!newQuoteEstimatedCost || createQuoteMutation.isPending}
                  data-testid="button-submit-quote"
                >
                  Add Estimate
                </button>
                <button
                  className="px-6 py-3 rounded-lg text-sm bg-muted border border-border text-muted-foreground"
                  onClick={() => setIsAddQuoteDialogOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPreviousWorkOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setIsPreviousWorkOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[80vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-7"
            onClick={(e) => e.stopPropagation()}
            data-testid="sheet-previous-work"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Previous Work
              </p>
              <button onClick={() => setIsPreviousWorkOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {previousWork.map((prevTask) => {
                const completedBy = users.find(u => u.id === prevTask.assignedToId);
                return (
                  <button
                    key={prevTask.id}
                    className="w-full text-left p-3 rounded-lg bg-muted/50 border border-border"
                    onClick={() => {
                      setIsPreviousWorkOpen(false);
                      safeNavigate(`/tasks/${prevTask.id}`);
                    }}
                    data-testid={`previous-work-item-${prevTask.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {prevTask.name}
                        </p>
                        {prevTask.description && (
                          <p className="text-xs mt-0.5 line-clamp-2 text-muted-foreground">
                            {prevTask.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {completedBy && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              {completedBy.firstName} {completedBy.lastName}
                            </span>
                          )}
                          {prevTask.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(prevTask.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {previewUpload && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={() => setPreviewUpload(null)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-photo-preview"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white truncate flex-1 mr-4">
                {previewUpload.fileName}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600"
                  style={{ width: 32, height: 32 }}
                  onClick={async () => {
                    try {
                      await deleteUploadMutation.mutateAsync(previewUpload.id);
                      setPreviewUpload(null);
                    } catch {}
                  }}
                  data-testid="button-delete-photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPreviewUpload(null)}
                  data-testid="button-close-photo-preview"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {previewUpload.fileType?.startsWith("image/") ? (
              <img
                src={toDisplayUrl(previewUpload.objectUrl)}
                alt={previewUpload.fileName}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                data-testid="img-photo-preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-foreground">{previewUpload.fileName}</p>
                <a
                  href={toDisplayUrl(previewUpload.objectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 underline"
                >
                  Open file
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <BarcodeScanner
        open={isScanEquipmentOpen}
        onOpenChange={setIsScanEquipmentOpen}
        onScan={handleEquipmentScan}
        title="Scan Equipment"
        description="Scan an equipment QR code"
      />
      <BarcodeScanner
        open={isScanPartOpen}
        onOpenChange={(v) => {
          setIsScanPartOpen(v);
          if (!v) setIsPartModalOpen(true);
        }}
        onScan={(value) => {
          handleScanPart(value);
          setIsPartModalOpen(true);
        }}
        title="Scan Part"
        description="Scan a barcode to find this part"
      />

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
