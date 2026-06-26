import {
  Phone,
  CircleDollarSign,
  Package,
  History,
  FileText,
  ChevronRight,
  Wrench,
  ExternalLink,
  Video,
  ImageIcon,
  LinkIcon,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toDisplayUrl } from "@/lib/imageUtils";
import { openResourceUrl, useImagePreview } from "@/components/ImagePreviewProvider";
import type { Task, PartUsed, Quote, Equipment } from "@shared/schema";
import { canSeeInventoryCost } from "@/lib/inventoryAccess";

const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC", electrical: "Electrical", plumbing: "Plumbing",
  mechanical: "Mechanical", appliances: "Appliances", grounds: "Grounds",
  janitorial: "Janitorial", structural: "Structural", water_treatment: "Water Treatment", general: "General",
};

const RESOURCE_TYPE_ICONS: Record<string, typeof FileText> = {
  video: Video, document: FileText, image: ImageIcon, link: LinkIcon,
};

interface TechnicianMoreTabProps {
  task: Task;
  equipment?: Equipment;
  equipmentResources: any[];
  contactName: string;
  contactPhone: string;
  contactInitials: string;
  existingQuote: Quote | null;
  parts: PartUsed[];
  previousWork: Task[];
  allTaskResources: any[];
  propertyResources: any[];
  isEquipmentLoading: boolean;
  setIsEstimateSheetOpen: (v: boolean) => void;
  setIsPartModalOpen: (v: boolean) => void;
  setIsPreviousWorkOpen: (v: boolean) => void;
  setIsResourcesOpen: (v: boolean) => void;
  handleViewTaskEquipment: (initialTab?: "info" | "history" | "resources") => void;
  userRole?: string;
}

export function TechnicianMoreTab({
  task,
  equipment,
  equipmentResources,
  propertyResources,
  contactName,
  contactPhone,
  contactInitials,
  existingQuote,
  parts,
  previousWork,
  allTaskResources,
  isEquipmentLoading,
  setIsEstimateSheetOpen,
  setIsPartModalOpen,
  setIsPreviousWorkOpen,
  setIsResourcesOpen,
  handleViewTaskEquipment,
  userRole,
}: TechnicianMoreTabProps) {
  const { openImagePreview } = useImagePreview();
  const showCost = canSeeInventoryCost(userRole);
  const generalResources = equipment ? propertyResources : allTaskResources;
  const generalResourceDocs = generalResources.filter((r: any) => r.type !== "video").length;
  const generalResourceVids = generalResources.filter((r: any) => r.type === "video").length;
  const equipmentDocCount = equipmentResources.filter((r: any) => r.type !== "video").length;
  const equipmentVidCount = equipmentResources.filter((r: any) => r.type === "video").length;
  const categoryLabel = equipment
    ? EQUIPMENT_CATEGORY_LABELS[equipment.category] || equipment.category
    : "";

  return (
    <>
      {equipment && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-equipment"
        >
          <button
            type="button"
            className="flex items-center gap-3 w-full text-left"
            onClick={() => handleViewTaskEquipment("info")}
            disabled={isEquipmentLoading}
            data-testid="action-equipment-details"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-primary/10 rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{equipment.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {categoryLabel}
                {equipment.serialNumber ? ` \u00B7 SN ${equipment.serialNumber}` : ""}
              </p>
            </div>
            {equipment.condition && (
              <Badge variant="outline" className="text-xs shrink-0 capitalize">
                {equipment.condition}
              </Badge>
            )}
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>

          {equipment.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{equipment.description}</p>
          )}

          {equipmentResources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p
                  className="text-xs uppercase font-medium text-muted-foreground"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Equipment Documents
                </p>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => handleViewTaskEquipment("resources")}
                  disabled={isEquipmentLoading}
                  data-testid="action-equipment-all-resources"
                >
                  View all
                </button>
              </div>
              <div className="space-y-1.5">
                {equipmentResources.map((resource: any) => {
                  const ResourceIcon = RESOURCE_TYPE_ICONS[resource.type] || FileText;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/70 hover-elevate text-left"
                      onClick={() => openResourceUrl(openImagePreview, resource.url, { title: resource.title, type: resource.type })}
                      data-testid={`equipment-resource-${resource.id}`}
                    >
                      <div className="p-1 rounded-md bg-muted shrink-0">
                        <ResourceIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{resource.title}</p>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
              {(equipmentDocCount > 0 || equipmentVidCount > 0) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {equipmentDocCount > 0 && `${equipmentDocCount} doc${equipmentDocCount !== 1 ? "s" : ""}`}
                  {equipmentDocCount > 0 && equipmentVidCount > 0 && " \u00B7 "}
                  {equipmentVidCount > 0 && `${equipmentVidCount} video${equipmentVidCount !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          )}

          {equipmentResources.length === 0 && (
            <button
              type="button"
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
              onClick={() => handleViewTaskEquipment("info")}
              disabled={isEquipmentLoading}
              data-testid="action-equipment-no-resources"
            >
              <Info className="w-3.5 h-3.5" />
              View equipment details and work history
            </button>
          )}
        </div>
      )}
      {(contactName || contactPhone) && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-contact"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0 text-white text-xs font-medium rounded-full bg-emerald-600"
              style={{ width: 34, height: 34 }}
            >
              {contactInitials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {contactName}
              </p>
              {contactPhone && (
                <p className="text-xs text-muted-foreground truncate">
                  Tap to call &middot; {contactPhone}
                </p>
              )}
            </div>
            {contactPhone && (
              <a
                href={`tel:${contactPhone}`}
                className="flex items-center justify-center shrink-0 rounded-full bg-primary/10"
                style={{ width: 30, height: 30 }}
                data-testid="button-call-contact"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
              </a>
            )}
          </div>
        </div>
      )}

      <div
        className="p-3 rounded-xl bg-background border border-border"
        data-testid="card-actions"
      >
        {task.requiresEstimate && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
            onClick={() => setIsEstimateSheetOpen(true)}
            data-testid="action-estimate"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/30 rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <CircleDollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Estimate / Quote
              </p>
              {existingQuote && (
                <p className="text-xs text-muted-foreground truncate">
                  {task.estimateStatus === "waiting_approval"
                    ? `Pending approval \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                    : task.estimateStatus === "approved"
                      ? `Approved \u00B7 $${(existingQuote.estimatedCost || 0).toFixed(2)}`
                      : `$${(existingQuote.estimatedCost || 0).toFixed(2)}`}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        <button
          className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
          onClick={() => setIsPartModalOpen(true)}
          data-testid="action-parts"
        >
          <div
            className="flex items-center justify-center shrink-0 bg-primary/10 rounded-lg"
            style={{ width: 32, height: 32 }}
          >
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Parts Used
            </p>
          </div>
          <span
            className={`text-xs shrink-0 ${parts.length > 0 ? "text-primary" : "text-muted-foreground"}`}
          >
            {parts.length > 0 ? `${parts.length} added` : "None"}
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
        </button>

        {previousWork.length > 0 && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left border-b border-border"
            onClick={() => setIsPreviousWorkOpen(true)}
            data-testid="action-previous-work"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-950/30 rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <History className="w-4 h-4 text-green-700 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Previous Work
              </p>
            </div>
            <span
              className="flex items-center justify-center text-xs font-medium shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {previousWork.length}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {((equipment && propertyResources.length > 0) || (!equipment && allTaskResources.length > 0)) && (
          <button
            className="flex items-center gap-3 w-full py-3 text-left"
            onClick={() => setIsResourcesOpen(true)}
            data-testid="action-resources"
          >
            <div
              className="flex items-center justify-center shrink-0 bg-muted rounded-lg"
              style={{ width: 32, height: 32 }}
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {equipment ? "Property Resources" : "Resources"}
              </p>
            </div>
            <span className="text-xs shrink-0 text-muted-foreground">
              {generalResourceDocs > 0 && `${generalResourceDocs} doc${generalResourceDocs !== 1 ? "s" : ""}`}
              {generalResourceDocs > 0 && generalResourceVids > 0 && " \u00B7 "}
              {generalResourceVids > 0 && `${generalResourceVids} vid`}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </div>

      {parts.length > 0 && (
        <div
          className="p-3 rounded-xl bg-background border border-border"
          data-testid="card-parts-list"
        >
          <p
            className="text-xs uppercase font-medium mb-2 text-muted-foreground"
            style={{ letterSpacing: "0.05em" }}
          >
            Parts Added
          </p>
          <div className="space-y-2">
            {parts.map((part) => (
              <div
                key={part.id}
                className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground break-words">
                    {part.partName}
                  </p>
                  {part.notes && (
                    <p className="text-xs text-muted-foreground break-words">
                      {part.notes}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-foreground">
                    Qty: {part.quantity}
                  </p>
                  {showCost && Number(part.cost) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${Number(part.cost).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
